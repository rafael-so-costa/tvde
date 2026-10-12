<?php

namespace App\Http\Controllers;

use App\Models\AdOrder;
use App\Models\SaasSubscription;
use Illuminate\Http\JsonResponse;

class BackofficeBillingController extends Controller
{
    public function show(): JsonResponse
    {
        $subscriptions =
            SaasSubscription::query()
                ->with([
                    'tenant:id,nome',
                    'plan:id,codigo,nome',
                ]);

        $activeSubscriptions =
            (clone $subscriptions)
                ->where(
                    'status',
                    SaasSubscription::STATUS_ACTIVE
                )
                ->get();

        $mrr =
            $activeSubscriptions
                ->sum(
                    function (
                        SaasSubscription $subscription
                    ): float {
                        $amount =
                            (float) (
                                $subscription->price_amount
                                ?? 0
                            );

                        if (
                            $subscription->billing_cycle ===
                            SaasSubscription::BILLING_YEARLY
                        ) {
                            return $amount / 12;
                        }

                        return $amount;
                    }
                );

        $recentSubscriptions =
            (clone $subscriptions)
                ->latest(
                    'updated_at'
                )
                ->limit(8)
                ->get()
                ->map(
                    fn (
                        SaasSubscription $subscription
                    ): array => [
                        'id' =>
                            $subscription->id,

                        'status' =>
                            $subscription->status,

                        'billing_cycle' =>
                            $subscription->billing_cycle,

                        'price_amount' =>
                            $subscription->price_amount === null
                                ? null
                                : (float) $subscription->price_amount,

                        'currency' =>
                            $subscription->currency,

                        'tenant' =>
                            $subscription->tenant
                                ? [
                                    'id' =>
                                        $subscription
                                            ->tenant
                                            ->id,

                                    'nome' =>
                                        $subscription
                                            ->tenant
                                            ->nome,
                                ]
                                : null,

                        'plan' =>
                            $subscription->plan
                                ? [
                                    'id' =>
                                        $subscription
                                            ->plan
                                            ->id,

                                    'codigo' =>
                                        $subscription
                                            ->plan
                                            ->codigo,

                                    'nome' =>
                                        $subscription
                                            ->plan
                                            ->nome,
                                ]
                                : null,

                        'updated_at' =>
                            $subscription->updated_at,
                    ]
                )
                ->values();

        $pendingAds =
            AdOrder::query()
                ->where(
                    'status',
                    AdOrder::STATUS_PENDING
                );

        $paidAdsLast30Days =
            AdOrder::query()
                ->where(
                    'status',
                    AdOrder::STATUS_PAID
                )
                ->where(
                    'paid_at',
                    '>=',
                    now()->subDays(30)
                );

        $recentAdOrders =
            AdOrder::query()
                ->with([
                    'campaign:id,name,title,status',
                    'advertiser:id,name,type',
                    'tenant:id,nome',
                    'payments' => function ($query): void {
                        $query
                            ->latest(
                                'created_at'
                            );
                    },
                ])
                ->latest(
                    'created_at'
                )
                ->limit(8)
                ->get()
                ->map(
                    fn (
                        AdOrder $order
                    ): array => [
                        'id' =>
                            $order->id,

                        'number' =>
                            $order->number,

                        'status' =>
                            $order->status,

                        'total' =>
                            (float) $order->total,

                        'currency' =>
                            $order->currency,

                        'due_at' =>
                            $order->due_at,

                        'paid_at' =>
                            $order->paid_at,

                        'campaign' =>
                            $order->campaign
                                ? [
                                    'id' =>
                                        $order
                                            ->campaign
                                            ->id,

                                    'name' =>
                                        $order
                                            ->campaign
                                            ->name,
                                ]
                                : null,

                        'advertiser' =>
                            $order->advertiser
                                ? [
                                    'id' =>
                                        $order
                                            ->advertiser
                                            ->id,

                                    'name' =>
                                        $order
                                            ->advertiser
                                            ->name,
                                ]
                                : null,

                        'payment' =>
                            $order
                                ->payments
                                ->first()
                                ? [
                                    'provider' =>
                                        $order
                                            ->payments
                                            ->first()
                                            ->provider,

                                    'status' =>
                                        $order
                                            ->payments
                                            ->first()
                                            ->status,

                                    'reference' =>
                                        $order
                                            ->payments
                                            ->first()
                                            ->provider_reference,
                                ]
                                : null,

                        'created_at' =>
                            $order->created_at,
                    ]
                )
                ->values();

        $ifthenpay =
            config(
                'billing.providers.ifthenpay',
                []
            );

        $mbReady =
            filled(
                $ifthenpay['mb_key']
                ?? null
            );

        $reconciliationReady =
            filled(
                $ifthenpay['backoffice_key']
                ?? null
            );

        $callbackReady =
            filled(
                $ifthenpay['callback_key']
                ?? null
            );

        return response()->json([
            'data' => [
                'metrics' => [
                    'mrr' =>
                        round(
                            $mrr,
                            2
                        ),

                    'subscriptions_active' =>
                        $activeSubscriptions
                            ->count(),

                    'subscriptions_trialing' =>
                        SaasSubscription::query()
                            ->where(
                                'status',
                                SaasSubscription::STATUS_TRIALING
                            )
                            ->count(),

                    'subscriptions_past_due' =>
                        SaasSubscription::query()
                            ->where(
                                'status',
                                SaasSubscription::STATUS_PAST_DUE
                            )
                            ->count(),

                    'ads_pending_count' =>
                        (clone $pendingAds)
                            ->count(),

                    'ads_pending_amount' =>
                        (float) (
                            (clone $pendingAds)
                                ->sum('total')
                        ),

                    'ads_paid_30_days_count' =>
                        (clone $paidAdsLast30Days)
                            ->count(),

                    'ads_paid_30_days_amount' =>
                        (float) (
                            (clone $paidAdsLast30Days)
                                ->sum('total')
                        ),
                ],

                'provider' => [
                    'default' =>
                        config(
                            'billing.default_provider',
                            'ifthenpay'
                        ),

                    'ifthenpay' => [
                        'enabled' =>
                            (bool) (
                                $ifthenpay['enabled']
                                ?? false
                            ),

                        'sandbox' =>
                            (bool) (
                                $ifthenpay['sandbox']
                                ?? true
                            ),

                        'configured' =>
                            $mbReady &&
                            $reconciliationReady &&
                            $callbackReady,

                        'multibanco_ready' =>
                            $mbReady,

                        'reconciliation_ready' =>
                            $reconciliationReady,

                        'callback_ready' =>
                            $callbackReady,

                        'mbway_ready' =>
                            filled(
                                $ifthenpay['mbway_key']
                                ?? null
                            ),

                        'direct_debit_ready' =>
                            filled(
                                $ifthenpay['direct_debit_key']
                                ?? null
                            ),
                    ],
                ],

                'recent_subscriptions' =>
                    $recentSubscriptions,

                'recent_ad_orders' =>
                    $recentAdOrders,
            ],
        ]);
    }
}