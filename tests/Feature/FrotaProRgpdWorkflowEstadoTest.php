<?php

declare(strict_types=1);

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Services\RgpdAssinaturaConclusaoService;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdComprovativoPdfService;
use App\Services\RgpdConsentimentoService;
use App\Services\RgpdRevogacaoService;
use App\Services\RgpdWorkflowEstadoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function rgpd103Cenario(
    string $nivel = 'visualizar'
): array {
    Storage::fake('local');

    $tenant = Tenant::create([
        'nome' => 'RGPD Workflow Teste',
        'slug' =>
            'rgpd-workflow-'.
            bin2hex(random_bytes(5)),
        'ativo' => true,
    ]);

    $user = User::factory()->create([
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = Role::create([
        'codigo' =>
            'rgpd_workflow_'.
            bin2hex(random_bytes(5)),
        'nome' => 'Workflow RGPD Teste',
        'sistema' => false,
    ]);

    UserRole::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    if ($nivel !== 'nenhum') {
        $permission = Permission::firstOrCreate(
            [
                'codigo' => 'templates',
            ],
            [
                'modulo' => 'templates',
                'nome' => 'Templates',
            ]
        );

        RolePermission::create([
            'role_id' => $role->id,
            'permission_id' => $permission->id,
            'nivel' => $nivel,
        ]);
    }

    $motorista = new Motorista();

    $motorista->tenant_id = $tenant->id;
    $motorista->user_id = $user->id;
    $motorista->nome_completo =
        'Titular Workflow';

    $motorista->save();

    $registo = app(
        RgpdConsentimentoService::class
    )->criarRascunho(
        $tenant->id,
        $user->id,
        'motorista',
        $motorista->id,
        'Titular Workflow',
        [
            'imagem' => 'autorizo',
            'voz' => 'nao_autorizo',
            'localizacao' => 'nao_aplicavel',
            'dados_sensiveis' => 'nao_aplicavel',
        ]
    );

    return [
        $tenant,
        $user,
        $registo,
    ];
}

function rgpd103Assinar(
    Tenant $tenant,
    User $user,
    $registo
): void {
    $assinatura = app(
        RgpdAssinaturaPreparacaoService::class
    )->preparar(
        $tenant->id,
        $user->id,
        $registo->id,
        'presencial',
        'Titular Workflow'
    );

    app(
        RgpdAssinaturaConclusaoService::class
    )->confirmarPresencial(
        $tenant->id,
        $user->id,
        $assinatura->id,
        'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'.
        'AAAAC0lEQVR42mP8/x8AAusB9Y9Zkt4AAAAASUVORK5CYII=',
        true
    );
}

function rgpd103Login(
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

function rgpd103Etapa(
    array $resultado,
    string $codigo
): array {
    foreach (
        $resultado['etapas']
        as $etapa
    ) {
        if (
            $etapa['codigo'] === $codigo
        ) {
            return $etapa;
        }
    }

    throw new RuntimeException(
        'Etapa não encontrada: '.$codigo
    );
}

test(
    '4r103 apresenta exatamente sete etapas e nao inventa provas',
    function (): void {
        [
            $tenant,
            ,
            $registo
        ] = rgpd103Cenario();

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            count($resultado['etapas'])
        )->toBe(7);

        expect(
            $resultado['publicavel']
        )->toBeFalse();

        expect(
            $resultado['resumo']['etapas_concluidas']
        )->toBe(3);

        foreach (
            [
                'validar_informacao',
                'comprovar_disponibilizacao',
                'comprovar_assinatura_titular',
                'conferencia_rgpd',
            ] as $code
        ) {
            expect(
                rgpd103Etapa(
                    $resultado,
                    $code
                )['estado']
            )->toBe('pendente');
        }
    }
);

test(
    '4r103 assinatura valida atualiza etapa sem validar tarefas humanas',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Assinar(
            $tenant,
            $user,
            $registo
        );

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            $resultado['resumo']['assinatura_integra']
        )->toBeTrue();

        expect(
            $resultado['resumo']['comprovativo_pdf_integro']
        )->toBeFalse();

        expect(
            rgpd103Etapa(
                $resultado,
                'comprovar_assinatura_titular'
            )['estado']
        )->toBe('concluido');

        expect(
            rgpd103Etapa(
                $resultado,
                'conferencia_rgpd'
            )['estado']
        )->toBe('pendente');
    }
);

test(
    '4r103 verifica PDF sem concluir conferencia',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Assinar(
            $tenant,
            $user,
            $registo
        );

        app(
            RgpdComprovativoPdfService::class
        )->emitir(
            $tenant->id,
            $registo->id
        );

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            $resultado['resumo']['comprovativo_pdf_integro']
        )->toBeTrue();

        expect(
            rgpd103Etapa(
                $resultado,
                'comprovar_disponibilizacao'
            )['estado']
        )->toBe('pendente');

        expect(
            rgpd103Etapa(
                $resultado,
                'conferencia_rgpd'
            )['estado']
        )->toBe('pendente');
    }
);

test(
    '4r103 deteta snapshot adulterado',
    function (): void {
        [
            $tenant,
            ,
            $registo
        ] = rgpd103Cenario();

        DB::table('rgpd_registos')
            ->where('id', $registo->id)
            ->update([
                'documento_texto_snapshot' =>
                    'conteudo adulterado no teste SQLite',
            ]);

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            $resultado['resumo']['snapshot_integro']
        )->toBeFalse();

        expect(
            rgpd103Etapa(
                $resultado,
                'gerar_documento_rgpd'
            )['estado']
        )->toBe('pendente');
    }
);

test(
    '4r103 deteta assinatura adulterada',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Assinar(
            $tenant,
            $user,
            $registo
        );

        $path = \App\Models\RgpdAssinatura::query()
            ->where(
                'rgpd_registo_id',
                $registo->id
            )
            ->value(
                'assinatura_path'
            );

        Storage::disk('local')->put(
            $path,
            'PNG adulterado'
        );

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            $resultado['resumo']['assinatura_integra']
        )->toBeFalse();

        expect(
            rgpd103Etapa(
                $resultado,
                'comprovar_assinatura_titular'
            )['estado']
        )->toBe('pendente');
    }
);

test(
    '4r103 deteta PDF adulterado sem apagar assinatura',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Assinar(
            $tenant,
            $user,
            $registo
        );

        $pdf = app(
            RgpdComprovativoPdfService::class
        )->emitir(
            $tenant->id,
            $registo->id
        );

        Storage::disk('local')->put(
            $pdf->arquivo_path,
            '%PDF-falso'
        );

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            $resultado['resumo']['assinatura_integra']
        )->toBeTrue();

        expect(
            $resultado['resumo']['comprovativo_pdf_integro']
        )->toBeFalse();
    }
);

test(
    '4r103 revogacao nao apaga assinatura historica',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Assinar(
            $tenant,
            $user,
            $registo
        );

        app(
            RgpdRevogacaoService::class
        )->retirar(
            $tenant->id,
            $user->id,
            $registo->id,
            'imagem'
        );

        $resultado = app(
            RgpdWorkflowEstadoService::class
        )->consultar(
            $tenant->id,
            $registo->id
        );

        expect(
            $resultado['resumo']['revogacoes_registadas']
        )->toBe(1);

        expect(
            $resultado['resumo']['assinatura_integra']
        )->toBeTrue();
    }
);

test(
    '4r103 exige login e respeita flag desativada',
    function (): void {
        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            '/api/rgpd/'.
            '00000000-0000-4000-8000-000000000001'.
            '/workflow'
        )->assertUnauthorized();

        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => false,
        ]);

        $this->getJson(
            "/api/rgpd/{$registo->id}/workflow"
        )->assertNotFound();
    }
);

test(
    '4r103 leitura autorizada recebe sete etapas',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario();

        rgpd103Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/{$registo->id}/workflow"
        )
            ->assertOk()
            ->assertJsonCount(
                7,
                'data.etapas'
            )
            ->assertJsonPath(
                'data.resumo.etapas_total',
                7
            )
            ->assertJsonPath(
                'data.resumo.conferencia_final_pendente',
                true
            );
    }
);

test(
    '4r103 sem permissao nao consulta workflow',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd103Cenario(
            'nenhum'
        );

        rgpd103Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/{$registo->id}/workflow"
        )->assertForbidden();
    }
);

test(
    '4r103 bloqueia registo de outro tenant',
    function (): void {
        [
            ,
            ,
            $registoA
        ] = rgpd103Cenario();

        [
            $tenantB,
            $userB
        ] = rgpd103Cenario();

        rgpd103Login(
            $this,
            $tenantB,
            $userB
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/{$registoA->id}/workflow"
        )->assertNotFound();
    }
);
