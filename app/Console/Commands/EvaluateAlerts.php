<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\AlertEvaluationService;
use Illuminate\Console\Command;

class EvaluateAlerts extends Command
{
    protected $signature=
        'alerts:evaluate {--tenant=}';

    protected $description=
        'Avalia condições e sincroniza alertas do FrotaPro';

    public function handle(
        AlertEvaluationService $service
    ): int {
        $tenantOption=
            $this->option(
                'tenant'
            );

        $query=Tenant::query()
            ->where('ativo',true);

        if($tenantOption){
            $query->whereKey(
                $tenantOption
            );
        }

        $tenants=$query->get([
            'id',
            'nome',
        ]);

        if(
            $tenantOption &&
            $tenants->isEmpty()
        ){
            $this->error(
                'Tenant não encontrado ou inativo.'
            );

            return self::FAILURE;
        }

        foreach($tenants as $tenant){
            $result=
                $service->evaluateTenant(
                    $tenant->id
                );

            $this->line(
                "{$tenant->nome}: ".
                "{$result['active_conditions']} condições ativas, ".
                "{$result['resolved']} resolvidas."
            );
        }

        return self::SUCCESS;
    }
}
