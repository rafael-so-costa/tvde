<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Services\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function altApiHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function altApiTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function altApiUser(
    Tenant $tenant,
    string $email,
    ?string $roleCode=null
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make(
            'SenhaTeste123!'
        ),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    if($roleCode){
        $role=Role::firstOrCreate(
            ['codigo'=>$roleCode],
            [
                'nome'=>$roleCode,
                'sistema'=>true,
            ]
        );

        UserRole::create([
            'user_id'=>$user->id,
            'role_id'=>$role->id,
            'tenant_id'=>
                $roleCode==='super_admin'
                    ? null
                    : $tenant->id,
        ]);
    }

    return $user;
}

function altApiLogin(
    $test,
    User $user
): void {
    $test->postJson(
        '/login',
        [
            'email'=>$user->email,
            'password'=>'SenhaTeste123!',
        ]
    )->assertOk();
}

function altApiRule(
    Tenant $tenant,
    string $code='test.alert'
): AlertRule {
    $rule=new AlertRule([
        'code'=>$code,
        'name'=>'Regra de teste',
        'category'=>'document',
        'severity'=>'medium',
        'enabled'=>true,
        'channels'=>[
            'in_app',
        ],
    ]);

    $rule->tenant_id=
        $tenant->id;

    $rule->save();

    return $rule;
}

function altApiRaise(
    Tenant $tenant,
    User $recipient,
    string $code,
    array $overrides=[]
): Alert {
    $rule=altApiRule(
        $tenant,
        $code
    );

    return app(
        AlertService::class
    )->raise(
        $rule,
        array_merge([
            'source_type'=>'motorista',
            'source_id'=>
                'source-'.$code,

            'dedup_key'=>
                'condition-'.$code,

            'title'=>
                'Alerta '.$code,

            'message'=>
                'Mensagem do alerta.',

            'severity'=>'medium',

            'due_at'=>
                now()
                    ->addDays(10)
                    ->toISOString(),

            'action_url'=>
                '/motoristas',
        ],$overrides),
        [
            $recipient->id,
        ]
    );
}

test(
    'api de alertas exige autenticacao',
    function(){
        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->getJson(
                '/api/alertas/resumo'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador consulta apenas alertas destinados a si',
    function(){
        $tenant=altApiTenant(
            'Tenant Inbox',
            'tenant-alert-api-inbox'
        );

        $userA=altApiUser(
            $tenant,
            'inbox-a@alert.test'
        );

        $userB=altApiUser(
            $tenant,
            'inbox-b@alert.test'
        );

        $alertA=altApiRaise(
            $tenant,
            $userA,
            'inbox.a'
        );

        altApiRaise(
            $tenant,
            $userB,
            'inbox.b'
        );

        altApiLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->getJson('/api/alertas')
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.id',
                $alertA->id
            )
            ->assertJsonPath(
                'meta.total',
                1
            );
    }
);

test(
    'utilizador nao consulta alerta de outro destinatario',
    function(){
        $tenant=altApiTenant(
            'Tenant Segurança',
            'tenant-alert-api-seguranca'
        );

        $userA=altApiUser(
            $tenant,
            'security-a@alert.test'
        );

        $userB=altApiUser(
            $tenant,
            'security-b@alert.test'
        );

        $alert=altApiRaise(
            $tenant,
            $userA,
            'security.alert'
        );

        altApiLogin(
            $this,
            $userB
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->getJson(
                "/api/alertas/{$alert->id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alert->id}/lido"
            )
            ->assertNotFound();
    }
);

test(
    'resumo retorna contadores individuais',
    function(){
        $tenant=altApiTenant(
            'Tenant Resumo',
            'tenant-alert-api-resumo'
        );

        $user=altApiUser(
            $tenant,
            'summary@alert.test'
        );

        altApiRaise(
            $tenant,
            $user,
            'summary.critical',
            [
                'severity'=>'critical',
            ]
        );

        altApiRaise(
            $tenant,
            $user,
            'summary.high',
            [
                'severity'=>'high',
            ]
        );

        altApiLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->getJson(
                '/api/alertas/resumo'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.total',
                2
            )
            ->assertJsonPath(
                'data.unread',
                2
            )
            ->assertJsonPath(
                'data.critical',
                1
            )
            ->assertJsonPath(
                'data.high',
                1
            )
            ->assertJsonCount(
                2,
                'data.items'
            );
    }
);

test(
    'alerta adiado sai do resumo ate a data definida',
    function(){
        $tenant=altApiTenant(
            'Tenant Snooze',
            'tenant-alert-api-snooze'
        );

        $user=altApiUser(
            $tenant,
            'snooze@alert.test'
        );

        $alert=altApiRaise(
            $tenant,
            $user,
            'snooze.alert'
        );

        altApiLogin(
            $this,
            $user
        );

        $until=now()
            ->addDay()
            ->startOfMinute();

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alert->id}/adiar",
                [
                    'snoozed_until'=>
                        $until->toISOString(),
                ]
            )
            ->assertOk();

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->getJson(
                '/api/alertas/resumo'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.total',
                0
            )
            ->assertJsonPath(
                'data.snoozed',
                1
            );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->getJson(
                '/api/alertas?include_snoozed=1'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            );
    }
);

test(
    'utilizador marca alerta como lido e reconhecido',
    function(){
        $tenant=altApiTenant(
            'Tenant Estado',
            'tenant-alert-api-estado'
        );

        $user=altApiUser(
            $tenant,
            'state@alert.test'
        );

        $alert=altApiRaise(
            $tenant,
            $user,
            'state.alert'
        );

        altApiLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alert->id}/lido"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.active',
                true
            );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alert->id}/reconhecer"
            )
            ->assertOk();

        $this->assertDatabaseMissing(
            'alert_recipients',
            [
                'alert_id'=>$alert->id,
                'user_id'=>$user->id,
                'read_at'=>null,
            ]
        );

        $recipient=$alert
            ->recipients()
            ->where(
                'user_id',
                $user->id
            )
            ->firstOrFail();

        expect(
            $recipient->read_at
        )->not->toBeNull();

        expect(
            $recipient->acknowledged_at
        )->not->toBeNull();
    }
);

test(
    'marcar todos como lidos afeta apenas o utilizador atual',
    function(){
        $tenant=altApiTenant(
            'Tenant Todos Lidos',
            'tenant-alert-api-todos-lidos'
        );

        $userA=altApiUser(
            $tenant,
            'allread-a@alert.test'
        );

        $userB=altApiUser(
            $tenant,
            'allread-b@alert.test'
        );

        altApiRaise(
            $tenant,
            $userA,
            'allread.a1'
        );

        altApiRaise(
            $tenant,
            $userA,
            'allread.a2'
        );

        $alertB=altApiRaise(
            $tenant,
            $userB,
            'allread.b'
        );

        altApiLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                '/api/alertas/marcar-todos-lidos'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.updated',
                2
            );

        expect(
            $alertB
                ->recipients()
                ->where(
                    'user_id',
                    $userB->id
                )
                ->whereNull(
                    'read_at'
                )
                ->exists()
        )->toBeTrue();
    }
);

test(
    'utilizador comum nao resolve alerta globalmente',
    function(){
        $tenant=altApiTenant(
            'Tenant Resolver Negado',
            'tenant-alert-api-resolver-negado'
        );

        $user=altApiUser(
            $tenant,
            'resolve-denied@alert.test'
        );

        $alert=altApiRaise(
            $tenant,
            $user,
            'resolve.denied'
        );

        altApiLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alert->id}/resolver",
                [
                    'note'=>'Teste',
                ]
            )
            ->assertForbidden();

        expect(
            $alert
                ->fresh()
                ->status
        )->toBe('open');
    }
);

test(
    'administrador resolve alerta do proprio tenant',
    function(){
        $tenant=altApiTenant(
            'Tenant Resolver',
            'tenant-alert-api-resolver'
        );

        $recipient=altApiUser(
            $tenant,
            'recipient@alert.test'
        );

        $admin=altApiUser(
            $tenant,
            'admin-resolve@alert.test',
            'admin_empresa'
        );

        $alert=altApiRaise(
            $tenant,
            $recipient,
            'resolve.allowed'
        );

        altApiLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alert->id}/resolver",
                [
                    'note'=>
                        'Tratado pelo gestor.',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'resolved'
            )
            ->assertJsonPath(
                'data.resolution_type',
                'manual'
            );

        $alert->refresh();

        expect($alert->active_key)
            ->toBeNull();

        expect($alert->resolved_by)
            ->toBe($admin->id);
    }
);

test(
    'administrador nao resolve alerta de outro tenant',
    function(){
        $tenantA=altApiTenant(
            'Tenant Resolver A',
            'tenant-alert-api-resolve-a'
        );

        $tenantB=altApiTenant(
            'Tenant Resolver B',
            'tenant-alert-api-resolve-b'
        );

        $adminA=altApiUser(
            $tenantA,
            'admin-a@alert.test',
            'admin_empresa'
        );

        $recipientB=altApiUser(
            $tenantB,
            'recipient-b@alert.test'
        );

        $alertB=altApiRaise(
            $tenantB,
            $recipientB,
            'resolve.cross-tenant'
        );

        altApiLogin(
            $this,
            $adminA
        );

        $this
            ->withHeaders(
                altApiHeaders()
            )
            ->postJson(
                "/api/alertas/{$alertB->id}/resolver"
            )
            ->assertNotFound();

        expect(
            $alertB
                ->fresh()
                ->status
        )->toBe('open');
    }
);
