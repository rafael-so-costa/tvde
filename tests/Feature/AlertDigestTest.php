<?php

use App\Jobs\SendAlertDigest;
use App\Mail\AlertDigestEmail;
use App\Models\AlertDigestRun;
use App\Models\AlertRule;
use App\Models\NotificationPreference;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\AlertDigestService;
use App\Services\AlertService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function adgTenant(): Tenant
{
    return Tenant::create([
        'nome'=>'Tenant Digest',
        'slug'=>'tenant-alert-digest',
        'ativo'=>true,
    ]);
}

function adgUser(
    Tenant $tenant
): User {
    $user=User::factory()->create([
        'email'=>'digest@alert.test',
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

function adgPreference(
    Tenant $tenant,
    User $user,
    array $overrides=[]
): NotificationPreference {
    $preference=
        new NotificationPreference(
            array_merge(
                [
                    'category'=>'*',
                    'channel'=>'email',
                    'enabled'=>true,
                    'minimum_severity'=>'low',
                    'delivery_mode'=>'daily_digest',
                    'timezone'=>'Europe/Lisbon',
                ],
                $overrides
            )
        );

    $preference->tenant_id=
        $tenant->id;

    $preference->user_id=
        $user->id;

    $preference->save();

    return $preference;
}

function adgRule(
    Tenant $tenant,
    string $code,
    string $category='document'
): AlertRule {
    $rule=new AlertRule([
        'code'=>$code,
        'name'=>$code,
        'category'=>$category,
        'severity'=>'medium',
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

function adgAlert(
    Tenant $tenant,
    User $user,
    AlertRule $rule,
    string $sourceId,
    string $severity='medium'
){
    return app(
        AlertService::class
    )->raise(
        $rule,
        [
            'source_type'=>'teste',
            'source_id'=>$sourceId,
            'dedup_key'=>'digest',
            'category'=>$rule->category,
            'severity'=>$severity,
            'title'=>
                "Alerta {$sourceId}",
        ],
        [
            $user->id,
        ]
    );
}

test(
    'digest diario agrega varios alertas num unico envio',
    function(){
        Queue::fake();

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 09:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $tenant=adgTenant();
            $user=adgUser($tenant);

            adgPreference(
                $tenant,
                $user
            );

            adgAlert(
                $tenant,
                $user,
                adgRule(
                    $tenant,
                    'digest.document'
                ),
                '001'
            );

            adgAlert(
                $tenant,
                $user,
                adgRule(
                    $tenant,
                    'digest.maintenance',
                    'maintenance'
                ),
                '002',
                'high'
            );

            $result=app(
                AlertDigestService::class
            )->dispatchDue();

            expect(
                $result['queued']
            )->toBe(1);

            $run=
                AlertDigestRun::query()
                    ->firstOrFail();

            expect(
                $run->alert_count
            )->toBe(2);

            expect(
                $run->alert_recipient_ids
            )->toHaveCount(2);

            Queue::assertPushed(
                SendAlertDigest::class,
                1
            );
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'digest nao duplica no mesmo dia',
    function(){
        Queue::fake();

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 10:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $tenant=adgTenant();
            $user=adgUser($tenant);

            adgPreference(
                $tenant,
                $user
            );

            adgAlert(
                $tenant,
                $user,
                adgRule(
                    $tenant,
                    'digest.idempotent'
                ),
                '003'
            );

            $service=app(
                AlertDigestService::class
            );

            $service->dispatchDue();
            $service->dispatchDue();

            expect(
                AlertDigestRun::count()
            )->toBe(1);

            Queue::assertPushed(
                SendAlertDigest::class,
                1
            );
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'mesmo alerta pode aparecer num novo digest no dia seguinte',
    function(){
        Queue::fake();

        $tenant=adgTenant();
        $user=adgUser($tenant);

        adgPreference(
            $tenant,
            $user
        );

        adgAlert(
            $tenant,
            $user,
            adgRule(
                $tenant,
                'digest.next-day'
            ),
            '004'
        );

        $service=app(
            AlertDigestService::class
        );

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 09:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $service->dispatchDue();

            CarbonImmutable::setTestNow(
                CarbonImmutable::parse(
                    '2026-09-27 09:00:00',
                    'Europe/Lisbon'
                )
            );

            $service->dispatchDue();

            expect(
                AlertDigestRun::count()
            )->toBe(2);
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'preferencia especifica desativada exclui categoria do digest',
    function(){
        Queue::fake();

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 09:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $tenant=adgTenant();
            $user=adgUser($tenant);

            adgPreference(
                $tenant,
                $user
            );

            adgPreference(
                $tenant,
                $user,
                [
                    'category'=>'maintenance',
                    'enabled'=>false,
                ]
            );

            adgAlert(
                $tenant,
                $user,
                adgRule(
                    $tenant,
                    'digest.allowed'
                ),
                '005'
            );

            adgAlert(
                $tenant,
                $user,
                adgRule(
                    $tenant,
                    'digest.blocked',
                    'maintenance'
                ),
                '006'
            );

            app(
                AlertDigestService::class
            )->dispatchDue();

            $run=
                AlertDigestRun::query()
                    ->firstOrFail();

            expect(
                $run->alert_count
            )->toBe(1);
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'severidade minima filtra alertas do digest',
    function(){
        Queue::fake();

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 09:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $tenant=adgTenant();
            $user=adgUser($tenant);

            adgPreference(
                $tenant,
                $user,
                [
                    'minimum_severity'=>'high',
                ]
            );

            $rule=adgRule(
                $tenant,
                'digest.severity'
            );

            adgAlert(
                $tenant,
                $user,
                $rule,
                '007',
                'medium'
            );

            adgAlert(
                $tenant,
                $user,
                $rule,
                '008',
                'critical'
            );

            app(
                AlertDigestService::class
            )->dispatchDue();

            $run=
                AlertDigestRun::query()
                    ->firstOrFail();

            expect(
                $run->alert_count
            )->toBe(1);
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'quiet hours impedem criacao do digest ate janela terminar',
    function(){
        Queue::fake();

        $tenant=adgTenant();
        $user=adgUser($tenant);

        adgPreference(
            $tenant,
            $user,
            [
                'quiet_hours_start'=>'22:00',
                'quiet_hours_end'=>'10:00',
            ]
        );

        adgAlert(
            $tenant,
            $user,
            adgRule(
                $tenant,
                'digest.quiet'
            ),
            '009'
        );

        $service=app(
            AlertDigestService::class
        );

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 09:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $service->dispatchDue();

            expect(
                AlertDigestRun::count()
            )->toBe(0);

            CarbonImmutable::setTestNow(
                CarbonImmutable::parse(
                    '2026-09-26 10:00:00',
                    'Europe/Lisbon'
                )
            );

            $service->dispatchDue();

            expect(
                AlertDigestRun::count()
            )->toBe(1);
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);

test(
    'job envia um email agregado e marca digest como enviado',
    function(){
        Queue::fake();

        CarbonImmutable::setTestNow(
            CarbonImmutable::parse(
                '2026-09-26 09:00:00',
                'Europe/Lisbon'
            )
        );

        try{
            $tenant=adgTenant();
            $user=adgUser($tenant);

            adgPreference(
                $tenant,
                $user
            );

            $rule=adgRule(
                $tenant,
                'digest.send'
            );

            adgAlert(
                $tenant,
                $user,
                $rule,
                '010'
            );

            adgAlert(
                $tenant,
                $user,
                $rule,
                '011'
            );

            app(
                AlertDigestService::class
            )->dispatchDue();

            $run=
                AlertDigestRun::query()
                    ->firstOrFail();

            Mail::fake();

            $job=new SendAlertDigest(
                $run->id
            );

            $job->handle(
                app(
                    AlertDigestService::class
                )
            );

            Mail::assertSent(
                AlertDigestEmail::class,
                function(
                    AlertDigestEmail $mail
                ) use($user){
                    return
                        $mail->hasTo(
                            $user->email
                        ) &&
                        $mail
                            ->alerts
                            ->count()===2;
                }
            );

            $run->refresh();

            expect($run->status)
                ->toBe('sent');

            expect($run->attempts)
                ->toBe(1);

            expect($run->sent_at)
                ->not->toBeNull();
        }finally{
            CarbonImmutable::setTestNow();
        }
    }
);
