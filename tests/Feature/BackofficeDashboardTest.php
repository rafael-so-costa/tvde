<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );
});

function backofficeDashboardHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function backofficeDashboardUser(
    bool $superAdmin
): User {
    $user = User::factory()
        ->create([
            'email' => $superAdmin
                ? 'superadmin@frotapro.test'
                : 'utilizador@frotapro.test',

            'password' => Hash::make(
                'SenhaTeste123!'
            ),

            'ativo' => true,
        ]);

    if ($superAdmin) {
        $role = Role::query()
            ->where(
                'codigo',
                'super_admin'
            )
            ->firstOrFail();

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'tenant_id' => null,
        ]);
    }

    return $user;
}

function loginBackofficeDashboard(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,
                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

test(
    'backoffice exige autenticação',
    function () {
        $this
            ->withHeaders(
                backofficeDashboardHeaders()
            )
            ->getJson(
                '/api/backoffice/dashboard'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador comum não acede ao backoffice',
    function () {
        $user =
            backofficeDashboardUser(
                false
            );

        loginBackofficeDashboard(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeDashboardHeaders()
            )
            ->getJson(
                '/api/backoffice/dashboard'
            )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Acesso restrito ao backoffice FrotaPRO.'
            );
    }
);

test(
    'super admin consulta indicadores globais do saas',
    function () {
        Tenant::create([
            'nome' => 'Cliente Ativo',
            'slug' => 'cliente-ativo',
            'ativo' => true,
        ]);

        Tenant::create([
            'nome' => 'Cliente Inativo',
            'slug' => 'cliente-inativo',
            'ativo' => false,
        ]);

        $user =
            backofficeDashboardUser(
                true
            );

        loginBackofficeDashboard(
            $this,
            $user
        );

        $this
            ->withHeaders(
                backofficeDashboardHeaders()
            )
            ->getJson(
                '/api/backoffice/dashboard'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.metrics.tenants_total',
                2
            )
            ->assertJsonPath(
                'data.metrics.tenants_active',
                1
            )
            ->assertJsonPath(
                'data.metrics.users_active',
                1
            )
            ->assertJsonCount(
                2,
                'data.recent_tenants'
            );
    }
);
