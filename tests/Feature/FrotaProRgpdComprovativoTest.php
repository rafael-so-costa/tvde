<?php

declare(strict_types=1);

use App\Models\Motorista;
use App\Models\RgpdComprovativo;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Services\FrotaProDocumentCatalog;
use App\Services\RgpdAssinaturaConclusaoService;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdComprovativoPdfService;
use App\Services\RgpdConsentimentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function rgpd102Cenario(
    bool $assinar = true
): array {
    Storage::fake('local');

    $tenant = Tenant::create([
        'nome' => 'RGPD PDF Teste',

        'slug' =>
            'rgpd-pdf-'.bin2hex(random_bytes(5)),

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

    $role = Role::firstOrCreate(
        [
            'codigo' => 'admin_empresa',
        ],
        [
            'nome' =>
                'Administrador da organização',

            'sistema' => true,
        ]
    );

    UserRole::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    $motorista = new Motorista();

    $motorista->tenant_id = $tenant->id;
    $motorista->user_id = $user->id;

    $motorista->nome_completo =
        'Titular PDF Exemplo';

    $motorista->save();

    $registo = app(
        RgpdConsentimentoService::class
    )->criarRascunho(
        $tenant->id,
        $user->id,
        'motorista',
        $motorista->id,
        'Titular PDF Exemplo',
        [
            'imagem' => 'autorizo',
            'voz' => 'nao_autorizo',
            'localizacao' => 'nao_aplicavel',
            'dados_sensiveis' => 'nao_aplicavel',
        ]
    );

    $assinatura = app(
        RgpdAssinaturaPreparacaoService::class
    )->preparar(
        $tenant->id,
        $user->id,
        $registo->id,
        'presencial',
        'Titular PDF Exemplo'
    );

    if ($assinar) {
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

    return [
        $tenant,
        $user,
        $registo,
        $assinatura,
    ];
}

function rgpd102Autenticar(
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

test(
    '4r102 rascunho guarda o texto exato do documento',
    function (): void {
        [, , $registo] =
            rgpd102Cenario(false);

        $texto = app(
            FrotaProDocumentCatalog::class
        )->content(
            'informacao_tratamento_dados_rgpd'
        );

        expect(
            $registo->fresh()
                ->documento_texto_snapshot
        )->toBe($texto);

        expect(
            hash('sha256', $texto)
        )->toBe(
            $registo->documento_sha256
        );
    }
);

test(
    '4r102 gera PDF privado idempotente sem reescrever original',
    function (): void {
        [
            $tenant,
            ,
            $registo
        ] = rgpd102Cenario();

        $service = app(
            RgpdComprovativoPdfService::class
        );

        $primeiro = $service->emitir(
            $tenant->id,
            $registo->id
        );

        $segundo = $service->emitir(
            $tenant->id,
            $registo->id
        );

        expect($primeiro->id)
            ->toBe($segundo->id);

        expect(
            RgpdComprovativo::count()
        )->toBe(1);

        Storage::disk('local')->assertExists(
            $primeiro->arquivo_path
        );

        [
            $documento,
            $bytes
        ] = $service->obter(
            $tenant->id,
            $registo->id
        );

        expect(
            str_starts_with(
                $bytes,
                '%PDF-'
            )
        )->toBeTrue();

        expect(
            hash('sha256', $bytes)
        )->toBe(
            $documento->arquivo_sha256
        );

        expect(
            $documento->documento_sha256
        )->toBe(
            $registo->documento_sha256
        );
    }
);

test(
    '4r102 rejeita documento sem assinatura concluida',
    function (): void {
        [
            $tenant,
            ,
            $registo
        ] = rgpd102Cenario(false);

        expect(
            fn () => app(
                RgpdComprovativoPdfService::class
            )->emitir(
                $tenant->id,
                $registo->id
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            RgpdComprovativo::count()
        )->toBe(0);
    }
);

test(
    '4r102 nao aceita imagem de assinatura adulterada',
    function (): void {
        [
            $tenant,
            ,
            $registo,
            $assinatura
        ] = rgpd102Cenario();

        Storage::disk('local')->put(
            $assinatura->fresh()->assinatura_path,
            'PNG adulterado'
        );

        expect(
            fn () => app(
                RgpdComprovativoPdfService::class
            )->emitir(
                $tenant->id,
                $registo->id
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            RgpdComprovativo::count()
        )->toBe(0);
    }
);

test(
    '4r102 API permanece desligada e exige autenticacao',
    function (): void {
        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            '/api/rgpd/'.
            '00000000-0000-4000-8000-000000000001'.
            '/comprovativo/emitir'
        )->assertUnauthorized();

        [
            $tenant,
            $user,
            $registo
        ] = rgpd102Cenario();

        rgpd102Autenticar(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => false,
        ]);

        $this->postJson(
            '/api/rgpd/'.
            $registo->id.
            '/comprovativo/emitir'
        )->assertNotFound();

        expect(
            RgpdComprovativo::count()
        )->toBe(0);
    }
);

test(
    '4r102 gestor emite e descarrega PDF privado',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd102Cenario();

        rgpd102Autenticar(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            '/api/rgpd/'.
            $registo->id.
            '/comprovativo/emitir'
        )
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'arquivo_sha256',
                ],
            ]);

        $this->get(
            '/api/rgpd/'.
            $registo->id.
            '/comprovativo'
        )
            ->assertOk()
            ->assertHeader(
                'Content-Type',
                'application/pdf'
            );
    }
);

test(
    '4r102 apenas titular vinculado pode descarregar via portal',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd102Cenario();

        app(
            RgpdComprovativoPdfService::class
        )->emitir(
            $tenant->id,
            $registo->id
        );

        rgpd102Autenticar(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->get(
            '/api/rgpd/titular/'.
            $registo->id.
            '/comprovativo'
        )
            ->assertOk()
            ->assertHeader(
                'Content-Type',
                'application/pdf'
            );

        $outro = User::factory()->create([
            'ativo' => true,
        ]);

        TenantUser::create([
            'tenant_id' => $tenant->id,
            'user_id' => $outro->id,
            'status' => 'ativo',
            'principal' => false,
        ]);

        rgpd102Autenticar(
            $this,
            $tenant,
            $outro
        );

        $this->getJson(
            '/api/rgpd/titular/'.
            $registo->id.
            '/comprovativo'
        )->assertNotFound();
    }
);

test(
    '4r102 isolamento entre tenants impede leitura de PDF',
    function (): void {
        [
            $tenantA,
            ,
            $registoA
        ] = rgpd102Cenario();

        app(
            RgpdComprovativoPdfService::class
        )->emitir(
            $tenantA->id,
            $registoA->id
        );

        [
            $tenantB,
            $userB
        ] = rgpd102Cenario();

        rgpd102Autenticar(
            $this,
            $tenantB,
            $userB
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            '/api/rgpd/'.
            $registoA->id.
            '/comprovativo'
        )->assertNotFound();

        $this->postJson(
            '/api/rgpd/'.
            $registoA->id.
            '/comprovativo/emitir'
        )->assertNotFound();
    }
);
