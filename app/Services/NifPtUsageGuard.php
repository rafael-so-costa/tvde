<?php

namespace App\Services;

use App\Models\NifLookupAttempt;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class NifPtUsageGuard
{
    private const MIN_INTERVAL_MINUTES = 43;

    private const MAX_INTERVAL_MINUTES = 48;
    private const MAX_EXTERNAL_PER_DAY = 32;

    private const MAX_EXTERNAL_PER_30_DAYS = 950;

    public function lock(): Lock
    {
        return Cache::lock(
            'nif-pt-batch-processor',
            300
        );
    }

    public function scheduleStatus(): array
    {
        $lastAttempt =
            $this->latestExternalAttempt();

        if (! $lastAttempt) {
            return [
                'available_now' => true,
                'interval_minutes' => null,
                'minutes_remaining' => 0,
                'last_attempt_at' => null,
                'next_allowed_at' => null,
            ];
        }

        $interval =
            $this->intervalForAttempt(
                $lastAttempt->id
            );

        $nextAllowedAt =
            $lastAttempt
                ->requested_at
                ->copy()
                ->addMinutes(
                    $interval
                );

        $secondsRemaining =
            max(
                0,
                (int) now()->diffInSeconds(
                    $nextAllowedAt,
                    false
                )
            );

        $minutesRemaining =
            $secondsRemaining > 0
                ? (int) ceil(
                    $secondsRemaining / 60
                )
                : 0;

        return [
            'available_now' => $secondsRemaining === 0,
            'interval_minutes' => $interval,
            'minutes_remaining' => $minutesRemaining,
            'last_attempt_at' => $lastAttempt
                ->requested_at
                ->toIso8601String(),
            'next_allowed_at' => $nextAllowedAt
                ->toIso8601String(),
        ];
    }
    public function blockReason(): ?string
    {
        $schedule =
            $this->scheduleStatus();

        if (
            ! $schedule['available_now']
        ) {
            return sprintf(
                'Próxima consulta NIF.PT disponível às %s (%d min restantes; intervalo de %d min).',
                \Carbon\Carbon::parse(
                    $schedule['next_allowed_at']
                )->format('H:i'),
                $schedule['minutes_remaining'],
                $schedule['interval_minutes']
            );
        }

        $day =
            $this->externalAttemptsSince(
                now()->subDay()
            );

        if (
            $day >=
            self::MAX_EXTERNAL_PER_DAY
        ) {
            return sprintf(
                'Limite operacional de 24 horas NIF.PT atingido (%d/%d).',
                $day,
                self::MAX_EXTERNAL_PER_DAY
            );
        }

        $month =
            $this->externalAttemptsSince(
                now()->subDays(30)
            );

        if (
            $month >=
            self::MAX_EXTERNAL_PER_30_DAYS
        ) {
            return sprintf(
                'Limite operacional de 30 dias NIF.PT atingido (%d/%d).',
                $month,
                self::MAX_EXTERNAL_PER_30_DAYS
            );
        }

        return null;
    }

    private function latestExternalAttempt(): ?NifLookupAttempt
    {
        return NifLookupAttempt::query()
            ->where(
                function (
                    Builder $query
                ): void {
                    $query
                        ->whereNotNull(
                            'http_status'
                        )
                        ->orWhere(
                            'status',
                            NifLookupAttempt::STATUS_ERROR
                        );
                }
            )
            ->whereNotNull(
                'requested_at'
            )
            ->latest(
                'requested_at'
            )
            ->first();
    }

    private function intervalForAttempt(
        string $attemptId
    ): int {
        $range =
            self::MAX_INTERVAL_MINUTES -
            self::MIN_INTERVAL_MINUTES +
            1;

        $hash =
            sprintf(
                '%u',
                crc32(
                    $attemptId
                )
            );

        return
            self::MIN_INTERVAL_MINUTES +
            ((int) $hash % $range);
    }

    private function externalAttemptsSince(
        CarbonInterface $since
    ): int {
        return NifLookupAttempt::query()
            ->where(
                'requested_at',
                '>=',
                $since
            )
            ->where(
                function (
                    Builder $query
                ): void {
                    $query
                        ->whereNotNull(
                            'http_status'
                        )
                        ->orWhere(
                            'status',
                            NifLookupAttempt::STATUS_ERROR
                        );
                }
            )
            ->count();
    }
}