<?php

use App\Models\Alert;
use App\Models\AlertRecipient;
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

function alertTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function alertUser(
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

function alertRule(
    Tenant $tenant,
    array $overrides=[]
): AlertRule {
    $rule=new AlertRule(
        array_merge([
            'code'=>
                'document.driver.license_expiry',

            'name'=>
                'Carta de condução a vencer',

            'category'=>'document',

            'description'=>
                'Alerta de validade da carta.',

            'severity'=>'high',

            'enabled'=>true,

            'channels'=>[
                'in_app',
            ],
        ],$overrides)
    );

    $rule->tenant_id=
        $tenant->id;

    $rule->save();

    return $rule;
}

test(
    'mesma condicao ativa nao cria alerta duplicado',
    function(){
        $tenant=alertTenant(
            'Tenant Deduplicação',
            'tenant-alert-dedup'
        );

        $user=alertUser(
            $tenant,
            'dedup@alert.test'
        );

        $rule=alertRule(
            $tenant
        );

        $service=app(
            AlertService::class
        );

        $first=$service->raise(
            $rule,
            [
                'source_type'=>'motorista',
                'source_id'=>'motorista-1',
                'dedup_key'=>
                    'carta_valid_until:2026-10-01',
                'title'=>
                    'Carta de condução a vencer',
                'message'=>
                    'A carta vence brevemente.',
                'due_at'=>'2026-10-01',
                'action_url'=>'/motoristas',
            ],
            [
                $user->id,
            ]
        );

        $second=$service->raise(
            $rule,
            [
                'source_type'=>'motorista',
                'source_id'=>'motorista-1',
                'dedup_key'=>
                    'carta_valid_until:2026-10-01',
                'title'=>
                    'Carta de condução a vencer',
                'message'=>
                    'Mensagem atualizada.',
                'due_at'=>'2026-10-01',
                'action_url'=>'/motoristas',
            ],
            [
                $user->id,
            ]
        );

        expect($first)->not->toBeNull();
        expect($second)->not->toBeNull();

        expect($second->id)
            ->toBe($first->id);

        expect(Alert::count())
            ->toBe(1);

        expect(
            AlertRecipient::count()
        )->toBe(1);

        expect(
            $second->message
        )->toBe(
            'Mensagem atualizada.'
        );
    }
);

test(
    'estado de leitura pertence ao destinatario e nao ao alerta',
    function(){
        $tenant=alertTenant(
            'Tenant Leitura',
            'tenant-alert-leitura'
        );

        $userA=alertUser(
            $tenant,
            'leitura-a@alert.test'
        );

        $userB=alertUser(
            $tenant,
            'leitura-b@alert.test'
        );

        $rule=alertRule(
            $tenant
        );

        $service=app(
            AlertService::class
        );

        $alert=$service->raise(
            $rule,
            [
                'source_type'=>'motorista',
                'source_id'=>'motorista-2',
                'dedup_key'=>'carta:2026-10-02',
                'title'=>'Documento a vencer',
            ],
            [
                $userA->id,
                $userB->id,
            ]
        );

        $service->markRead(
            $alert,
            $userA,
            $tenant->id
        );

        $recipientA=
            AlertRecipient::query()
                ->where(
                    'alert_id',
                    $alert->id
                )
                ->where(
                    'user_id',
                    $userA->id
                )
                ->firstOrFail();

        $recipientB=
            AlertRecipient::query()
                ->where(
                    'alert_id',
                    $alert->id
                )
                ->where(
                    'user_id',
                    $userB->id
                )
                ->firstOrFail();

        expect(
            $recipientA->read_at
        )->not->toBeNull();

        expect(
            $recipientB->read_at
        )->toBeNull();
    }
);

test(
    'destinatario fora do tenant nao recebe alerta',
    function(){
        $tenantA=alertTenant(
            'Tenant Alerta A',
            'tenant-alert-a'
        );

        $tenantB=alertTenant(
            'Tenant Alerta B',
            'tenant-alert-b'
        );

        $userA=alertUser(
            $tenantA,
            'tenant-a@alert.test'
        );

        $userB=alertUser(
            $tenantB,
            'tenant-b@alert.test'
        );

        $rule=alertRule(
            $tenantA
        );

        $alert=app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'veiculo-1',
                'dedup_key'=>
                    'seguro:2026-10-10',
                'title'=>'Seguro a vencer',
            ],
            [
                $userA->id,
                $userB->id,
            ]
        );

        expect(
            AlertRecipient::query()
                ->where(
                    'alert_id',
                    $alert->id
                )
                ->count()
        )->toBe(1);

        expect(
            AlertRecipient::query()
                ->where(
                    'alert_id',
                    $alert->id
                )
                ->value('user_id')
        )->toBe($userA->id);
    }
);

test(
    'alerta pode ser reconhecido e adiado individualmente',
    function(){
        $tenant=alertTenant(
            'Tenant Ack',
            'tenant-alert-ack'
        );

        $user=alertUser(
            $tenant,
            'ack@alert.test'
        );

        $rule=alertRule(
            $tenant
        );

        $service=app(
            AlertService::class
        );

        $alert=$service->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'veiculo-2',
                'dedup_key'=>'inspecao:2026-10-20',
                'title'=>'Inspeção a vencer',
            ],
            [
                $user->id,
            ]
        );

        $recipient=
            $service->acknowledge(
                $alert,
                $user,
                $tenant->id
            );

        expect(
            $recipient->read_at
        )->not->toBeNull();

        expect(
            $recipient->acknowledged_at
        )->not->toBeNull();

        $until=now()->addDay();

        $recipient=
            $service->snooze(
                $alert,
                $user,
                $tenant->id,
                $until
            );

        expect(
            $recipient
                ->snoozed_until
                ->timestamp
        )->toBe($until->timestamp);
    }
);

test(
    'resolver liberta a condicao para nova ocorrencia futura',
    function(){
        $tenant=alertTenant(
            'Tenant Recorrência',
            'tenant-alert-recorrencia'
        );

        $admin=alertUser(
            $tenant,
            'admin@alert.test',
            'admin_empresa'
        );

        $rule=alertRule(
            $tenant
        );

        $service=app(
            AlertService::class
        );

        $data=[
            'source_type'=>'veiculo',
            'source_id'=>'veiculo-3',
            'dedup_key'=>'estoque:pneu-baixo',
            'title'=>'Condição de teste',
        ];

        $first=$service->raise(
            $rule,
            $data,
            [
                $admin->id,
            ]
        );

        $service->resolve(
            $first,
            $admin,
            $tenant->id,
            'Condição resolvida.'
        );

        $first->refresh();

        expect($first->status)
            ->toBe('resolved');

        expect($first->active_key)
            ->toBeNull();

        expect($first->resolved_at)
            ->not->toBeNull();

        $second=$service->raise(
            $rule,
            $data,
            [
                $admin->id,
            ]
        );

        expect($second->id)
            ->not->toBe($first->id);

        expect($second->fingerprint)
            ->toBe($first->fingerprint);

        expect(Alert::count())
            ->toBe(2);
    }
);

test(
    'condicao pode ser resolvida automaticamente',
    function(){
        $tenant=alertTenant(
            'Tenant Auto Resolve',
            'tenant-alert-auto-resolve'
        );

        $user=alertUser(
            $tenant,
            'auto@alert.test'
        );

        $rule=alertRule(
            $tenant
        );

        $service=app(
            AlertService::class
        );

        $alert=$service->raise(
            $rule,
            [
                'source_type'=>'motorista',
                'source_id'=>'motorista-4',
                'dedup_key'=>'documento:2026-10-30',
                'title'=>'Documento a vencer',
            ],
            [
                $user->id,
            ]
        );

        $resolved=
            $service->resolveCondition(
                $tenant->id,
                $rule->code,
                'motorista',
                'motorista-4',
                'documento:2026-10-30'
            );

        expect($resolved)->not->toBeNull();

        expect($resolved->id)
            ->toBe($alert->id);

        expect($resolved->status)
            ->toBe('resolved');

        expect(
            $resolved->resolution_type
        )->toBe('automatic');

        expect($resolved->active_key)
            ->toBeNull();
    }
);
