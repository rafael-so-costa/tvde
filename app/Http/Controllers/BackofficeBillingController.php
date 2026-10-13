<?php

namespace App\Http\Controllers;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeBillingController extends Controller
{
    public function orders(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'q' =>
                    ['nullable', 'string', 'max:100'],

                'source_type' => [
                    'nullable',
                    'in:saas_subscription,ad_order',
                ],

                'charge_status' => [
                    'nullable',
                    'in:pending,paid,canceled,expired,refunded',
                ],

                'payment_status' => [
                    'nullable',
                    'in:pending,paid,failed,expired,canceled,refunded,none',
                ],

                'provider' =>
                    ['nullable', 'string', 'max:50'],

                'method' =>
                    ['nullable', 'string', 'max:50'],

                'due' => [
                    'nullable',
                    'in:overdue,upcoming',
                ],

                'date_from' =>
                    ['nullable', 'date'],

                'date_to' => [
                    'nullable',
                    'date',
                    'after_or_equal:date_from',
                ],

                'per_page' => [
                    'nullable',
                    'integer',
                    'in:15,25,50,100',
                ],
            ]);

        $query =
            BillingCharge::query()
                ->with([
                    'tenant:id,nome,nif,email',
                    'latestPayment',
                ]);

        if (
            filled(
                $validated['q']
                ?? null
            )
        ) {
            $search =
                trim(
                    $validated['q']
                );

            $query->where(
                function ($query) use ($search): void {
                    $query
                        ->where(
                            'number',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'description',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'tenant',
                            function ($query) use ($search): void {
                                $query
                                    ->where(
                                        'nome',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'nif',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'email',
                                        'like',
                                        "%{$search}%"
                                    );
                            }
                        )
                        ->orWhereHas(
                            'payments',
                            function ($query) use ($search): void {
                                $query
                                    ->where(
                                        'reference',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'provider_reference',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'external_id',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'entity',
                                        'like',
                                        "%{$search}%"
                                    );
                            }
                        );
                }
            );
        }

        if (
            filled(
                $validated['source_type']
                ?? null
            )
        ) {
            $query->where(
                'source_type',
                $validated['source_type']
            );
        }

        if (
            filled(
                $validated['charge_status']
                ?? null
            )
        ) {
            $query->where(
                'status',
                $validated['charge_status']
            );
        }

        if (
            filled(
                $validated['payment_status']
                ?? null
            )
        ) {
            if (
                $validated['payment_status'] ===
                'none'
            ) {
                $query->whereDoesntHave(
                    'payments'
                );
            } else {
                $query->whereHas(
                    'latestPayment',
                    function ($query) use ($validated): void {
                        $query->where(
                            'status',
                            $validated[
                                'payment_status'
                            ]
                        );
                    }
                );
            }
        }

        foreach (
            [
                'provider',
                'method',
            ] as $paymentFilter
        ) {
            if (
                filled(
                    $validated[$paymentFilter]
                    ?? null
                )
            ) {
                $query->whereHas(
                    'latestPayment',
                    function ($query) use (
                        $paymentFilter,
                        $validated
                    ): void {
                        $query->where(
                            $paymentFilter,
                            $validated[
                                $paymentFilter
                            ]
                        );
                    }
                );
            }
        }

        if (
            ($validated['due'] ?? null) ===
            'overdue'
        ) {
            $query
                ->where(
                    'status',
                    BillingCharge::STATUS_PENDING
                )
                ->whereNotNull(
                    'due_at'
                )
                ->where(
                    'due_at',
                    '<',
                    now()
                );
        }

        if (
            ($validated['due'] ?? null) ===
            'upcoming'
        ) {
            $query
                ->where(
                    'status',
                    BillingCharge::STATUS_PENDING
                )
                ->whereNotNull(
                    'due_at'
                )
                ->where(
                    'due_at',
                    '>=',
                    now()
                );
        }

        if (
            filled(
                $validated['date_from']
                ?? null
            )
        ) {
            $query->whereDate(
                'created_at',
                '>=',
                $validated['date_from']
            );
        }

        if (
            filled(
                $validated['date_to']
                ?? null
            )
        ) {
            $query->whereDate(
                'created_at',
                '<=',
                $validated['date_to']
            );
        }

        $paginator =
            $query
                ->latest(
                    'created_at'
                )
                ->paginate(
                    (int) (
                        $validated['per_page']
                        ?? 25
                    )
                );

        $items =
            $paginator
                ->getCollection();

        $subscriptions =
            SaasSubscription::query()
                ->with(
                    'plan:id,codigo,nome'
                )
                ->whereIn(
                    'id',
                    $items
                        ->where(
                            'source_type',
                            BillingCharge::SOURCE_SAAS_SUBSCRIPTION
                        )
                        ->pluck(
                            'source_id'
                        )
                )
                ->get()
                ->keyBy(
                    'id'
                );

        $adOrders =
            AdOrder::query()
                ->with([
                    'campaign:id,name,title',
                    'advertiser:id,name,type',
                ])
                ->whereIn(
                    'id',
                    $items
                        ->where(
                            'source_type',
                            BillingCharge::SOURCE_AD_ORDER
                        )
                        ->pluck(
                            'source_id'
                        )
                )
                ->get()
                ->keyBy(
                    'id'
                );

        $paginator->setCollection(
            $items
                ->map(
                    function (
                        BillingCharge $charge
                    ) use (
                        $subscriptions,
                        $adOrders
                    ): array {
                        $payment =
                            $charge
                                ->latestPayment;

                        $source =
                            null;

                        if (
                            $charge->source_type ===
                            BillingCharge::SOURCE_SAAS_SUBSCRIPTION
                        ) {
                            $subscription =
                                $subscriptions
                                    ->get(
                                        $charge->source_id
                                    );

                            if ($subscription) {
                                $source = [
                                    'type' =>
                                        'subscription',

                                    'id' =>
                                        $subscription->id,

                                    'status' =>
                                        $subscription->status,

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
                                ];
                            }
                        }

                        if (
                            $charge->source_type ===
                            BillingCharge::SOURCE_AD_ORDER
                        ) {
                            $order =
                                $adOrders
                                    ->get(
                                        $charge->source_id
                                    );

                            if ($order) {
                                $source = [
                                    'type' =>
                                        'ad_order',

                                    'id' =>
                                        $order->id,

                                    'number' =>
                                        $order->number,

                                    'status' =>
                                        $order->status,

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
                                ];
                            }
                        }

                        return [
                            'id' =>
                                $charge->id,

                            'number' =>
                                $charge->number,

                            'source_type' =>
                                $charge->source_type,

                            'source_id' =>
                                $charge->source_id,

                            'status' =>
                                $charge->status,

                            'description' =>
                                $charge->description,

                            'total' =>
                                (float) $charge->total,

                            'currency' =>
                                $charge->currency,

                            'due_at' =>
                                $charge->due_at,

                            'paid_at' =>
                                $charge->paid_at,

                            'created_at' =>
                                $charge->created_at,

                            'is_overdue' =>
                                $charge->status ===
                                    BillingCharge::STATUS_PENDING
                                &&
                                $charge->due_at
                                    ?->isPast(),

                            'tenant' =>
                                $charge->tenant
                                    ? [
                                        'id' =>
                                            $charge
                                                ->tenant
                                                ->id,

                                        'nome' =>
                                            $charge
                                                ->tenant
                                                ->nome,

                                        'nif' =>
                                            $charge
                                                ->tenant
                                                ->nif,

                                        'email' =>
                                            $charge
                                                ->tenant
                                                ->email,
                                    ]
                                    : null,

                            'payment' =>
                                $payment
                                    ? [
                                        'id' =>
                                            $payment->id,

                                        'provider' =>
                                            $payment
                                                ->provider,

                                        'method' =>
                                            $payment
                                                ->method,

                                        'status' =>
                                            $payment
                                                ->status,

                                        'entity' =>
                                            $payment
                                                ->entity,

                                        'reference' =>
                                            $payment
                                                ->reference,

                                        'provider_reference' =>
                                            $payment
                                                ->provider_reference,

                                        'external_id' =>
                                            $payment
                                                ->external_id,

                                        'expires_at' =>
                                            $payment
                                                ->expires_at,

                                        'paid_at' =>
                                            $payment
                                                ->paid_at,

                                        'mock' =>
                                            (bool) data_get(
                                                $payment
                                                    ->metadata,
                                                'mock',
                                                false
                                            ),
                                    ]
                                    : null,

                            'source' =>
                                $source,
                        ];
                    }
                )
        );

        return response()->json([
            'data' =>
                $paginator
                    ->items(),

            'meta' => [
                'current_page' =>
                    $paginator
                        ->currentPage(),

                'last_page' =>
                    $paginator
                        ->lastPage(),

                'per_page' =>
                    $paginator
                        ->perPage(),

                'total' =>
                    $paginator
                        ->total(),

                'from' =>
                    $paginator
                        ->firstItem(),

                'to' =>
                    $paginator
                        ->lastItem(),
            ],
        ]);
    }
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