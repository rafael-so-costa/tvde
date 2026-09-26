<?php

use App\Models\AlertRule;
use App\Models\NotificationPreference;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function npaHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function npaTenant(
    string $nome='Tenant Preferências',
    string $slug='tenant-preferencias'
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function npaUser(
    Tenant $tenant,
    string $email
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

    return $user;
}

function npaLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email'=>$user->email,
                'password'=>'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function npaRule(
    Tenant $tenant
): AlertRule {
    $rule=new AlertRule([
        'code'=>'preference.api.test',
        'name'=>'Preference API',
        'category'=>'document',
        'severity'=>'high',
        'enabled'=>true,
        'channels'=>[
            'in_app',
            'email',
        ],
    ]);

    $rule->tenant_id=$tenant->id;
    $rule->save();

    return $rule;
}

test(
    'preferencias exigem autenticacao',
    function(){
        $this
            ->withHeaders(
                npaHeaders()
            )
            ->getJson(
                '/api/alertas/preferencias'
            )
            ->assertUnauthorized();
    }
);

test(
    'email vem desativado por defeito quando nao existe preferencia',
    function(){
        $tenant=npaTenant();

        $user=npaUser(
            $tenant,
            'default@preference.test'
        );

        npaLogin(
            $this,
            $user
        );

        $response=$this
            ->withHeaders(
                npaHeaders()
            )
            ->getJson(
                '/api/alertas/preferencias'
            )
            ->assertOk()
            ->assertJsonCount(
                0,
                'data'
            );

        $document=
            collect(
                $response->json(
                    'effective_email'
                )
            )
                ->firstWhere(
                    'category',
                    'document'
                );

        expect(
            $document['enabled']
        )->toBeFalse();

        expect(
            $document['source']
        )->toBe('default');
    }
);

test(
    'utilizador cria preferencia global de email',
    function(){
        $tenant=npaTenant(
            'Tenant Preferência Global',
            'tenant-pref-global'
        );

        $user=npaUser(
            $tenant,
            'global@preference.test'
        );

        npaLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                npaHeaders()
            )
            ->putJson(
                '/api/alertas/preferencias/email',
                [
                    'category'=>'*',
                    'enabled'=>true,
                    'minimum_severity'=>'medium',
                    'delivery_mode'=>'immediate',
                    'quiet_hours_start'=>'22:00',
                    'quiet_hours_end'=>'07:00',
                    'timezone'=>'Europe/Lisbon',
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.category',
                '*'
            )
            ->assertJsonPath(
                'data.channel',
                'email'
            )
            ->assertJsonPath(
                'data.enabled',
                true
            )
            ->assertJsonPath(
                'data.minimum_severity',
                'medium'
            );

        $this->assertDatabaseHas(
            'notification_preferences',
            [
                'tenant_id'=>$tenant->id,
                'user_id'=>$user->id,
                'category'=>'*',
                'channel'=>'email',
                'enabled'=>1,
                'minimum_severity'=>'medium',
                'delivery_mode'=>'immediate',
            ]
        );
    }
);

test(
    'preferencia de categoria sobrepoe preferencia global',
    function(){
        $tenant=npaTenant(
            'Tenant Override',
            'tenant-pref-override'
        );

        $user=npaUser(
            $tenant,
            'override@preference.test'
        );

        npaLogin(
            $this,
            $user
        );

        foreach([
            [
                'category'=>'*',
                'enabled'=>true,
                'minimum_severity'=>'medium',
            ],
            [
                'category'=>'maintenance',
                'enabled'=>false,
                'minimum_severity'=>'critical',
            ],
        ] as $payload){
            $this
                ->withHeaders(
                    npaHeaders()
                )
                ->putJson(
                    '/api/alertas/preferencias/email',
                    array_merge(
                        $payload,
                        [
                            'delivery_mode'=>'immediate',
                            'quiet_hours_start'=>null,
                            'quiet_hours_end'=>null,
                            'timezone'=>'Europe/Lisbon',
                        ]
                    )
                )
                ->assertSuccessful();
        }

        $response=$this
            ->withHeaders(
                npaHeaders()
            )
            ->getJson(
                '/api/alertas/preferencias'
            )
            ->assertOk();

        $maintenance=
            collect(
                $response->json(
                    'effective_email'
                )
            )
                ->firstWhere(
                    'category',
                    'maintenance'
                );

        $document=
            collect(
                $response->json(
                    'effective_email'
                )
            )
                ->firstWhere(
                    'category',
                    'document'
                );

        expect(
            $maintenance['enabled']
        )->toBeFalse();

        expect(
            $maintenance['source']
        )->toBe('category');

        expect(
            $document['enabled']
        )->toBeTrue();

        expect(
            $document['source']
        )->toBe('global');
    }
);

test(
    'quiet hours exige inicio e fim diferentes',
    function(){
        $tenant=npaTenant(
            'Tenant Quiet Validation',
            'tenant-quiet-validation'
        );

        $user=npaUser(
            $tenant,
            'quiet-validation@preference.test'
        );

        npaLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                npaHeaders()
            )
            ->putJson(
                '/api/alertas/preferencias/email',
                [
                    'category'=>'document',
                    'enabled'=>true,
                    'minimum_severity'=>'low',
                    'delivery_mode'=>'immediate',
                    'quiet_hours_start'=>'22:00',
                    'quiet_hours_end'=>'22:00',
                    'timezone'=>'Europe/Lisbon',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'quiet_hours_end'
            );
    }
);

test(
    'daily digest pode ser configurado sem gerar email imediato',
    function(){
        Queue::fake();

        $tenant=npaTenant(
            'Tenant Digest',
            'tenant-digest'
        );

        $user=npaUser(
            $tenant,
            'digest@preference.test'
        );

        npaLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                npaHeaders()
            )
            ->putJson(
                '/api/alertas/preferencias/email',
                [
                    'category'=>'document',
                    'enabled'=>true,
                    'minimum_severity'=>'low',
                    'delivery_mode'=>'daily_digest',
                    'quiet_hours_start'=>null,
                    'quiet_hours_end'=>null,
                    'timezone'=>'Europe/Lisbon',
                ]
            )
            ->assertCreated();

        app(
            AlertService::class
        )->raise(
            npaRule($tenant),
            [
                'source_type'=>'veiculo',
                'source_id'=>'digest-1',
                'dedup_key'=>'digest',
                'category'=>'document',
                'severity'=>'high',
                'title'=>'Digest teste',
            ],
            [
                $user->id,
            ]
        );

        $this->assertDatabaseMissing(
            'alert_deliveries',
            [
                'channel'=>'email',
            ]
        );

        Queue::assertNothingPushed();
    }
);

test(
    'historico de entregas mostra apenas entregas do utilizador atual',
    function(){
        Queue::fake();

        $tenant=npaTenant(
            'Tenant Histórico',
            'tenant-history'
        );

        $userA=npaUser(
            $tenant,
            'history-a@preference.test'
        );

        $userB=npaUser(
            $tenant,
            'history-b@preference.test'
        );

        $rule=npaRule(
            $tenant
        );

        app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'history-a',
                'dedup_key'=>'a',
                'category'=>'document',
                'severity'=>'high',
                'title'=>'Alerta A',
            ],
            [
                $userA->id,
            ]
        );

        app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'history-b',
                'dedup_key'=>'b',
                'category'=>'document',
                'severity'=>'high',
                'title'=>'Alerta B',
            ],
            [
                $userB->id,
            ]
        );

        npaLogin(
            $this,
            $userA
        );

        $response=$this
            ->withHeaders(
                npaHeaders()
            )
            ->getJson(
                '/api/alertas/entregas?channel=in_app'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            );

        expect(
            $response->json(
                'data.0.recipient.user_id'
            )
        )->toBe(
            $userA->id
        );

        expect(
            $response->json(
                'data.0.recipient.alert.title'
            )
        )->toBe(
            'Alerta A'
        );
    }
);

test(
    'utilizador remove preferencia de email',
    function(){
        $tenant=npaTenant(
            'Tenant Remover Preferência',
            'tenant-remove-pref'
        );

        $user=npaUser(
            $tenant,
            'remove@preference.test'
        );

        $preference=
            new NotificationPreference([
                'category'=>'document',
                'channel'=>'email',
                'enabled'=>true,
                'minimum_severity'=>'low',
                'delivery_mode'=>'immediate',
                'timezone'=>'Europe/Lisbon',
            ]);

        $preference->tenant_id=
            $tenant->id;

        $preference->user_id=
            $user->id;

        $preference->save();

        npaLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                npaHeaders()
            )
            ->deleteJson(
                '/api/alertas/preferencias/email',
                [
                    'category'=>'document',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'deleted',
                true
            );

        $this->assertDatabaseMissing(
            'notification_preferences',
            [
                'id'=>$preference->id,
            ]
        );
    }
);
