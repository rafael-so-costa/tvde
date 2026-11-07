<?php

declare(strict_types=1);

use App\Models\Motorista;
use App\Models\RgpdAssinatura;
use App\Models\RgpdEvento;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\RgpdAssinaturaConclusaoService;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdConsentimentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function rgpd101Png(): string
{
    return
        'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'.
        'AAAAC0lEQVR42mP8/x8AAusB9Y9Zkt4AAAAASUVORK5CYII=';
}

function rgpd101Cenario(
    bool $assinar = true
): array {
    Storage::fake('local');

    $tenant = Tenant::create([
        'nome' => 'RGPD Revogacao Teste',
        'slug' =>
            'rgpd-rev-'.bin2hex(random_bytes(5)),
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

    $motorista = new Motorista();

    $motorista->tenant_id = $tenant->id;
    $motorista->user_id = $user->id;
    $motorista->nome_completo =
        'Titular Exemplo';

    $motorista->save();

    $registo = app(
        RgpdConsentimentoService::class
    )->criarRascunho(
        $tenant->id,
        $user->id,
        'motorista',
        $motorista->id,
        'Titular Exemplo',
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
        'Titular Exemplo'
    );

    if ($assinar) {
        app(
            RgpdAssinaturaConclusaoService::class
        )->confirmarPresencial(
            $tenant->id,
            $user->id,
            $assinatura->id,
            rgpd101Png(),
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

function rgpd101Login(
    $test,
    Tenant $tenant,
    User $user
): void {
    /*
     * FROTAPRO_4R1011_STATEFUL_TEST_FIX
     *
     * Reproduz a origem HTTP utilizada
     * pelos testes RGPD 4R.9.1.
     *
     * O middleware continua a exigir:
     * - autenticacao Sanctum;
     * - sessao valida;
     * - tenant autorizado;
     * - identidade do proprio titular.
     */
    $test->withHeaders([
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ]);

    Sanctum::actingAs($user);

    $test->withSession([
        'tenant_id' => $tenant->id,
    ]);
}

test(
    '4r101 apenas utilizadores autenticados consultam consentimentos',
    function (): void {
        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            '/api/rgpd/titular/'.
            '00000000-0000-4000-8000-000000000001'.
            '/consentimentos'
        )->assertUnauthorized();
    }
);

test(
    '4r101 API permanece desativada por defeito',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => false,
        ]);

        $this->getJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos"
        )->assertNotFound();
    }
);

test(
    '4r101 titular consulta estado efetivo apos assinatura',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos"
        )
            ->assertOk()
            ->assertJsonPath(
                'data.finalidades.imagem.estado',
                'autorizado'
            )
            ->assertJsonPath(
                'data.finalidades.imagem.autorizado',
                true
            )
            ->assertJsonPath(
                'data.finalidades.voz.estado',
                'nao_autorizado'
            )
            ->assertJsonPath(
                'data.finalidades.localizacao.estado',
                'nao_aplicavel'
            );
    }
);

test(
    '4r101 retirada preserva assinatura e decisao original',
    function (): void {
        [
            $tenant,
            $user,
            $registo,
            $assinatura
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $assinaturaAnterior =
            $assinatura->fresh();

        $hashAnterior =
            $assinaturaAnterior->assinatura_sha256;

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos/imagem/retirar",
            [
                'confirmacao' => true,
            ]
        )
            ->assertOk()
            ->assertJsonPath(
                'data.finalidades.imagem.estado',
                'revogado'
            )
            ->assertJsonPath(
                'data.finalidades.imagem.autorizado',
                false
            );

        expect(
            $registo->fresh()->estado
        )->toBe('assinado');

        expect(
            $assinatura->fresh()->status
        )->toBe('assinado');

        expect(
            $assinatura->fresh()->assinatura_sha256
        )->toBe($hashAnterior);

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $registo->id
                )
                ->where(
                    'finalidade',
                    'imagem'
                )
                ->where(
                    'tipo',
                    'decisao'
                )
                ->value('escolha')
        )->toBe('autorizo');

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $registo->id
                )
                ->where(
                    'finalidade',
                    'imagem'
                )
                ->where(
                    'tipo',
                    'revogacao'
                )
                ->count()
        )->toBe(1);
    }
);

test(
    '4r101 retirada repetida nao duplica eventos',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $url =
            "/api/rgpd/titular/{$registo->id}".
            "/consentimentos/imagem/retirar";

        $this->postJson(
            $url,
            ['confirmacao' => true]
        )->assertOk();

        $this->postJson(
            $url,
            ['confirmacao' => true]
        )->assertUnprocessable();

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $registo->id
                )
                ->where(
                    'tipo',
                    'revogacao'
                )
                ->count()
        )->toBe(1);
    }
);

test(
    '4r101 nao permite retirar escolha recusada',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos/voz/retirar",
            ['confirmacao' => true]
        )->assertUnprocessable();

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $registo->id
                )
                ->where(
                    'tipo',
                    'revogacao'
                )
                ->count()
        )->toBe(0);
    }
);

test(
    '4r101 gestor ou outro utilizador nao representa o titular',
    function (): void {
        [
            $tenant,
            $titular,
            $registo
        ] = rgpd101Cenario();

        $outro = User::factory()->create([
            'ativo' => true,
        ]);

        TenantUser::create([
            'tenant_id' => $tenant->id,
            'user_id' => $outro->id,
            'status' => 'ativo',
            'principal' => false,
        ]);

        rgpd101Login(
            $this,
            $tenant,
            $outro
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos"
        )->assertNotFound();

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos/imagem/retirar",
            ['confirmacao' => true]
        )->assertNotFound();
    }
);

test(
    '4r101 protege registos de outro tenant',
    function (): void {
        [
            $tenantA,
            $userA,
            $registoA
        ] = rgpd101Cenario();

        [
            $tenantB,
            $userB
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenantB,
            $userB
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->getJson(
            "/api/rgpd/titular/{$registoA->id}/consentimentos"
        )->assertNotFound();

        $this->postJson(
            "/api/rgpd/titular/{$registoA->id}/consentimentos/imagem/retirar",
            ['confirmacao' => true]
        )->assertNotFound();
    }
);

test(
    '4r101 registo sem assinatura nao permite revogacao assinada',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd101Cenario(
            false
        );

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos/imagem/retirar",
            ['confirmacao' => true]
        )->assertUnprocessable();
    }
);

test(
    '4r101 exige confirmacao expressa',
    function (): void {
        [
            $tenant,
            $user,
            $registo
        ] = rgpd101Cenario();

        rgpd101Login(
            $this,
            $tenant,
            $user
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this->postJson(
            "/api/rgpd/titular/{$registo->id}/consentimentos/imagem/retirar",
            ['confirmacao' => false]
        )->assertUnprocessable();

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $registo->id
                )
                ->where(
                    'tipo',
                    'revogacao'
                )
                ->count()
        )->toBe(0);
    }
);
