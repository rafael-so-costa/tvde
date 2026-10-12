<?php

namespace App\Services\Billing;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasSubscription;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function __construct(
        private BillingProviderRegistry $providers
    ) {}

    public function createForSubscription(
        SaasSubscription $subscription
    ): BillingPayment {
        $charge =
            $this->subscriptionCharge(
                $subscription
            );

        return $this->createPayment(
            $charge,
            config(
                'billing.default_provider',
                'ifthenpay'
            ),
            BillingPayment::METHOD_MULTIBANCO
        );
    }

    public function createForAdOrder(
        AdOrder $order
    ): BillingPayment {
        $charge =
            $this->adOrderCharge(
                $order
            );

        return $this->createPayment(
            $charge,
            config(
                'billing.default_provider',
                'ifthenpay'
            ),
            BillingPayment::METHOD_MULTIBANCO
        );
    }

    public function subscriptionCharge(
        SaasSubscription $subscription
    ): BillingCharge {
        $subscription->loadMissing([
            'tenant',
            'plan',
        ]);

        $amount =
            $subscription->price_amount;

        if (
            $amount === null ||
            (float) $amount <= 0
        ) {
            throw ValidationException::withMessages([
                'price_amount' =>
                    'Defina um preço superior a zero antes de gerar a cobrança.',
            ]);
        }

        $periodStart =
            $subscription
                ->current_period_starts_at
                ?->copy()
            ?? now();

        $periodEnd =
            $subscription
                ->current_period_ends_at
                ?->copy()
            ?? $this->periodEnd(
                $periodStart,
                $subscription
                    ->billing_cycle
            );

        $idempotency =
            implode(
                ':',
                [
                    BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
                    $subscription->id,
                    $periodStart->format('YmdHis'),
                    $periodEnd->format('YmdHis'),
                ]
            );

        return BillingCharge::query()
            ->firstOrCreate(
                [
                    'idempotency_key' =>
                        $idempotency,
                ],
                [
                    'tenant_id' =>
                        $subscription
                            ->tenant_id,

                    'source_type' =>
                        BillingCharge::SOURCE_SAAS_SUBSCRIPTION,

                    'source_id' =>
                        $subscription
                            ->id,

                    'number' =>
                        $this->number(
                            'SAAS'
                        ),

                    'status' =>
                        BillingCharge::STATUS_PENDING,

                    'description' =>
                        sprintf(
                            'Plano %s — %s',
                            $subscription
                                ->plan
                                ?->nome
                                ?? 'FrotaPRO',

                            $subscription
                                ->billing_cycle ===
                                SaasSubscription::BILLING_YEARLY
                                    ? 'anual'
                                    : 'mensal'
                        ),

                    'period_start' =>
                        $periodStart,

                    'period_end' =>
                        $periodEnd,

                    'subtotal' =>
                        $amount,

                    'discount' =>
                        0,

                    'total' =>
                        $amount,

                    'currency' =>
                        $subscription
                            ->currency
                        ?: 'EUR',

                    'due_at' =>
                        now()->addDays(
                            (int) config(
                                'billing.payment_due_days',
                                7
                            )
                        ),

                    'metadata' => [
                        'plan_id' =>
                            $subscription
                                ->saas_plan_id,

                        'billing_cycle' =>
                            $subscription
                                ->billing_cycle,
                    ],
                ]
            );
    }

    public function adOrderCharge(
        AdOrder $order
    ): BillingCharge {
        if (
            (float) $order->total <= 0
        ) {
            throw ValidationException::withMessages([
                'total' =>
                    'O pedido publicitário não possui valor para cobrança.',
            ]);
        }

        return BillingCharge::query()
            ->firstOrCreate(
                [
                    'idempotency_key' =>
                        BillingCharge::SOURCE_AD_ORDER .
                        ':' .
                        $order->id,
                ],
                [
                    'tenant_id' =>
                        $order->tenant_id,

                    'source_type' =>
                        BillingCharge::SOURCE_AD_ORDER,

                    'source_id' =>
                        $order->id,

                    'number' =>
                        $this->number(
                            'ADS'
                        ),

                    'status' =>
                        $order->status ===
                        AdOrder::STATUS_PAID
                            ? BillingCharge::STATUS_PAID
                            : BillingCharge::STATUS_PENDING,

                    'description' =>
                        'FrotaPRO Ads — ' .
                        $order->number,

                    'subtotal' =>
                        $order->subtotal,

                    'discount' =>
                        $order->discount,

                    'total' =>
                        $order->total,

                    'currency' =>
                        $order->currency
                        ?: 'EUR',

                    'due_at' =>
                        $order->due_at
                        ?? now()->addDays(
                            (int) config(
                                'billing.payment_due_days',
                                7
                            )
                        ),

                    'paid_at' =>
                        $order->paid_at,

                    'metadata' => [
                        'ad_order_number' =>
                            $order->number,

                        'campaign_id' =>
                            $order->campaign_id,

                        'advertiser_id' =>
                            $order->advertiser_id,
                    ],
                ]
            );
    }

    public function createPayment(
        BillingCharge $charge,
        string $provider,
        string $method
    ): BillingPayment {
        if (
            $charge->status ===
            BillingCharge::STATUS_PAID
        ) {
            throw ValidationException::withMessages([
                'charge' =>
                    'Esta cobrança já se encontra paga.',
            ]);
        }

        $existing =
            BillingPayment::query()
                ->where(
                    'billing_charge_id',
                    $charge->id
                )
                ->where(
                    'provider',
                    $provider
                )
                ->where(
                    'method',
                    $method
                )
                ->where(
                    'status',
                    BillingPayment::STATUS_PENDING
                )
                ->latest()
                ->first();

        if ($existing) {
            return $existing
                ->load('charge');
        }

        $adapter =
            $this->providers
                ->get(
                    $provider
                );

        $result =
            $adapter
                ->createPayment(
                    $charge,
                    $method
                );

        $payment =
            BillingPayment::create([
                'billing_charge_id' =>
                    $charge->id,

                'provider' =>
                    $provider,

                'method' =>
                    $method,

                'status' =>
                    $result->status,

                'amount' =>
                    $charge->total,

                'currency' =>
                    $charge->currency,

                'external_id' =>
                    $result->externalId,

                'provider_reference' =>
                    $result
                        ->providerReference,

                'entity' =>
                    $result->entity,

                'reference' =>
                    $result->reference,

                'expires_at' =>
                    $result->expiresAt,

                'metadata' =>
                    $result->metadata,
            ]);

        return $payment
            ->load('charge');
    }

    public function simulatePaid(
        BillingPayment $payment
    ): BillingPayment {
        $payment->loadMissing(
            'charge'
        );

        $mock =
            (bool) data_get(
                $payment->metadata,
                'mock',
                false
            );

        if (
            ! config(
                'billing.providers.ifthenpay.sandbox',
                true
            ) ||
            ! $mock
        ) {
            throw ValidationException::withMessages([
                'payment' =>
                    'A simulação apenas está disponível para pagamentos MOCK em sandbox.',
            ]);
        }

        if (
            $payment->status ===
            BillingPayment::STATUS_PAID
        ) {
            return $payment;
        }

        return DB::transaction(
            function () use (
                $payment
            ): BillingPayment {
                $now =
                    now();

                $payment->status =
                    BillingPayment::STATUS_PAID;

                $payment->paid_at =
                    $now;

                $payment->save();

                $charge =
                    $payment->charge;

                $charge->status =
                    BillingCharge::STATUS_PAID;

                $charge->paid_at =
                    $now;

                $charge->save();

                $this->applyPaidCharge(
                    $charge,
                    $payment,
                    $now
                );

                return $payment
                    ->refresh()
                    ->load('charge');
            }
        );
    }

    private function applyPaidCharge(
        BillingCharge $charge,
        BillingPayment $payment,
        CarbonInterface $paidAt
    ): void {
        if (
            $charge->source_type ===
            BillingCharge::SOURCE_SAAS_SUBSCRIPTION
        ) {
            $subscription =
                SaasSubscription::query()
                    ->find(
                        $charge->source_id
                    );

            if ($subscription) {
                $subscription->status =
                    SaasSubscription::STATUS_ACTIVE;

                $subscription->save();
            }

            return;
        }

        if (
            $charge->source_type ===
            BillingCharge::SOURCE_AD_ORDER
        ) {
            $order =
                AdOrder::query()
                    ->find(
                        $charge->source_id
                    );

            if (! $order) {
                return;
            }

            $order->status =
                AdOrder::STATUS_PAID;

            $order->paid_at =
                $paidAt;

            $order->save();

            $order->payments()
                ->updateOrCreate(
                    [
                        'provider' =>
                            $payment->provider,

                        'provider_reference' =>
                            $payment
                                ->provider_reference,
                    ],
                    [
                        'status' =>
                            'paid',

                        'amount' =>
                            $payment->amount,

                        'currency' =>
                            $payment->currency,

                        'paid_at' =>
                            $paidAt,

                        'metadata' => [
                            'billing_payment_id' =>
                                $payment->id,

                            'mock' =>
                                (bool) data_get(
                                    $payment->metadata,
                                    'mock',
                                    false
                                ),
                        ],
                    ]
                );

            if ($order->campaign_id) {
                $order
                    ->campaign()
                    ->update([
                        'payment_status' =>
                            'paid',
                    ]);
            }
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

    private function number(
        string $prefix
    ): string {
        return sprintf(
            '%s-%s-%s',
            $prefix,
            now()->format('Ym'),
            Str::upper(
                substr(
                    (string) Str::ulid(),
                    -8
                )
            )
        );
    }
}