<?php

namespace App\Services;

use App\Models\NifLookupAttempt;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class NifPtUsageGuard
{
    private const MAX_EXTERNAL_PER_MINUTE = 1;

    private const MAX_EXTERNAL_PER_HOUR = 8;

    private const MAX_EXTERNAL_PER_DAY = 90;

    private const MAX_EXTERNAL_PER_30_DAYS = 900;

    public function lock(): Lock
    {
        return Cache::lock(
            'nif-pt-batch-processor',
            300
        );
    }

    public function blockReason(): ?string
    {
        $minute = $this->externalAttemptsSince(
            now()->subMinute()
        );

        if (
            $minute >=
            self::MAX_EXTERNAL_PER_MINUTE
        ) {
            return 'Já ocorreu uma consulta externa ao NIF.PT no último minuto.';
        }

        $hour = $this->externalAttemptsSince(
            now()->subHour()
        );

        if (
            $hour >=
            self::MAX_EXTERNAL_PER_HOUR
        ) {
            return sprintf(
                'Limite operacional horário NIF.PT atingido (%d/%d).',
                $hour,
                self::MAX_EXTERNAL_PER_HOUR
            );
        }

        $day = $this->externalAttemptsSince(
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

        $month = $this->externalAttemptsSince(
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
