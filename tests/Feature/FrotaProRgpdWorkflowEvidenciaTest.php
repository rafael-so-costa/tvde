<?php

declare(strict_types=1);

use App\Models\Motorista;
use App\Models\RgpdWorkflowEvidencia;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Services\RgpdAssinaturaConclusaoService;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdComprovativoPdfService;
use App\Services\RgpdConsentimentoService;
use App\Services\RgpdWorkflowEstadoService;
use App\Services\RgpdWorkflowEvidenciaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function rgpd104Cenario(): array
{
    Storage::fake('local');

    $tenant = Tenant::create([
        'nome' => 'RGPD Evidencias',
        'slug' =>
            'rgpd104-'.bin2hex(random_bytes(5)),
        'ativo' => true,
    ]);

    $role = Role::firstOrCreate(
        ['codigo' => 'admin_empresa'],
        [
            'nome' => 'Administrador empresa',
            'sistema' => true,
        ]
    );

    $users = [];

    foreach (
        [
            'validador',
            'revisor',
            'titular',
        ] as $tipo
    ) {
        $user = User::factory()->create([
            'ativo' => true,
        ]);

        TenantUser::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'status' => 'ativo',
            'principal' =>
                $tipo === 'validador',
        ]);

        if ($tipo !== 'titular') {
            UserRole::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role_id' => $role->id,
            ]);
        }

        $users[$tipo] = $user;
    }

    $motorista = new Motorista();

    $motorista->tenant_id =
        $tenant->id;

    $motorista->user_id =
        $users['titular']->id;

    $motorista->nome_completo =
        'Titular do RGPD';

    $motorista->save();

    $registo = app(
        RgpdConsentimentoService::class
    )->criarRascunho(
        $tenant->id,
        $users['validador']->id,
        'motorista',
        $motorista->id,
        'Titular do RGPD',
        [
            'imagem' => 'autorizo',
            'voz' => 'nao_autorizo',
            'localizacao' => 'nao_aplicavel',
            'dados_sensiveis' => 'nao_aplicavel',
        ]
    );

    return [
        $tenant,
        $users,
        $registo,
    ];
}

function rgpd104Login(
    $test,
    Tenant $tenant,
    User $user
): void {
    $test->withHeaders([
        'Origin' =>
            'http://localhost:8000',

        'Referer' =>
            'http://localhost:8000/',

        'Accept' =>
            'application/json',
    ]);

    Sanctum::actingAs($user);

    $test->withSession([
        'tenant_id' => $tenant->id,
    ]);
}

function rgpd104Assinar(
    Tenant $tenant,
    User $operador,
    $registo
): void {
    $assinatura = app(
        RgpdAssinaturaPreparacaoService::class
    )->preparar(
        $tenant->id,
        $operador->id,
        $registo->id,
        'presencial',
        'Titular do RGPD'
    );

    app(
        RgpdAssinaturaConclusaoService::class
    )->confirmarPresencial(
        $tenant->id,
        $operador->id,
        $assinatura->id,
        'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'.
        'AAAAC0lEQVR42mP8/x8AAusB9Y9Zkt4AAAAASUVORK5CYII=',
        true
    );
}

function rgpd104Estado(
    Tenant $tenant,
    $registo
): array {
    return app(
        RgpdWorkflowEstadoService::class
    )->consultar(
        $tenant->id,
        $registo->id
    );
}

function rgpd104Etapa(
    array $estado,
    string $codigo
): string {
    foreach (
        $estado['etapas']
        as $etapa
    ) {
        if ($etapa['codigo'] === $codigo) {
            return $etapa['estado'];
        }
    }

    return 'inexistente';
}

function rgpd104Validar(
    Tenant $tenant,
    User $validador,
    $registo
): RgpdWorkflowEvidencia {
    return app(
        RgpdWorkflowEvidenciaService::class
    )->validarInformacao(
        $tenant->id,
        $validador->id,
        $registo->id,
        'VALIDACAO-DOCUMENTAL-RGPD-001'
    );
}

function rgpd104Disponibilizar(
    Tenant $tenant,
    User $titular,
    $registo
): RgpdWorkflowEvidencia {
    return app(
        RgpdWorkflowEvidenciaService::class
    )->confirmarDisponibilizacao(
        $tenant->id,
        $titular->id,
        $registo->id,
        $registo->documento_sha256
    );
}

test(
    '4r104 workflow inicia com etapas humanas pendentes',
    function (): void {
        [
            $tenant,
            ,
            $registo
        ] = rgpd104Cenario();

        $estado = rgpd104Estado(
            $tenant,
            $registo
        );

        expect(
            $estado['resumo']['etapas_concluidas']
        )->toBe(3);

        foreach (
            [
                'validar_informacao',
                'comprovar_disponibilizacao',
                'conferencia_rgpd',
            ] as $etapa
        ) {
            expect(
                rgpd104Etapa($estado, $etapa)
            )->toBe('pendente');
        }
    }
);

test(
    '4r104 validador cria evidencia imutavel',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        $item = rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        expect(
            $item->integridadeValida()
        )->toBeTrue();

        expect(
            rgpd104Etapa(
                rgpd104Estado($tenant, $registo),
                'validar_informacao'
            )
        )->toBe('concluido');

        expect(
            fn () => $item->update([
                'referencia' => 'ALTERADO-ILEGALMENTE',
            ])
        )->toThrow(
            LogicException::class
        );
    }
);

test(
    '4r104 titular nao pode validar como operador',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenant,
            $users['titular']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            "/api/rgpd/{$registo->id}/workflow/validar",
            [
                'referencia' =>
                    'VALIDACAO-DOCUMENTAL-RGPD-001',

                'confirmacao' => true,
            ]
        )->assertForbidden();

        expect(
            RgpdWorkflowEvidencia::count()
        )->toBe(0);
    }
);

test(
    '4r104 titular consulta texto e confirma disponibilizacao',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        rgpd104Login(
            $this,
            $tenant,
            $users['titular']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/titular/{$registo->id}/documento"
        )
            ->assertOk()
            ->assertJsonPath(
                'data.documento_sha256',
                $registo->documento_sha256
            );

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/disponibilizacao/confirmar",
            [
                'documento_sha256' =>
                    $registo->documento_sha256,

                'confirmacao' => true,
            ]
        )
            ->assertOk()
            ->assertJsonPath(
                'data.codigo_etapa',
                'comprovar_disponibilizacao'
            );

        expect(
            rgpd104Etapa(
                rgpd104Estado($tenant, $registo),
                'comprovar_disponibilizacao'
            )
        )->toBe('concluido');
    }
);

test(
    '4r104 confirmacao exige documento apresentado na sessao',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        rgpd104Login(
            $this,
            $tenant,
            $users['titular']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/disponibilizacao/confirmar",
            [
                'documento_sha256' =>
                    $registo->documento_sha256,

                'confirmacao' => true,
            ]
        )->assertUnprocessable();

        expect(
            RgpdWorkflowEvidencia::query()
                ->where(
                    'codigo_etapa',
                    'comprovar_disponibilizacao'
                )
                ->count()
        )->toBe(0);
    }
);

test(
    '4r104 outro utilizador nao confirma pelo titular',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        rgpd104Login(
            $this,
            $tenant,
            $users['revisor']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/titular/{$registo->id}/documento"
        )->assertNotFound();
    }
);

test(
    '4r104 conferencia exige assinatura e PDF',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        rgpd104Disponibilizar(
            $tenant,
            $users['titular'],
            $registo
        );

        $service = app(
            RgpdWorkflowEvidenciaService::class
        );

        expect(
            fn () => $service->conferir(
                $tenant->id,
                $users['revisor']->id,
                $registo->id,
                'REVISAO-FINAL-RGPD-001'
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );

        rgpd104Assinar(
            $tenant,
            $users['validador'],
            $registo
        );

        expect(
            fn () => $service->conferir(
                $tenant->id,
                $users['revisor']->id,
                $registo->id,
                'REVISAO-FINAL-RGPD-001'
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );
    }
);

test(
    '4r104 conferencia exige segundo responsavel',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        rgpd104Disponibilizar(
            $tenant,
            $users['titular'],
            $registo
        );

        rgpd104Assinar(
            $tenant,
            $users['validador'],
            $registo
        );

        app(
            RgpdComprovativoPdfService::class
        )->emitir(
            $tenant->id,
            $registo->id
        );

        expect(
            fn () => app(
                RgpdWorkflowEvidenciaService::class
            )->conferir(
                $tenant->id,
                $users['validador']->id,
                $registo->id,
                'REVISAO-FINAL-RGPD-001'
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );
    }
);

test(
    '4r104 sete etapas concluidas apenas com provas reais',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        rgpd104Disponibilizar(
            $tenant,
            $users['titular'],
            $registo
        );

        rgpd104Assinar(
            $tenant,
            $users['validador'],
            $registo
        );

        app(
            RgpdComprovativoPdfService::class
        )->emitir(
            $tenant->id,
            $registo->id
        );

        $service = app(
            RgpdWorkflowEvidenciaService::class
        );

        $item = $service->conferir(
            $tenant->id,
            $users['revisor']->id,
            $registo->id,
            'REVISAO-FINAL-RGPD-001'
        );

        expect(
            $item->integridadeValida()
        )->toBeTrue();

        $estado = rgpd104Estado(
            $tenant,
            $registo
        );

        expect(
            $estado['resumo']['etapas_concluidas']
        )->toBe(7);

        expect(
            $estado['resumo']['conferencia_final_pendente']
        )->toBeFalse();

        expect(
            RgpdWorkflowEvidencia::count()
        )->toBe(3);

        $again = $service->conferir(
            $tenant->id,
            $users['revisor']->id,
            $registo->id,
            'REVISAO-FINAL-RGPD-001'
        );

        expect(
            $again->id
        )->toBe($item->id);

        expect(
            RgpdWorkflowEvidencia::count()
        )->toBe(3);
    }
);

test(
    '4r104 adulteracao da evidencia invalida a etapa',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        $item = rgpd104Validar(
            $tenant,
            $users['validador'],
            $registo
        );

        DB::table('rgpd_workflow_evidencias')
            ->where('id', $item->id)
            ->update([
                'referencia' =>
                    'ALTERACAO-DIRETA-NA-BASE-DE-TESTES',
            ]);

        $estado = rgpd104Estado(
            $tenant,
            $registo
        );

        expect(
            rgpd104Etapa(
                $estado,
                'validar_informacao'
            )
        )->toBe('pendente');

        expect(
            rgpd104Etapa(
                $estado,
                'conferencia_rgpd'
            )
        )->toBe('pendente');
    }
);

test(
    '4r104 API desligada e isolamento entre tenants',
    function (): void {
        [
            $tenantA,
            $usersA,
            $registoA
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenantA,
            $usersA['validador']
        );

        config([
            'rgpd.api_enabled' => false,
        ]);

        $this->postJson(
            "/api/rgpd/{$registoA->id}/workflow/validar",
            [
                'referencia' =>
                    'VALIDACAO-DOCUMENTAL-RGPD-001',

                'confirmacao' => true,
            ]
        )->assertNotFound();

        [
            $tenantB,
            $usersB
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenantB,
            $usersB['validador']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            "/api/rgpd/{$registoA->id}/workflow/validar",
            [
                'referencia' =>
                    'VALIDACAO-DOCUMENTAL-RGPD-001',

                'confirmacao' => true,
            ]
        )->assertNotFound();
    }
);

test(
    '4r105 administrador consulta capacidades do workflow',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenant,
            $users['validador']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/{$registo->id}/workflow/capacidades"
        )
            ->assertOk()
            ->assertJsonPath(
                'data.pode_gerir',
                true
            );

        expect(
            \App\Models\RgpdWorkflowEvidencia::count()
        )->toBe(0);
    }
);

test(
    '4r105 titular sem permissao nao consulta capacidades administrativas',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenant,
            $users['titular']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/{$registo->id}/workflow/capacidades"
        )->assertForbidden();
    }
);

test(
    '4r105 endpoint de capacidades obedece ao bloqueio da API',
    function (): void {
        [
            $tenant,
            $users,
            $registo
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenant,
            $users['validador']
        );

        config([
            'rgpd.api_enabled' => false,
        ]);

        $this->getJson(
            "/api/rgpd/{$registo->id}/workflow/capacidades"
        )->assertNotFound();
    }
);

test(
    '4r105 capacidades administrativas protegem outro tenant',
    function (): void {
        [
            ,
            ,
            $registoA
        ] = rgpd104Cenario();

        [
            $tenantB,
            $usersB
        ] = rgpd104Cenario();

        rgpd104Login(
            $this,
            $tenantB,
            $usersB['validador']
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/{$registoA->id}/workflow/capacidades"
        )->assertNotFound();
    }
);
