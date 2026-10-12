<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserFavorite;
use App\Models\UserPermission;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function productivityHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function productivityTenant(
    string $name,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $name,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function productivityUser(
    Tenant $tenant,
    string $email,
    string $roleCode = 'funcionario'
): User {
    $user =
        User::factory()
            ->create([
                'email' => $email,
                'ativo' => true,
            ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role =
        Role::firstOrCreate(
            [
                'codigo' => $roleCode,
            ],
            [
                'nome' => $roleCode ===
                    'admin_empresa'
                        ? 'Administrador'
                        : 'Funcionário',

                'sistema' => true,
            ]
        );

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    return $user;
}

function productivityGrant(
    User $user,
    Tenant $tenant,
    string $code,
    string $level = 'visualizar'
): void {
    $permission =
        Permission::firstOrCreate(
            [
                'codigo' => $code,
            ],
            [
                'modulo' => $code,
                'nome' => ucfirst(
                    str_replace(
                        '_',
                        ' ',
                        $code
                    )
                ),
            ]
        );

    UserPermission::updateOrCreate(
        [
            'user_id' => $user->id,
            'permission_id' => $permission->id,
            'tenant_id' => $tenant->id,
        ],
        [
            'nivel' => $level,
        ]
    );
}

function productivityActAs(
    $test,
    User $user,
    Tenant $tenant
): void {
    Sanctum::actingAs(
        $user,
        ['*']
    );

    $test
        ->withHeaders(
            productivityHeaders()
        )
        ->withSession([
            'tenant_id' => $tenant->id,
        ]);
}

function productivityMotorista(
    Tenant $tenant,
    string $name,
    string $email
): Motorista {
    $motorista =
        new Motorista([
            'nome_completo' => $name,
            'email' => $email,
        ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->save();

    return $motorista;
}

function productivityVeiculo(
    Tenant $tenant,
    string $matricula
): Veiculo {
    $veiculo =
        new Veiculo([
            'matricula' => $matricula,
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

    $veiculo->tenant_id =
        $tenant->id;

    $veiculo->save();

    return $veiculo;
}

test(
    'produtividade exige autenticacao',
    function () {
        $this
            ->withHeaders(
                productivityHeaders()
            )
            ->getJson(
                '/api/produtividade/busca?q=teste'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders(
                productivityHeaders()
            )
            ->getJson(
                '/api/produtividade/favoritos'
            )
            ->assertUnauthorized();
    }
);

test(
    'busca global respeita tenant',
    function () {
        $tenantA =
            productivityTenant(
                'Tenant A',
                'productivity-a'
            );

        $tenantB =
            productivityTenant(
                'Tenant B',
                'productivity-b'
            );

        $user =
            productivityUser(
                $tenantA,
                'admin.productivity@test.local',
                'admin_empresa'
            );

        $own =
            productivityMotorista(
                $tenantA,
                'Rafael Pesquisa',
                'rafael.a@test.local'
            );

        productivityMotorista(
            $tenantB,
            'Rafael Pesquisa',
            'rafael.b@test.local'
        );

        productivityActAs(
            $this,
            $user,
            $tenantA
        );

        $response =
            $this
                ->getJson(
                    '/api/produtividade/busca?q=Rafael'
                )
                ->assertOk();

        expect(
            collect(
                $response->json(
                    'data'
                )
            )
                ->where(
                    'entity_type',
                    'motorista'
                )
                ->pluck(
                    'entity_id'
                )
                ->all()
        )->toBe([
            $own->id,
        ]);
    }
);

test(
    'busca global respeita permissoes do utilizador',
    function () {
        $tenant =
            productivityTenant(
                'Tenant Permissões',
                'productivity-permissions'
            );

        $user =
            productivityUser(
                $tenant,
                'employee.productivity@test.local'
            );

        productivityGrant(
            $user,
            $tenant,
            'motoristas'
        );

        $driver =
            productivityMotorista(
                $tenant,
                'Alpha Motorista',
                'alpha.motorista@test.local'
            );

        productivityVeiculo(
            $tenant,
            'AL-PH-01'
        );

        productivityActAs(
            $this,
            $user,
            $tenant
        );

        $response =
            $this
                ->getJson(
                    '/api/produtividade/busca?q=Alpha'
                )
                ->assertOk();

        $types =
            collect(
                $response->json(
                    'data'
                )
            )
                ->pluck(
                    'entity_type'
                )
                ->all();

        expect($types)
            ->toContain(
                'motorista'
            )
            ->not
            ->toContain(
                'veiculo'
            );

        expect(
            collect(
                $response->json(
                    'data'
                )
            )
                ->firstWhere(
                    'entity_type',
                    'motorista'
                )[
                    'entity_id'
                ]
        )->toBe(
            $driver->id
        );
    }
);

test(
    'favorito e pessoal e idempotente',
    function () {
        $tenant =
            productivityTenant(
                'Tenant Favoritos',
                'productivity-favorites'
            );

        $userA =
            productivityUser(
                $tenant,
                'favorite.a@test.local',
                'admin_empresa'
            );

        $userB =
            productivityUser(
                $tenant,
                'favorite.b@test.local',
                'admin_empresa'
            );

        $driver =
            productivityMotorista(
                $tenant,
                'Motorista Favorito',
                'favorito@test.local'
            );

        productivityActAs(
            $this,
            $userA,
            $tenant
        );

        $first =
            $this
                ->postJson(
                    '/api/produtividade/favoritos',
                    [
                        'entity_type' => 'motorista',
                        'entity_id' => $driver->id,
                    ]
                )
                ->assertCreated();

        $favoriteId =
            $first->json(
                'data.favorite_id'
            );

        $this
            ->postJson(
                '/api/produtividade/favoritos',
                [
                    'entity_type' => 'motorista',
                    'entity_id' => $driver->id,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.favorite_id',
                $favoriteId
            );

        expect(
            UserFavorite::query()
                ->where(
                    'user_id',
                    $userA->id
                )
                ->count()
        )->toBe(1);

        $this
            ->getJson(
                '/api/produtividade/favoritos'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.0.entity_id',
                $driver->id
            );

        productivityActAs(
            $this,
            $userB,
            $tenant
        );

        $this
            ->getJson(
                '/api/produtividade/favoritos'
            )
            ->assertOk()
            ->assertJsonCount(
                0,
                'data'
            );
    }
);

test(
    'nao e possivel favoritar recurso de outro tenant',
    function () {
        $tenantA =
            productivityTenant(
                'Tenant Favorito A',
                'productivity-favorite-a'
            );

        $tenantB =
            productivityTenant(
                'Tenant Favorito B',
                'productivity-favorite-b'
            );

        $user =
            productivityUser(
                $tenantA,
                'favorite.cross@test.local',
                'admin_empresa'
            );

        $driver =
            productivityMotorista(
                $tenantB,
                'Motorista Outro Tenant',
                'other.tenant@test.local'
            );

        productivityActAs(
            $this,
            $user,
            $tenantA
        );

        $this
            ->postJson(
                '/api/produtividade/favoritos',
                [
                    'entity_type' => 'motorista',
                    'entity_id' => $driver->id,
                ]
            )
            ->assertNotFound();

        expect(
            UserFavorite::query()
                ->count()
        )->toBe(0);
    }
);

test(
    'favorito so pode ser removido pelo proprio utilizador',
    function () {
        $tenant =
            productivityTenant(
                'Tenant Remover',
                'productivity-remove'
            );

        $userA =
            productivityUser(
                $tenant,
                'remove.a@test.local',
                'admin_empresa'
            );

        $userB =
            productivityUser(
                $tenant,
                'remove.b@test.local',
                'admin_empresa'
            );

        $driver =
            productivityMotorista(
                $tenant,
                'Motorista Remove',
                'remove@test.local'
            );

        $favorite =
            new UserFavorite([
                'entity_type' => 'motorista',
                'entity_id' => $driver->id,
            ]);

        $favorite->tenant_id =
            $tenant->id;

        $favorite->user_id =
            $userA->id;

        $favorite->save();

        productivityActAs(
            $this,
            $userB,
            $tenant
        );

        $this
            ->deleteJson(
                "/api/produtividade/favoritos/{$favorite->id}"
            )
            ->assertNotFound();

        $this->assertDatabaseHas(
            'user_favorites',
            [
                'id' => $favorite->id,
            ]
        );

        productivityActAs(
            $this,
            $userA,
            $tenant
        );

        $this
            ->deleteJson(
                "/api/produtividade/favoritos/{$favorite->id}"
            )
            ->assertNoContent();

        $this->assertDatabaseMissing(
            'user_favorites',
            [
                'id' => $favorite->id,
            ]
        );
    }
);
