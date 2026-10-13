<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command(
    'inspire',
    function () {
        $this->comment(
            Inspiring::quote()
        );
    }
)->purpose(
    'Display an inspiring quote'
);

Schedule::command(
    'alerts:evaluate'
)
    ->hourly()
    ->withoutOverlapping(30);

Schedule::command(
    'alerts:digests'
)
    ->hourly()
    ->withoutOverlapping(30);

Schedule::command(
    'nif:batches:process'
)
    ->everyMinute()
    ->withoutOverlapping(15);

Schedule::command(
    'ads:sync-statuses'
)
    ->everyMinute()
    ->withoutOverlapping(5);
Schedule::command(
    'notifications:sync'
)
    ->everyMinute()
    ->withoutOverlapping(5);


Artisan::command(
    'notifications:sync',
    function () {
        $result =
            app(
                \App\Services\NotificationCenterService::class
            )->syncDue();

        $this->info(
            sprintf(
                'Notificações sincronizadas: plataforma=%d, central_ajuda=%d',
                $result['platform'],
                $result['help_center']
            )
        );
    }
)->purpose(
    'Sincroniza comunicações agendadas e conteúdos publicados.'
);

Artisan::command(
    'billing:ifthenpay-reconcile',
    function () {
        $result =
            app(
                \App\Services\Billing\IfthenpayReconciliationService::class
            )->reconcilePending();

        $this->info(
            sprintf(
                'Ifthenpay: verificadas=%d, confirmadas=%d, pendentes=%d, erros=%d',
                $result['checked'],
                $result['confirmed'],
                $result['pending'],
                $result['errors']
            )
        );
    }
)->purpose(
    'Reconcilia pagamentos Multibanco pendentes com a Ifthenpay.'
);

Schedule::command(
    'billing:ifthenpay-reconcile'
)
    ->everyTenMinutes()
    ->withoutOverlapping(10);