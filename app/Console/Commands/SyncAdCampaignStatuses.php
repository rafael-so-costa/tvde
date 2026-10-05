<?php

namespace App\Console\Commands;

use App\Services\Ads\AdCampaignService;
use Illuminate\Console\Command;

class SyncAdCampaignStatuses extends Command
{
    protected $signature = 'ads:sync-statuses';

    protected $description = 'Ativa campanhas Ads agendadas e encerra campanhas expiradas';

    public function handle(
        AdCampaignService $campaigns
    ): int {
        $result = $campaigns->syncAutomaticStatuses();

        $this->info(
            sprintf(
                'FrotaPro Ads: %d campanha(s) ativada(s), %d concluída(s).',
                $result['activated'],
                $result['completed']
            )
        );

        return self::SUCCESS;
    }
}
