<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\RgpdAssinatura;
use App\Models\RgpdEvento;
use App\Models\RgpdRegisto;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function rgpd91Headers(): array
{
    return [
        'Origin' =>
            'http://localhost:8000',

        'Referer' =>
            'http://localhost:8000/',

        'Accept' =>
            'application/json',
    ];
}

function rgpd91Contexto(
    $test,
    string $nivel = 'configurar'
): array {
    $tenant = Tenant::create([
        'nome' =>
            'Tenant de Testes RGPD',

        'slug' =>
            'rgpd-api-'.
            bin2hex(random_bytes(5)),

        'ativo' =>
            true,
    ]);

    $user = User::factory()->create([
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' =>
            $tenant->id,

        'user_id' =>
            $user->id,

        'status' =>
            'ativo',

        'principal' =>
            true,
    ]);

    $role = Role::create([
        'codigo' =>
            'rgpd_test_'.
            bin2hex(random_bytes(5)),

        'nome' =>
            'RGPD Teste',

        'sistema' =>
            false,
    ]);

    UserRole::create([
        'user_id' =>
            $user->id,

        'role_id' =>
            $role->id,

        'tenant_id' =>
            $tenant->id,
    ]);

    $permission = Permission::firstOrCreate(
        [
            'codigo' =>
                'templates',
        ],
        [
            'modulo' =>
                'templates',

            'nome' =>
                'Templates',
        ]
    );

    RolePermission::create([
        'role_id' =>
            $role->id,

        'permission_id' =>
            $permission->id,

        'nivel' =>
            $nivel,
    ]);

    Sanctum::actingAs($user);

    $test->withSession([
        'tenant_id' => $tenant->id,
    ]);

    return [
        $tenant,
        $user,
    ];
}

function rgpd91Payload(): array
{
    return [
        'titular_tipo' =>
            'outro',

        'titular_nome' =>
            'Titular Exemplo',

        'escolhas' => [
            'imagem' =>
                'autorizo',

            'voz' =>
                'nao_autorizo',

            'localizacao' =>
                'nao_aplicavel',

            'dados_sensiveis' =>
                'nao_aplicavel',
        ],

        'finalidades_especificas' =>
            [],
    ];
}

test(
    '4r91 rotas RGPD exigem autenticacao',
    function (): void {
        config([
            'rgpd.api_enabled' => true,
        ]);

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson('/api/rgpd')
            ->assertUnauthorized();

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertUnauthorized();
    }
);

test(
    '4r91 API fica desativada por defeito',
    function (): void {
        rgpd91Contexto($this);

        config([
            'rgpd.api_enabled' => false,
        ]);

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson('/api/rgpd')
            ->assertNotFound();

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertNotFound();

        expect(
            RgpdRegisto::count()
        )->toBe(0);
    }
);

test(
    '4r91 cria rascunho e consulta historico no tenant',
    function (): void {
        rgpd91Contexto($this);

        config([
            'rgpd.api_enabled' => true,
        ]);

        $resposta = $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.estado',
                'rascunho'
            )
            ->assertJsonCount(
                4,
                'data.eventos'
            );

        $id = $resposta->json(
            'data.id'
        );

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson(
                '/api/rgpd'
            )
            ->assertOk()
            ->assertJsonPath(
                'pagination.total',
                1
            )
            ->assertJsonPath(
                'data.0.id',
                $id
            );

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson(
                "/api/rgpd/{$id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.registo.id',
                $id
            )
            ->assertJsonPath(
                'data.assinatura',
                null
            );

        expect(
            RgpdEvento::count()
        )->toBe(4);
    }
);

test(
    '4r91 prepara assinatura sem confirmar consentimento',
    function (): void {
        rgpd91Contexto($this);

        config([
            'rgpd.api_enabled' => true,
        ]);

        $id = $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertCreated()
            ->json('data.id');

        $response = $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                "/api/rgpd/{$id}/assinatura/preparar",
                [
                    'modo' =>
                        'remota',

                    'signatario_nome' =>
                        'Titular Exemplo',

                    'signatario_email' =>
                        'titular@example.test',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'pendente'
            )
            ->assertJsonPath(
                'data.modo',
                'remota'
            );

        $assinaturaId = $response->json(
            'data.id'
        );

        expect(
            RgpdAssinatura::query()
                ->whereKey(
                    $assinaturaId
                )
                ->exists()
        )->toBeTrue();

        expect(
            RgpdRegisto::findOrFail(
                $id
            )->estado
        )->toBe('rascunho');

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson(
                "/api/rgpd/{$id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.assinatura.id',
                $assinaturaId
            )
            ->assertJsonPath(
                'data.assinatura.status',
                'pendente'
            )
            ->assertDontSee(
                'otp_hash'
            )
            ->assertDontSee(
                'token_hash'
            );
    }
);

test(
    '4r91 retira uma escolha preservando historico',
    function (): void {
        rgpd91Contexto($this);

        config([
            'rgpd.api_enabled' => true,
        ]);

        $id = $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertCreated()
            ->json('data.id');

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                "/api/rgpd/{$id}/escolhas/imagem/revogar"
            )
            ->assertOk()
            ->assertJsonCount(
                5,
                'data.eventos'
            );

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $id
                )
                ->where(
                    'tipo',
                    'revogacao'
                )
                ->count()
        )->toBe(1);

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                "/api/rgpd/{$id}/escolhas/imagem/revogar"
            )
            ->assertUnprocessable();
    }
);

test(
    '4r91 rejeita escolhas obrigatorias em falta',
    function (): void {
        rgpd91Contexto($this);

        config([
            'rgpd.api_enabled' => true,
        ]);

        $payload = rgpd91Payload();

        unset(
            $payload['escolhas']['voz']
        );

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                $payload
            )
            ->assertUnprocessable();

        expect(
            RgpdRegisto::count()
        )->toBe(0);
    }
);

test(
    '4r91 utilizador so com leitura nao pode criar RGPD',
    function (): void {
        rgpd91Contexto(
            $this,
            'visualizar'
        );

        config([
            'rgpd.api_enabled' => true,
        ]);

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson(
                '/api/rgpd'
            )
            ->assertOk();

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertForbidden();

        expect(
            RgpdRegisto::count()
        )->toBe(0);
    }
);

test(
    '4r91 impede acesso a registo de outro tenant',
    function (): void {
        rgpd91Contexto($this);

        config([
            'rgpd.api_enabled' => true,
        ]);

        $id = $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                '/api/rgpd/rascunhos',
                rgpd91Payload()
            )
            ->assertCreated()
            ->json('data.id');

        rgpd91Contexto($this);

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->getJson(
                "/api/rgpd/{$id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                "/api/rgpd/{$id}/assinatura/preparar",
                [
                    'modo' =>
                        'presencial',

                    'signatario_nome' =>
                        'Titular Exemplo',
                ]
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                rgpd91Headers()
            )
            ->postJson(
                "/api/rgpd/{$id}/escolhas/imagem/revogar"
            )
            ->assertNotFound();

        expect(
            RgpdAssinatura::count()
        )->toBe(0);
    }
);
