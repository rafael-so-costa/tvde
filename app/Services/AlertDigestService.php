<?php

namespace App\Services;

use App\Jobs\SendAlertDigest;
use App\Models\AlertDigestRun;
use App\Models\AlertRecipient;
use App\Models\NotificationPreference;
use App\Models\TenantUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;

class AlertDigestService
{
    private const DEFAULT_HOUR=8;

    private const SEVERITIES=[
        'low'=>0,
        'medium'=>1,
        'high'=>2,
        'critical'=>3,
    ];

    public function dispatchDue(
        bool $force=false
    ): array {
        $preferences=
            NotificationPreference::query()
                ->where(
                    'channel',
                    'email'
                )
                ->with(
                    'user:id,email,ativo'
                )
                ->get()
                ->groupBy(
                    fn(
                        NotificationPreference $preference
                    )=>
                        $preference->tenant_id.
                        '|'.
                        $preference->user_id
                );

        $queued=0;
        $skipped=0;

        foreach(
            $preferences
            as $group
        ){
            if(
                !$group
                    ->contains(
                        fn(
                            NotificationPreference $preference
                        )=>
                            $preference->enabled &&
                            $preference
                                ->delivery_mode===
                            'daily_digest'
                    )
            ){
                continue;
            }

            /** @var NotificationPreference $first */
            $first=$group->first();

            $user=$first->user;

            if(
                !$user ||
                !$user->ativo ||
                blank($user->email)
            ){
                $skipped++;
                continue;
            }

            $membership=
                TenantUser::query()
                    ->where(
                        'tenant_id',
                        $first->tenant_id
                    )
                    ->where(
                        'user_id',
                        $first->user_id
                    )
                    ->where(
                        'status',
                        'ativo'
                    )
                    ->exists();

            if(!$membership){
                $skipped++;
                continue;
            }

            $primary=
                $this->primaryPreference(
                    $group
                );

            $timezone=
                $this->timezone(
                    $primary
                );

            $localNow=
                CarbonImmutable::now(
                    $timezone
                );

            if(
                !$force &&
                $localNow->hour<
                    self::DEFAULT_HOUR
            ){
                continue;
            }

            if(
                !$force &&
                $this->quietHoursActive(
                    $primary,
                    $localNow
                )
            ){
                continue;
            }

            $digestDate=
                $localNow
                    ->toDateString();

            if(
                AlertDigestRun::query()
                    ->where(
                        'tenant_id',
                        $first->tenant_id
                    )
                    ->where(
                        'user_id',
                        $first->user_id
                    )
                    ->where(
                        'channel',
                        'email'
                    )
                    ->whereDate(
                        'digest_date',
                        $digestDate
                    )
                    ->exists()
            ){
                continue;
            }

            $recipients=
                $this->eligibleRecipients(
                    $first->tenant_id,
                    $first->user_id,
                    $group
                );

            if($recipients->isEmpty()){
                continue;
            }

            try{
                $run=
                    new AlertDigestRun([
                        'channel'=>'email',
                        'digest_date'=>
                            $digestDate,
                        'timezone'=>
                            $timezone,
                        'status'=>'queued',
                        'alert_count'=>
                            $recipients->count(),
                        'alert_recipient_ids'=>
                            $recipients
                                ->pluck('id')
                                ->values()
                                ->all(),
                        'attempts'=>0,
                        'provider'=>
                            config(
                                'mail.default'
                            ),
                        'queued_at'=>now(),
                        'metadata'=>[
                            'default_hour'=>
                                self::DEFAULT_HOUR,
                        ],
                    ]);

                $run->tenant_id=
                    $first->tenant_id;

                $run->user_id=
                    $first->user_id;

                $run->save();
            }catch(
                UniqueConstraintViolationException
            ){
                continue;
            }

            SendAlertDigest::dispatch(
                $run->id
            )->afterCommit();

            $queued++;
        }

        return [
            'queued'=>$queued,
            'skipped'=>$skipped,
        ];
    }

    public function recipientsForRun(
        AlertDigestRun $run
    ): EloquentCollection {
        $preferences=
            NotificationPreference::query()
                ->where(
                    'tenant_id',
                    $run->tenant_id
                )
                ->where(
                    'user_id',
                    $run->user_id
                )
                ->where(
                    'channel',
                    'email'
                )
                ->get();

        $ids=
            collect(
                $run->alert_recipient_ids
                ?? []
            )
                ->filter()
                ->values()
                ->all();

        if($ids===[]){
            return new EloquentCollection();
        }

        return AlertRecipient::query()
            ->whereIn(
                'id',
                $ids
            )
            ->where(
                'tenant_id',
                $run->tenant_id
            )
            ->where(
                'user_id',
                $run->user_id
            )
            ->where(
                'active',
                true
            )
            ->where(
                function($query){
                    $query
                        ->whereNull(
                            'snoozed_until'
                        )
                        ->orWhere(
                            'snoozed_until',
                            '<=',
                            now()
                        );
                }
            )
            ->whereHas(
                'alert',
                fn($query)=>
                    $query->where(
                        'status',
                        'open'
                    )
            )
            ->with([
                'alert.rule',
            ])
            ->get()
            ->filter(
                fn(
                    AlertRecipient $recipient
                )=>
                    $this->eligibleForDigest(
                        $recipient,
                        $preferences
                    )
            )
            ->values();
    }

    private function eligibleRecipients(
        string $tenantId,
        string $userId,
        Collection $preferences
    ): EloquentCollection {
        return AlertRecipient::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $userId
            )
            ->where(
                'active',
                true
            )
            ->where(
                function($query){
                    $query
                        ->whereNull(
                            'snoozed_until'
                        )
                        ->orWhere(
                            'snoozed_until',
                            '<=',
                            now()
                        );
                }
            )
            ->whereHas(
                'alert',
                fn($query)=>
                    $query->where(
                        'status',
                        'open'
                    )
            )
            ->with([
                'alert.rule',
            ])
            ->get()
            ->filter(
                fn(
                    AlertRecipient $recipient
                )=>
                    $this->eligibleForDigest(
                        $recipient,
                        $preferences
                    )
            )
            ->sortBy(
                fn(
                    AlertRecipient $recipient
                )=>
                    match(
                        $recipient
                            ->alert
                            ->severity
                    ){
                        'critical'=>0,
                        'high'=>1,
                        'medium'=>2,
                        default=>3,
                    }
            )
            ->values();
    }

    private function eligibleForDigest(
        AlertRecipient $recipient,
        Collection $preferences
    ): bool {
        $alert=$recipient->alert;

        if(!$alert){
            return false;
        }

        $channels=
            $alert->rule
                ?->channels
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
            $this
                ->effectivePreference(
                    $preferences,
                    $alert->category
                );

        if(
            !$preference ||
            !$preference->enabled ||
            $preference
                ->delivery_mode!==
            'daily_digest'
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

    private function effectivePreference(
        Collection $preferences,
        string $category
    ): ?NotificationPreference {
        return $preferences
            ->firstWhere(
                'category',
                $category
            )
            ?? $preferences
                ->firstWhere(
                    'category',
                    '*'
                );
    }

    private function primaryPreference(
        Collection $preferences
    ): NotificationPreference {
        return $preferences
            ->firstWhere(
                'category',
                '*'
            )
            ?? $preferences
                ->first(
                    fn(
                        NotificationPreference $preference
                    )=>
                        $preference->enabled &&
                        $preference
                            ->delivery_mode===
                        'daily_digest'
                )
            ?? $preferences->first();
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

    private function quietHoursActive(
        NotificationPreference $preference,
        CarbonImmutable $now
    ): bool {
        $start=$this->timeValue(
            $preference
                ->quiet_hours_start
        );

        $end=$this->timeValue(
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

        $current=
            $now->format('H:i');

        if($start<$end){
            return
                $current>=$start &&
                $current<$end;
        }

        return
            $current>=$start ||
            $current<$end;
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
