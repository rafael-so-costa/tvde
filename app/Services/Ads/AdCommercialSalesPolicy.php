<?php

declare(strict_types=1);

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdSetting;
use Illuminate\Validation\ValidationException;

final class AdCommercialSalesPolicy
{
    public function enabled(): bool
    {
        $setting = AdSetting::query()
            ->where('scope', 'global')
            ->first();

        // Preserva o funcionamento anterior caso ainda
        // não exista registo global de configurações.
        return $setting === null
            ? true
            : (bool) $setting->commercial_ads_enabled;
    }

    public function assertCanCreate(array $data): void
    {
        $commercial =
            ($data['kind'] ?? null) ===
                AdCampaign::KIND_COMMERCIAL ||
            (bool) ($data['payment_required'] ?? false);

        if ($commercial && !$this->enabled()) {
            $this->reject();
        }
    }

    public function assertCanUpdate(
        AdCampaign $campaign,
        array $data
    ): void {
        if ($this->enabled()) {
            return;
        }

        $oldCommercial =
            $campaign->kind === AdCampaign::KIND_COMMERCIAL;

        $newCommercial =
            ($data['kind'] ?? $campaign->kind) ===
                AdCampaign::KIND_COMMERCIAL;

        $oldPaid = (bool) $campaign->payment_required;

        $newPaid = (bool) (
            $data['payment_required'] ??
            $campaign->payment_required
        );

        if (
            ($newCommercial && !$oldCommercial) ||
            ($newPaid && !$oldPaid)
        ) {
            $this->reject();
        }
    }

    public function assertCanCreateOrder(
        AdCampaign $campaign
    ): void {
        /*
         * Esta campanha ja foi criada.
         *
         * Suspender novas vendas impede criar campanhas
         * comerciais, mas nao deve cancelar a contratacao
         * que ja estava em curso antes da suspensao.
         *
         * O bloqueio de novas entradas e aplicado
         * por assertCanCreate().
         */
        if (!$campaign->exists) {
            $this->reject();
        }
    }

    private function reject(): never
    {
        throw ValidationException::withMessages([
            'commercial_ads_enabled' =>
                'A contratação de novos anúncios comerciais está temporariamente desativada.',
        ]);
    }
}