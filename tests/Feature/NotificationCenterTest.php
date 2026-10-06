<?php

use App\Models\Alert;
use App\Models\AlertRecipient;
use App\Models\HelpCategory;
use App\Models\HelpContent;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed(
        RoleSeeder::class
    );
});

function ncHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function ncTenant(
    string $name,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$name,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function ncUser(
    Tenant $tenant,
    string $role,
    string $email
): User {
    $user=
        User::factory()
            ->create([
                'email'=>$email,
                'ativo'=>true,
            ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $roleModel=
        Role::where(
            'codigo',
            $role
        )->firstOrFail();

    UserRole::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'role_id'=>$roleModel->id,
    ]);

    return $user;
}

function ncAdmin(): User
{
    $user=
        User::factory()
            ->create([
                'email'=>'notifications.admin@test.pt',
                'ativo'=>true,
            ]);

    $role=
        Role::where(
            'codigo',
            'super_admin'
        )->firstOrFail();

    UserRole::create([
        'tenant_id'=>null,
        'user_id'=>$user->id,
        'role_id'=>$role->id,
    ]);

    return $user;
}

function ncActAdmin(
    $test,
    User $user
): void {
    $test->flushSession();
    Auth::forgetGuards();

    $test
        ->withHeaders(
            ncHeaders()
        )
        ->actingAs(
            $user,
            'web'
        );
}

function ncActTenant(
    $test,
    User $user,
    Tenant $tenant
): void {
    $test->flushSession();
    Auth::forgetGuards();

    $test
        ->withHeaders(
            ncHeaders()
        )
        ->actingAs(
            $user,
            'web'
        )
        ->withSession([
            'tenant_id'=>$tenant->id,
        ]);
}

test(
    'comunicacao global chega apenas aos perfis selecionados',
    function(){
        $tenant=
            ncTenant(
                'Frota Global',
                'nc-global'
            );

        $manager=
            ncUser(
                $tenant,
                'admin_empresa',
                'manager@nc.test'
            );

        $driver=
            ncUser(
                $tenant,
                'motorista',
                'driver@nc.test'
            );

        $admin=
            ncAdmin();

        ncActAdmin(
            $this,
            $admin
        );

        $this
            ->postJson(
                '/api/backoffice/notificacoes',
                [
                    'type'=>'news',
                    'title'=>'Nova funcionalidade',
                    'message'=>'Temos uma nova funcionalidade.',
                    'severity'=>'low',
                    'target_scope'=>'all',
                    'audiences'=>[
                        'admin_empresa',
                    ],
                    'channels'=>[
                        'in_app',
                    ],
                    'active'=>true,
                ]
            )
            ->assertCreated();

        expect(
            AlertRecipient::query()
                ->where(
                    'user_id',
                    $manager->id
                )
                ->exists()
        )->toBeTrue();

        expect(
            AlertRecipient::query()
                ->where(
                    'user_id',
                    $driver->id
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'comunicacao selecionada nao chega a outro tenant',
    function(){
        $tenantA=
            ncTenant(
                'Frota A',
                'nc-a'
            );

        $tenantB=
            ncTenant(
                'Frota B',
                'nc-b'
            );

        $managerA=
            ncUser(
                $tenantA,
                'admin_empresa',
                'manager.a@nc.test'
            );

        $managerB=
            ncUser(
                $tenantB,
                'admin_empresa',
                'manager.b@nc.test'
            );

        $admin=
            ncAdmin();

        ncActAdmin(
            $this,
            $admin
        );

        $this
            ->postJson(
                '/api/backoffice/notificacoes',
                [
                    'type'=>'platform_status',
                    'title'=>'Incidente específico',
                    'message'=>'Teste.',
                    'severity'=>'high',
                    'target_scope'=>'selected',
                    'tenant_ids'=>[
                        $tenantA->id,
                    ],
                    'audiences'=>[
                        'admin_empresa',
                    ],
                    'channels'=>[
                        'in_app',
                    ],
                    'active'=>true,
                ]
            )
            ->assertCreated();

        expect(
            AlertRecipient::query()
                ->where(
                    'user_id',
                    $managerA->id
                )
                ->exists()
        )->toBeTrue();

        expect(
            AlertRecipient::query()
                ->where(
                    'user_id',
                    $managerB->id
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'motorista consegue consultar notificacao destinada ao motorista',
    function(){
        $tenant=
            ncTenant(
                'Frota Driver',
                'nc-driver'
            );

        $driver=
            ncUser(
                $tenant,
                'motorista',
                'driver.portal@nc.test'
            );

        $admin=
            ncAdmin();

        ncActAdmin(
            $this,
            $admin
        );

        $this->postJson(
            '/api/backoffice/notificacoes',
            [
                'type'=>'system',
                'title'=>'Aviso motorista',
                'message'=>'Mensagem.',
                'severity'=>'medium',
                'target_scope'=>'all',
                'audiences'=>[
                    'motorista',
                ],
                'active'=>true,
            ]
        )->assertCreated();

        ncActTenant(
            $this,
            $driver,
            $tenant
        );

        $this
            ->getJson(
                '/api/alertas'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.0.title',
                'Aviso motorista'
            );
    }
);

test(
    'publicacao da central de ajuda gera notificacao',
    function(){
        $tenant=
            ncTenant(
                'Frota Training',
                'nc-training'
            );

        $manager=
            ncUser(
                $tenant,
                'admin_empresa',
                'training.manager@nc.test'
            );

        $admin=
            ncAdmin();

        $category=
            HelpCategory::create([
                'name'=>'Treinamentos',
                'slug'=>'training-nc',
                'active'=>true,
                'position'=>1,
            ]);

        ncActAdmin(
            $this,
            $admin
        );

        $this
            ->postJson(
                '/api/backoffice/ajuda/conteudos',
                [
                    'category_id'=>$category->id,
                    'type'=>'article',
                    'title'=>'Novo treinamento',
                    'body'=>'Conteúdo',
                    'feature_key'=>'veiculos',
                    'audiences'=>[
                        'admin_empresa',
                    ],
                    'position'=>1,
                    'featured'=>false,
                    'active'=>true,
                ]
            )
            ->assertCreated();

        expect(
            Alert::query()
                ->where(
                    'source_type',
                    'help_content'
                )
                ->where(
                    'category',
                    'training'
                )
                ->exists()
        )->toBeTrue();

        expect(
            AlertRecipient::query()
                ->where(
                    'user_id',
                    $manager->id
                )
                ->exists()
        )->toBeTrue();
    }
);

test(
    'resolver comunicacao resolve alertas distribuidos',
    function(){
        $tenant=
            ncTenant(
                'Frota Resolve',
                'nc-resolve'
            );

        ncUser(
            $tenant,
            'admin_empresa',
            'resolve.manager@nc.test'
        );

        $admin=
            ncAdmin();

        ncActAdmin(
            $this,
            $admin
        );

        $notificationId=
            $this
                ->postJson(
                    '/api/backoffice/notificacoes',
                    [
                        'type'=>'platform_status',
                        'title'=>'Instabilidade',
                        'message'=>'Estamos verificando.',
                        'severity'=>'high',
                        'target_scope'=>'all',
                        'audiences'=>[
                            'admin_empresa',
                        ],
                        'active'=>true,
                    ]
                )
                ->assertCreated()
                ->json(
                    'data.id'
                );

        $this
            ->postJson(
                "/api/backoffice/notificacoes/{$notificationId}/resolver"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'resolved'
            );

        expect(
            Alert::query()
                ->where(
                    'source_type',
                    'platform_notification'
                )
                ->where(
                    'source_id',
                    $notificationId
                )
                ->where(
                    'status',
                    'open'
                )
                ->exists()
        )->toBeFalse();
    }
);
