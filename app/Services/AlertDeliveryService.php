<?php

namespace App\Services;

use App\Jobs\SendAlertDelivery;
use App\Models\Alert;
use App\Models\AlertDelivery;
use App\Models\AlertRecipient;
use App\Models\NotificationPreference;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;

class AlertDeliveryService
{
    private const SEVERITIES=[
        'low'=>0,
        'medium'=>1,
        'high'=>2,
        'critical'=>3,
    ];

    public function syncAlert(
        Alert $alert
    ): void {
        $alert->load([
            'rule',
            'recipients.user:id,name,email,ativo',
        ]);

        foreach(
            $alert->recipients
            as $recipient
        ){
            if(
                !$recipient->active ||
                !$recipient->user ||
                !$recipient->user->ativo
            ){
                continue;
            }

            $this->ensureInApp(
                $recipient
            );

            if(
                !$this->emailAllowed(
                    $alert,
                    $recipient
                )
            ){
                continue;
            }

            $delaySeconds=
                $this->quietHoursActive(
                    $alert,
                    $recipient
                )
                    ? $this
                        ->secondsUntilQuietHoursEnd(
                            $alert,
                            $recipient
                        )
                    : 0;

            $this->ensureEmail(
                $recipient,
                $delaySeconds
            );
        }
    }

    public function emailAllowed(
        Alert $alert,
        AlertRecipient $recipient
    ): bool {
        if(
            $alert->status!=='open' ||
            !$recipient->active
        ){
            return false;
        }

        $alert->loadMissing('rule');

        $recipient->loadMissing(
            'user'
        );

        if(
            !$recipient->user ||
            !$recipient->user->ativo ||
            blank(
                $recipient
                    ->user
                    ->email
            )
        ){
            return false;
        }

        $channels=
            $alert->rule?->channels
            ?? [
                'in_app',
            ];

        if(
            !in_array(
                'email',
                $channels,
                true
            )
        ){
            return false;
        }

        $preference=
            $this->preference(
                $alert,
                $recipient
            );

        if(
            !$preference ||
            !$preference->enabled
        ){
            return false;
        }

        /*
         * Digest não pode gerar email
         * individual imediato.
         */
        if(
            $preference
                ->delivery_mode!==
            'immediate'
        ){
            return false;
        }

        $required=
            self::SEVERITIES[
                $preference
                    ->minimum_severity
            ]
            ?? 0;

        $current=
            self::SEVERITIES[
                $alert->severity
            ]
            ?? 0;

        return $current>=$required;
    }

    public function quietHoursActive(
        Alert $alert,
        AlertRecipient $recipient
    ): bool {
        $preference=
            $this->preference(
                $alert,
                $recipient
            );

        if(!$preference){
            return false;
        }

        $start=
            $this->timeValue(
                $preference
                    ->quiet_hours_start
            );

        $end=
            $this->timeValue(
                $preference
                    ->quiet_hours_end
            );

        if(
            !$start ||
            !$end ||
            $start===$end
        ){
            return false;
        }

        $now=
            CarbonImmutable::now(
                $this->timezone(
                    $preference
                )
            );

        $current=
            $now->format('H:i');

        /*
         * Exemplo normal:
         * 13:00 → 15:00
         */
        if($start<$end){
            return
                $current>=$start &&
                $current<$end;
        }

        /*
         * Exemplo atravessando meia-noite:
         * 22:00 → 07:00
         */
        return
            $current>=$start ||
            $current<$end;
    }

    public function secondsUntilQuietHoursEnd(
        Alert $alert,
        AlertRecipient $recipient
    ): int {
        $preference=
            $this->preference(
                $alert,
                $recipient
            );

        if(
            !$preference ||
            !$this->quietHoursActive(
                $alert,
                $recipient
            )
        ){
            return 0;
        }

        $timezone=
            $this->timezone(
                $preference
            );

        $now=
            CarbonImmutable::now(
                $timezone
            );

        $start=
            $this->timeValue(
                $preference
                    ->quiet_hours_start
            );

        $end=
            $this->timeValue(
                $preference
                    ->quiet_hours_end
            );

        [$hour,$minute]=array_map(
            'intval',
            explode(
                ':',
                $end
            )
        );

        $endAt=
            $now->setTime(
                $hour,
                $minute
            );

        /*
         * Janela atravessa meia-noite e
         * ainda estamos na parte noturna.
         */
        if(
            $start>$end &&
            $now->format('H:i')>=$start
        ){
            $endAt=
                $endAt->addDay();
        }

        if($endAt->lte($now)){
            $endAt=
                $endAt->addDay();
        }

        return max(
            60,
            (int)ceil(
                $now->diffInSeconds(
                    $endAt,
                    false
                )
            )
        );
    }

    private function preference(
        Alert $alert,
        AlertRecipient $recipient
    ): ?NotificationPreference {
        $preferences=
            NotificationPreference::query()
                ->where(
                    'tenant_id',
                    $alert->tenant_id
                )
                ->where(
                    'user_id',
                    $recipient->user_id
                )
                ->where(
                    'channel',
                    'email'
                )
                ->whereIn(
                    'category',
                    [
                        '*',
                        $alert->category,
                    ]
                )
                ->get();

        return $preferences
            ->firstWhere(
                'category',
                $alert->category
            )
            ?? $preferences
                ->firstWhere(
                    'category',
                    '*'
                );
    }

    private function ensureInApp(
        AlertRecipient $recipient
    ): AlertDelivery {
        $existing=
            AlertDelivery::query()
                ->where(
                    'alert_recipient_id',
                    $recipient->id
                )
                ->where(
                    'channel',
                    'in_app'
                )
                ->first();

        if($existing){
            return $existing;
        }

        try{
            $delivery=
                new AlertDelivery([
                    'alert_recipient_id'=>
                        $recipient->id,
                    'channel'=>'in_app',
                    'status'=>'delivered',
                    'attempts'=>0,
                    'provider'=>'frotapro',
                    'sent_at'=>now(),
                    'delivered_at'=>now(),
                ]);

            $delivery->tenant_id=
                $recipient->tenant_id;

            $delivery->save();

            return $delivery;
        }catch(
            UniqueConstraintViolationException
        ){
            return AlertDelivery::query()
                ->where(
                    'alert_recipient_id',
                    $recipient->id
                )
                ->where(
                    'channel',
                    'in_app'
                )
                ->firstOrFail();
        }
    }

    private function ensureEmail(
        AlertRecipient $recipient,
        int $delaySeconds=0
    ): AlertDelivery {
        $existing=
            AlertDelivery::query()
                ->where(
                    'alert_recipient_id',
                    $recipient->id
                )
                ->where(
                    'channel',
                    'email'
                )
                ->first();

        if($existing){
            return $existing;
        }

        $created=false;

        try{
            $delivery=
                new AlertDelivery([
                    'alert_recipient_id'=>
                        $recipient->id,
                    'channel'=>'email',
                    'status'=>'queued',
                    'attempts'=>0,
                    'provider'=>
                        config(
                            'mail.default'
                        ),
                    'queued_at'=>now(),
                ]);

            $delivery->tenant_id=
                $recipient->tenant_id;

            $delivery->save();

            $created=true;
        }catch(
            UniqueConstraintViolationException
        ){
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
        }

        if($created){
            $pending=
                SendAlertDelivery::dispatch(
                    $delivery->id
                );

            if($delaySeconds>0){
                $pending->delay(
                    now()->addSeconds(
                        $delaySeconds
                    )
                );
            }

            $pending->afterCommit();
        }

        return $delivery;
    }

    private function timezone(
        NotificationPreference $preference
    ): string {
        $timezone=
            $preference->timezone
            ?: config(
                'app.timezone',
                'Europe/Lisbon'
            );

        return in_array(
            $timezone,
            timezone_identifiers_list(),
            true
        )
            ? $timezone
            : config(
                'app.timezone',
                'Europe/Lisbon'
            );
    }

    private function timeValue(
        mixed $value
    ): ?string {
        if(blank($value)){
            return null;
        }

        return substr(
            (string)$value,
            0,
            5
        );
    }
}
