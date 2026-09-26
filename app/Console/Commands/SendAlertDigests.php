<?php

namespace App\Console\Commands;

use App\Services\AlertDigestService;
use Illuminate\Console\Command;

class SendAlertDigests extends Command
{
    protected $signature=
        'alerts:digests
        {--force : Ignora o horário mínimo e quiet hours}';

    protected $description=
        'Cria e enfileira os resumos diários de alertas do FrotaPro';

    public function handle(
        AlertDigestService $service
    ): int {
        $result=
            $service->dispatchDue(
                (bool)$this->option(
                    'force'
                )
            );

        $this->info(
            "Digests em fila: {$result['queued']}; ignorados: {$result['skipped']}."
        );

        return self::SUCCESS;
    }
}
