<?php

namespace App\Services;

use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            $now = now();

            $subscription->fill([
                'saas_plan_id' => $plan->id,

                'status' => SaasSubscription::STATUS_ACTIVE,

                'billing_cycle' => SaasSubscription::BILLING_MONTHLY,

                'price_amount' => null,

                'currency' => 'EUR',

                'starts_at' => $now,

                'current_period_starts_at' => $now,

                'current_period_ends_at' => $now
                    ->copy()
                    ->addMonth(),
            ]);

            $subscription->save();
        }

        return $subscription
            ->refresh()
            ->load([
                'plan',
                'tenant',
            ]);
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
                    $now = now();

                    $subscription->fill([
                        'status' => SaasSubscription::STATUS_ACTIVE,

                        'billing_cycle' => SaasSubscription::BILLING_MONTHLY,

                        'price_amount' => null,

                        'currency' => 'EUR',

                        'starts_at' => $now,

                        'current_period_starts_at' => $now,

                        'current_period_ends_at' => $now
                            ->copy()
                            ->addMonth(),
                    ]);
                }

                $subscription->saas_plan_id =
                    $plan->id;

                $subscription->save();

                return $subscription
                    ->refresh()
                    ->load([
                        'plan',
                        'tenant',
                    ]);
            }
        );
    }

    public function updateTerms(
        SaasSubscription $subscription,
        array $data
    ): SaasSubscription {
        return DB::transaction(
            function () use (
                $subscription,
                $data
            ): SaasSubscription {
                $previousCycle =
                    $subscription->billing_cycle;

                $subscription->billing_cycle =
                    $data['billing_cycle'];

                $subscription->price_amount =
                    $data['price_amount'];

                $subscription->currency =
                    $data['currency'];

                if (
                    $previousCycle !==
                        $subscription->billing_cycle &&
                    $subscription
                        ->current_period_starts_at
                ) {
                    $newPeriodEnd =
                        $this->periodEnd(
                            $subscription
                                ->current_period_starts_at,
                            $subscription
                                ->billing_cycle
                        );

                    $subscription
                        ->current_period_ends_at =
                        $newPeriodEnd;

                    if (
                        $subscription
                            ->cancels_at !==
                        null
                    ) {
                        $subscription
                            ->cancels_at =
                            $newPeriodEnd;
                    }
                }

                $subscription->save();

                return $subscription
                    ->refresh()
                    ->load([
                        'tenant',
                        'plan',
                    ]);
            }
        );
    }

    public function applyAction(
        SaasSubscription $subscription,
        string $action,
        ?int $trialDays = null
    ): SaasSubscription {
        return DB::transaction(
            function () use (
                $subscription,
                $action,
                $trialDays
            ): SaasSubscription {
                match ($action) {
                    'suspend' => $this->suspend(
                        $subscription
                    ),

                    'reactivate' => $this->reactivate(
                        $subscription
                    ),

                    'schedule_cancel' => $this->scheduleCancel(
                        $subscription
                    ),

                    'clear_cancel' => $this->clearCancel(
                        $subscription
                    ),

                    'cancel_now' => $this->cancelNow(
                        $subscription
                    ),

                    'start_trial' => $this->startTrial(
                        $subscription,
                        $trialDays
                            ?? 0
                    ),

                    'end_trial' => $this->endTrial(
                        $subscription
                    ),

                    default => throw ValidationException::withMessages([
                        'action' => 'A ação indicada não é válida.',
                    ]),
                };

                $subscription->save();

                return $subscription
                    ->refresh()
                    ->load([
                        'tenant',
                        'plan',
                    ]);
            }
        );
    }

    private function suspend(
        SaasSubscription $subscription
    ): void {
        $this->guardNotCanceled(
            $subscription
        );

        $subscription->status =
            SaasSubscription::STATUS_SUSPENDED;
    }

    private function reactivate(
        SaasSubscription $subscription
    ): void {
        $now = now();

        $subscription->status =
            SaasSubscription::STATUS_ACTIVE;

        $subscription->cancels_at =
            null;

        $subscription->canceled_at =
            null;

        $subscription->trial_ends_at =
            null;

        if (
            ! $subscription
                ->current_period_ends_at ||
            $subscription
                ->current_period_ends_at
                ->lte(
                    $now
                )
        ) {
            $subscription
                ->current_period_starts_at =
                $now;

            $subscription
                ->current_period_ends_at =
                $this->periodEnd(
                    $now,
                    $subscription
                        ->billing_cycle
                );
        }
    }

    private function scheduleCancel(
        SaasSubscription $subscription
    ): void {
        $this->guardNotCanceled(
            $subscription
        );

        if (
            ! $subscription
                ->current_period_ends_at
        ) {
            $now = now();

            $subscription
                ->current_period_starts_at =
                $now;

            $subscription
                ->current_period_ends_at =
                $this->periodEnd(
                    $now,
                    $subscription
                        ->billing_cycle
                );
        }

        $subscription->cancels_at =
            $subscription
                ->current_period_ends_at;
    }

    private function clearCancel(
        SaasSubscription $subscription
    ): void {
        $this->guardNotCanceled(
            $subscription
        );

        $subscription->cancels_at =
            null;
    }

    private function cancelNow(
        SaasSubscription $subscription
    ): void {
        $subscription->status =
            SaasSubscription::STATUS_CANCELED;

        $subscription->canceled_at =
            now();

        $subscription->cancels_at =
            null;

        $subscription->trial_ends_at =
            null;
    }

    private function startTrial(
        SaasSubscription $subscription,
        int $days
    ): void {
        $this->guardNotCanceled(
            $subscription
        );

        if ($days < 1) {
            throw ValidationException::withMessages([
                'trial_days' => 'A duração do trial deve ser superior a zero.',
            ]);
        }

        $subscription->status =
            SaasSubscription::STATUS_TRIALING;

        $subscription->trial_ends_at =
            now()->addDays(
                $days
            );

        $subscription->cancels_at =
            null;
    }

    private function endTrial(
        SaasSubscription $subscription
    ): void {
        if (
            $subscription->status !==
            SaasSubscription::STATUS_TRIALING
        ) {
            throw ValidationException::withMessages([
                'action' => 'Esta assinatura não está em período experimental.',
            ]);
        }

        $subscription->status =
            SaasSubscription::STATUS_ACTIVE;

        $subscription->trial_ends_at =
            null;
    }

    private function guardNotCanceled(
        SaasSubscription $subscription
    ): void {
        if (
            $subscription->status ===
            SaasSubscription::STATUS_CANCELED
        ) {
            throw ValidationException::withMessages([
                'action' => 'A assinatura cancelada deve ser reativada antes desta operação.',
            ]);
        }
    }

    private function periodEnd(
        CarbonInterface $start,
        string $billingCycle
    ): CarbonInterface {
        return $billingCycle ===
            SaasSubscription::BILLING_YEARLY
                ? $start
                    ->copy()
                    ->addYear()
                : $start
                    ->copy()
                    ->addMonth();
    }
}
