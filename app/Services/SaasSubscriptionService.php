<?php

namespace App\Services;

use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

class SaasSubscriptionService
{
    public function ensureForTenant(
        Tenant $tenant,
        SaasPlan $plan
    ): SaasSubscription {
        $subscription =
            SaasSubscription::query()
                ->firstOrNew([
                    'tenant_id' => $tenant->id,
                ]);

        if (! $subscription->exists) {
            $subscription->fill([
                'saas_plan_id' => $plan->id,

                'status' => SaasSubscription::STATUS_ACTIVE,

                'billing_cycle' => SaasSubscription::BILLING_MONTHLY,

                'price_amount' => null,

                'currency' => 'EUR',

                'starts_at' => now(),

                'current_period_starts_at' => now(),

                'current_period_ends_at' => now()->addMonth(),
            ]);

            $subscription->save();
        }

        return $subscription
            ->refresh()
            ->load(
                'plan'
            );
    }

    public function changePlan(
        Tenant $tenant,
        SaasPlan $plan
    ): SaasSubscription {
        return DB::transaction(
            function () use (
                $tenant,
                $plan
            ): SaasSubscription {
                $tenant->saas_plan_id =
                    $plan->id;

                $tenant->save();

                $subscription =
                    SaasSubscription::query()
                        ->firstOrNew([
                            'tenant_id' => $tenant->id,
                        ]);

                if (! $subscription->exists) {
                    $subscription->fill([
                        'status' => SaasSubscription::STATUS_ACTIVE,

                        'billing_cycle' => SaasSubscription::BILLING_MONTHLY,

                        'price_amount' => null,

                        'currency' => 'EUR',

                        'starts_at' => now(),

                        'current_period_starts_at' => now(),

                        'current_period_ends_at' => now()->addMonth(),
                    ]);
                }

                $subscription->saas_plan_id =
                    $plan->id;

                $subscription->save();

                return $subscription
                    ->refresh()
                    ->load(
                        'plan'
                    );
            }
        );
    }
}
