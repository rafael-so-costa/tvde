<?php

use App\Models\Empresa;
use App\Models\Profile;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );
});

function saasRegistrationTestPayload(
    array $overrides = []
): array {
    return array_merge([
        'name' => 'Rafael Gestor',
        'email' => 'gestor@frotateste.pt',
        'phone' => '+351 910 000 000',
        'password' => 'SenhaTeste123',
        'password_confirmation' => 'SenhaTeste123',
        'company_name' => 'Frota Teste Lda',
        'company_nif' => '500123456',
        'company_email' => 'geral@frotateste.pt',
        'company_phone' => '+351 210 000 000',
    ], $overrides);
}

test(
    'cadastro saas cria ambiente completo e inicia sessão',
    function () {
        $response = $this->post(
            '/registar',
            saasRegistrationTestPayload()
        );

        $response
            ->assertRedirect(
                '/onboarding'
            );

        $user = User::query()
            ->where(
                'email',
                'gestor@frotateste.pt'
            )
            ->firstOrFail();

        $tenant = Tenant::query()
            ->where(
                'nif',
                '500123456'
            )
            ->firstOrFail();

        $empresa = Empresa::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->firstOrFail();

        $role = Role::query()
            ->where(
                'codigo',
                'admin_empresa'
            )
            ->firstOrFail();

        $this->assertAuthenticatedAs(
            $user
        );

        $response->assertSessionHas(
            'tenant_id',
            $tenant->id
        );

        $this->assertDatabaseHas(
            'profiles',
            [
                'user_id' => $user->id,
                'telefone' => '+351 910 000 000',
            ]
        );

        $this->assertDatabaseHas(
            'tenant_users',
            [
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'status' => 'ativo',
                'principal' => true,
            ]
        );

        $this->assertDatabaseHas(
            'user_roles',
            [
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role_id' => $role->id,
            ]
        );

        expect(
            $tenant->nome
        )->toBe(
            'Frota Teste Lda'
        );

        expect(
            $tenant->slug
        )->toBe(
            'frota-teste-lda'
        );

        expect(
            $empresa->nome_empresa
        )->toBe(
            'Frota Teste Lda'
        );

        expect(
            $empresa->status_cadastro
        )->toBe(
            'pendente'
        );

        expect(
            $user->last_login_at
        )->not->toBeNull();

        expect(
            data_get(
                $tenant->settings,
                'onboarding.required'
            )
        )->toBeTrue();

        expect(
            data_get(
                $tenant->settings,
                'onboarding.completed_at'
            )
        )->toBeNull();
    }
);

test(
    'email duplicado não cria novo ambiente',
    function () {
        User::factory()
            ->create([
                'email' => 'gestor@frotateste.pt',
            ]);

        $this->post(
            '/registar',
            saasRegistrationTestPayload()
        )
            ->assertSessionHasErrors(
                'email'
            );

        expect(
            Tenant::query()
                ->count()
        )->toBe(0);

        expect(
            Empresa::query()
                ->count()
        )->toBe(0);
    }
);

test(
    'nif de empresa já registado não cria novo ambiente',
    function () {
        Tenant::create([
            'nome' => 'Empresa Existente',

            'slug' => 'empresa-existente',

            'nif' => '500123456',

            'ativo' => true,
        ]);

        $this->post(
            '/registar',
            saasRegistrationTestPayload([
                'email' => 'novo@frotateste.pt',
            ])
        )
            ->assertSessionHasErrors(
                'company_nif'
            );

        expect(
            User::query()
                ->where(
                    'email',
                    'novo@frotateste.pt'
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'dados inválidos não criam registos parciais',
    function () {
        $this->post(
            '/registar',
            saasRegistrationTestPayload([
                'email' => 'email-invalido',

                'company_nif' => '123',

                'password' => 'abc',

                'password_confirmation' => 'xyz',
            ])
        )
            ->assertSessionHasErrors([
                'email',
                'company_nif',
                'password',
            ]);

        expect(
            User::query()
                ->count()
        )->toBe(0);

        expect(
            Tenant::query()
                ->count()
        )->toBe(0);

        expect(
            Empresa::query()
                ->count()
        )->toBe(0);

        expect(
            Profile::query()
                ->count()
        )->toBe(0);
    }
);

test(
    'empresas com mesmo nome recebem slugs distintos',
    function () {
        $this->post(
            '/registar',
            saasRegistrationTestPayload()
        )
            ->assertRedirect(
                '/onboarding'
            );

        auth()->logout();

        $this->post(
            '/registar',
            saasRegistrationTestPayload([
                'email' => 'segundo@frotateste.pt',

                'company_nif' => '500123457',

                'company_email' => 'segunda@frotateste.pt',
            ])
        )
            ->assertRedirect(
                '/onboarding'
            );

        expect(
            Tenant::query()
                ->orderBy(
                    'created_at'
                )
                ->pluck(
                    'slug'
                )
                ->all()
        )->toBe([
            'frota-teste-lda',
            'frota-teste-lda-2',
        ]);
    }
);
