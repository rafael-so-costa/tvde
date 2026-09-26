<?php

use App\Jobs\SendAlertDelivery;
use App\Mail\AlertEmail;
use App\Models\AlertDelivery;
use App\Models\AlertRule;
use App\Models\NotificationPreference;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\AlertDeliveryService;
use App\Services\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Carbon\CarbonImmutable;

uses(RefreshDatabase::class);

function aldTenant(): Tenant
{
    return Tenant::create([
        'nome'=>'Tenant Delivery',
        'slug'=>'tenant-alert-delivery',
        'ativo'=>true,
    ]);
}

function aldUser(
    Tenant $tenant,
    string $email='delivery@alert.test'
): User {
    $user=User::factory()->create([
        'email'=>$email,
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

function aldRule(
    Tenant $tenant,
    string $severity='high'
): AlertRule {
    $rule=new AlertRule([
        'code'=>'delivery.test',
        'name'=>'Teste de entrega',
        'category'=>'document',
        'severity'=>$severity,
        'enabled'=>true,
        'channels'=>[
            'in_app',
            'email',
        ],
    ]);

    $rule->tenant_id=
        $tenant->id;

    $rule->save();

    return $rule;
}

function aldPreference(
    Tenant $tenant,
    User $user,
    string $minimum='low',
    bool $enabled=true
): NotificationPreference {
    $preference=
        new NotificationPreference([
            'category'=>'*',
            'channel'=>'email',
            'enabled'=>$enabled,
            'minimum_severity'=>$minimum,
            'delivery_mode'=>'immediate',
            'timezone'=>'Europe/Lisbon',
        ]);

    $preference->tenant_id=
        $tenant->id;

    $preference->user_id=
        $user->id;

    $preference->save();

    return $preference;
}

test(
    'alerta cria entrega in app mesmo sem email habilitado',
    function(){
        Queue::fake();

        $tenant=aldTenant();
        $user=aldUser($tenant);
        $rule=aldRule($tenant);

        $alert=app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'motorista',
                'source_id'=>'delivery-1',
                'dedup_key'=>'teste',
                'title'=>'Documento a vencer',
            ],
            [
                $user->id,
            ]
        );

        $recipient=
            $alert
                ->recipients()
                ->firstOrFail();

        $this->assertDatabaseHas(
            'alert_deliveries',
            [
                'alert_recipient_id'=>
                    $recipient->id,

                'channel'=>'in_app',
                'status'=>'delivered',
            ]
        );

        $this->assertDatabaseMissing(
            'alert_deliveries',
            [
                'alert_recipient_id'=>
                    $recipient->id,

                'channel'=>'email',
            ]
        );

        Queue::assertNothingPushed();
    }
);

test(
    'preferencia de email cria entrega em fila',
    function(){
        Queue::fake();

        $tenant=aldTenant();
        $user=aldUser($tenant);

        aldPreference(
            $tenant,
            $user
        );

        $rule=aldRule($tenant);

        $alert=app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'delivery-2',
                'dedup_key'=>'teste',
                'title'=>'Seguro a vencer',
                'severity'=>'high',
            ],
            [
                $user->id,
            ]
        );

        $recipient=
            $alert
                ->recipients()
                ->firstOrFail();

        $this->assertDatabaseHas(
            'alert_deliveries',
            [
                'alert_recipient_id'=>
                    $recipient->id,

                'channel'=>'email',
                'status'=>'queued',
            ]
        );

        Queue::assertPushed(
            SendAlertDelivery::class,
            1
        );
    }
);

test(
    'severidade minima impede email abaixo do nivel configurado',
    function(){
        Queue::fake();

        $tenant=aldTenant();
        $user=aldUser($tenant);

        aldPreference(
            $tenant,
            $user,
            'critical'
        );

        $rule=aldRule(
            $tenant,
            'medium'
        );

        app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'delivery-3',
                'dedup_key'=>'teste',
                'title'=>'Alerta médio',
                'severity'=>'medium',
            ],
            [
                $user->id,
            ]
        );

        expect(
            AlertDelivery::query()
                ->where(
                    'channel',
                    'email'
                )
                ->exists()
        )->toBeFalse();

        Queue::assertNothingPushed();
    }
);

test(
    'avaliacao repetida nao duplica entrega de email',
    function(){
        Queue::fake();

        $tenant=aldTenant();
        $user=aldUser($tenant);

        aldPreference(
            $tenant,
            $user
        );

        $rule=aldRule($tenant);

        $service=app(
            AlertService::class
        );

        $data=[
            'source_type'=>'veiculo',
            'source_id'=>'delivery-4',
            'dedup_key'=>'teste',
            'title'=>'Alerta sem duplicação',
        ];

        $service->raise(
            $rule,
            $data,
            [
                $user->id,
            ]
        );

        $service->raise(
            $rule,
            $data,
            [
                $user->id,
            ]
        );

        expect(
            AlertDelivery::query()
                ->where(
                    'channel',
                    'email'
                )
                ->count()
        )->toBe(1);

        Queue::assertPushed(
            SendAlertDelivery::class,
            1
        );
    }
);

test(
    'job envia email e marca entrega como enviada',
    function(){
        Queue::fake();

        $tenant=aldTenant();
        $user=aldUser($tenant);

        aldPreference(
            $tenant,
            $user
        );

        $rule=aldRule($tenant);

        $alert=app(
            AlertService::class
        )->raise(
            $rule,
            [
                'source_type'=>'veiculo',
                'source_id'=>'delivery-5',
                'dedup_key'=>'teste',
                'title'=>'Email real de teste',
                'severity'=>'critical',
            ],
            [
                $user->id,
            ]
        );

        $recipient=
            $alert
                ->recipients()
                ->firstOrFail();

        $delivery=
            AlertDelivery::query()
                ->where(
                    'alert_recipient_id',
                    $recipient->id
                )
                ->where(
                    'channel',
                    'email'
                )
                ->firstOrFail();

        Mail::fake();

        $job=new SendAlertDelivery(
            $delivery->id
        );

        $job->handle(
            app(
                AlertDeliveryService::class
            )
        );

        Mail::assertSent(
            AlertEmail::class,
            function(
                AlertEmail $mail
            ) use($user){
                return $mail->hasTo(
                    $user->email
                );
            }
        );

        $delivery->refresh();

        expect($delivery->status)
            ->toBe('sent');

        expect($delivery->attempts)
            ->toBe(1);

        expect($delivery->sent_at)
            ->not->toBeNull();

        expect($delivery->delivered_at)
            ->toBeNull();
    }
);


test(
    'quiet hours atravessando meia noite adiam email',
    function(){
        Queue::fake();

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-25 23:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $tenant=aldTenant();

            $user=aldUser(
                $tenant,
                'quiet@alert.test'
            );

            $preference=
                aldPreference(
                    $tenant,
                    $user
                );

            $preference
                ->quiet_hours_start=
                '22:00';

            $preference
                ->quiet_hours_end=
                '07:00';

            $preference->timezone=
                'Europe/Lisbon';

            $preference->save();

            $alert=app(
                AlertService::class
            )->raise(
                aldRule($tenant),
                [
                    'source_type'=>'veiculo',
                    'source_id'=>'quiet-1',
                    'dedup_key'=>'quiet',
                    'title'=>'Quiet hours',
                    'severity'=>'high',
                ],
                [
                    $user->id,
                ]
            );

            $recipient=
                $alert
                    ->recipients()
                    ->firstOrFail();

            $service=app(
                AlertDeliveryService::class
            );

            expect(
                $service
                    ->quietHoursActive(
                        $alert,
                        $recipient
                    )
            )->toBeTrue();

            expect(
                $service
                    ->secondsUntilQuietHoursEnd(
                        $alert,
                        $recipient
                    )
            )->toBeGreaterThan(
                7*60*60
            );

            $this->assertDatabaseHas(
                'alert_deliveries',
                [
                    'alert_recipient_id'=>
                        $recipient->id,
                    'channel'=>'email',
                    'status'=>'queued',
                ]
            );

            Queue::assertPushed(
                SendAlertDelivery::class,
                1
            );
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'preferencia daily digest nao cria entrega individual imediata',
    function(){
        Queue::fake();

        $tenant=aldTenant();

        $user=aldUser(
            $tenant,
            'digest-delivery@alert.test'
        );

        $preference=
            aldPreference(
                $tenant,
                $user
            );

        $preference->delivery_mode=
            'daily_digest';

        $preference->save();

        app(
            AlertService::class
        )->raise(
            aldRule($tenant),
            [
                'source_type'=>'veiculo',
                'source_id'=>'digest-delivery',
                'dedup_key'=>'digest',
                'title'=>'Digest',
                'severity'=>'critical',
            ],
            [
                $user->id,
            ]
        );

        expect(
            \App\Models\AlertDelivery::query()
                ->where(
                    'channel',
                    'email'
                )
                ->exists()
        )->toBeFalse();

        Queue::assertNothingPushed();
    }
);
