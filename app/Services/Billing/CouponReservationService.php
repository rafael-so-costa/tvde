<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Models\SaasSubscription;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Reservas preliminares de cupoes.
 *
 * Nao modifica cobrancas nem pagamentos.
 * Uso interno: purchaseKey deve ser gerada pelo servidor.
 */
final class CouponReservationService
{
    public function __construct(
        private readonly CouponEligibilityService $eligibility
    ) {}

    /**
     * Reserva um cupao para uma cobranca concreta.
     *
     * A origem e o ciclo sao validados novamente
     * dentro da transacao de reserve().
     */
    public function reserveForCharge(
        string $code,
        string $chargeId,
        ?CarbonInterface $at = null
    ): SaasCouponRedemption {
        if (! Str::isUuid($chargeId)) {
            throw new InvalidArgumentException(
                'Identificador de cobranca invalido.'
            );
        }

        $charge = BillingCharge::query()
            ->findOrFail($chargeId);

        if (! in_array($charge->source_type, [
            SaasCoupon::SCOPE_SAAS,
            SaasCoupon::SCOPE_ADS,
        ], true)) {
            throw new InvalidArgumentException(
                'Tipo de cobranca nao elegivel.'
            );
        }

        return $this->reserve(
            $code,
            (string) $charge->source_type,
            (string) $charge->source_id,
            'charge:' . $chargeId,
            $at
        );
    }

    public function reserve(
        string $code,
        string $scope,
        string $sourceId,
        string $purchaseKey,
        ?CarbonInterface $at = null
    ): SaasCouponRedemption {
        $code = strtoupper(trim($code));
        $at = $at
            ? CarbonImmutable::instance($at)
            : CarbonImmutable::now('UTC');

        if (! preg_match('/\A[A-Z0-9_-]{2,64}\z/', $code)) {
            throw new InvalidArgumentException(
                'Codigo promocional invalido.'
            );
        }

        if (! Str::isUuid($sourceId)) {
            throw new InvalidArgumentException(
                'Identificador de origem invalido.'
            );
        }

        if (! preg_match(
            '/\A[A-Za-z0-9_.:-]{1,120}\z/',
            $purchaseKey
        )) {
            throw new InvalidArgumentException(
                'Chave de compra invalida.'
            );
        }

        if (! in_array($scope, [
            SaasCoupon::SCOPE_SAAS,
            SaasCoupon::SCOPE_ADS,
        ], true)) {
            throw new InvalidArgumentException(
                'Ambito de compra invalido.'
            );
        }

        $key = hash('sha256', implode('|', [
            'coupon-reservation-v1',
            $scope,
            $sourceId,
            $purchaseKey,
        ]));

        return DB::transaction(
            function () use (
                $code,
                $scope,
                $sourceId,
                $key,
                $purchaseKey,
                $at
            ): SaasCouponRedemption {

                // Em MySQL/MariaDB, serializa as reservas
                // concorrentes do mesmo cupao.
                $coupon = SaasCoupon::query()
                    ->where('code', $code)
                    ->lockForUpdate()
                    ->first();

                if (! $coupon) {
                    throw ValidationException::withMessages([
                        'coupon' => 'Cupao inexistente.',
                    ]);
                }

                $source = $this->purchaseSource(
                    $scope,
                    $sourceId
                );

                $customerType = $source['customer_type'];
                $customerId = $source['customer_id'];
                $subtotal = $source['subtotal'];
                $currency = $source['currency'];

                $existing = SaasCouponRedemption::query()
                    ->where('idempotency_key', $key)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    if (
                        $existing->saas_coupon_id === $coupon->id &&
                        $existing->source_type === $scope &&
                        $existing->source_id === $sourceId &&
                        $existing->customer_type === $customerType &&
                        $existing->customer_id === $customerId &&
                        $existing->currency === $currency &&
                        (string) $existing->subtotal_amount === $subtotal &&
                        $existing->status === SaasCouponRedemption::STATUS_RESERVED &&
                        $existing->reserved_until->greaterThan($at)
                    ) {
                        return $existing;
                    }

                    throw ValidationException::withMessages([
                        'coupon' =>
                            'Esta compra ja tem uma reserva incompativel ou encerrada.',
                    ]);
                }

                // Chaves charge:UUID sao validadas
                // exclusivamente com dados da BD.
                if (str_starts_with($purchaseKey, 'charge:')) {
                    $chargeId = substr($purchaseKey, 7);

                    if (! Str::isUuid($chargeId)) {
                        throw new InvalidArgumentException(
                            'Identidade de cobranca invalida.'
                        );
                    }

                    $charge = BillingCharge::query()
                        ->lockForUpdate()
                        ->findOrFail($chargeId);

                    $identityService = app(
                        CouponBillingCycleIdentityService::class
                    );

                    if ($scope === SaasCoupon::SCOPE_SAAS) {
                        $sourceModel = SaasSubscription::query()
                            ->lockForUpdate()
                            ->findOrFail($sourceId);

                        $identity = $identityService->subscription(
                            $charge,
                            $sourceModel
                        );
                    } else {
                        $sourceModel = AdOrder::query()
                            ->lockForUpdate()
                            ->findOrFail($sourceId);

                        $identity = $identityService->adOrder(
                            $charge,
                            $sourceModel
                        );
                    }

                    if (
                        $identity['purchase_key'] !== $purchaseKey ||
                        $identity['source_id'] !== $sourceId ||
                        $identity['scope'] !== $scope ||
                        $identity['customer_type'] !== $customerType ||
                        $identity['customer_id'] !== $customerId
                    ) {
                        throw ValidationException::withMessages([
                            'coupon' =>
                                'Identidade da compra incompativel.',
                        ]);
                    }
                }

                $active = static function ($query) use ($at): void {
                    $query->where(function ($query) use ($at): void {
                        $query
                            ->where(
                                'status',
                                SaasCouponRedemption::STATUS_REDEEMED
                            )
                            ->orWhere(function ($query) use ($at): void {
                                $query
                                    ->where(
                                        'status',
                                        SaasCouponRedemption::STATUS_RESERVED
                                    )
                                    ->where(function ($hold) use ($at): void {
                                        $hold
                                            ->whereNotNull('billing_charge_id')
                                            ->orWhere('reserved_until', '>', $at);
                                    });
                            });
                    });
                };

                // Uma compra nao pode manter dois cupoes ativos.
                // O bloqueio da origem foi obtido anteriormente.
                $sourceQuery = SaasCouponRedemption::query()
                    ->where('source_type', $scope)
                    ->where('source_id', $sourceId);

                $active($sourceQuery);

                $isChargePurchase = str_starts_with(
                    $purchaseKey,
                    'charge:'
                );

                foreach (
                    $sourceQuery->lockForUpdate()->get() as $prior
                ) {
                    $priorKey = data_get(
                        $prior->metadata,
                        'purchase_key'
                    );

                    $priorIsChargePurchase =
                        is_string($priorKey) &&
                        str_starts_with($priorKey, 'charge:');

                    // Reservas legadas continuam bloqueadas
                    // por origem, evitando mudanca implicita
                    // do seu significado.
                    //
                    // Reservas por cobranca so colidem
                    // quando representam a mesma cobranca.
                    if (
                        ! $isChargePurchase ||
                        ! $priorIsChargePurchase ||
                        $priorKey === $purchaseKey
                    ) {
                        throw ValidationException::withMessages([
                            'coupon' =>
                                'Esta compra ja possui um cupao reservado ou utilizado.',
                        ]);
                    }
                }

                $globalQuery = SaasCouponRedemption::query()
                    ->where('saas_coupon_id', $coupon->id);

                $active($globalQuery);

                $globalCount = $globalQuery->count();

                $customerQuery = SaasCouponRedemption::query()
                    ->where('saas_coupon_id', $coupon->id)
                    ->where('customer_type', $customerType)
                    ->where('customer_id', $customerId);

                $active($customerQuery);

                $customerCount = $customerQuery->count();

                $quote = $this->eligibility->quote(
                    $coupon,
                    $scope,
                    $subtotal,
                    $currency,
                    $globalCount,
                    $customerCount,
                    $source['previous_paid_purchases'],
                    $at
                );

                return SaasCouponRedemption::create([
                    'saas_coupon_id' => $coupon->id,
                    'customer_type' => $customerType,
                    'customer_id' => $customerId,
                    'source_type' => $scope,
                    'source_id' => $sourceId,
                    'billing_charge_id' => null,
                    'status' => SaasCouponRedemption::STATUS_RESERVED,
                    'subtotal_amount' => $quote['subtotal'],
                    'discount_amount' => $quote['discount'],
                    'currency' => $currency,
                    'idempotency_key' => $key,
                    'reserved_until' => $at->addMinutes(30),
                    'metadata' => [
                        'purchase_key' => $purchaseKey,
                    ],
                ]);
            },
            3
        );
    }

    public function release(
        string $redemptionId
    ): SaasCouponRedemption {
        return $this->endReservation(
            $redemptionId,
            false
        );
    }

    public function expire(
        string $redemptionId,
        ?CarbonInterface $at = null
    ): SaasCouponRedemption {
        return $this->endReservation(
            $redemptionId,
            true,
            $at
        );
    }

    private function endReservation(
        string $id,
        bool $expired,
        ?CarbonInterface $at = null
    ): SaasCouponRedemption {
        $at = $at
            ? CarbonImmutable::instance($at)
            : CarbonImmutable::now('UTC');

        return DB::transaction(
            function () use (
                $id,
                $expired,
                $at
            ): SaasCouponRedemption {

                $initial = SaasCouponRedemption::query()
                    ->findOrFail($id);

                SaasCoupon::query()
                    ->lockForUpdate()
                    ->findOrFail($initial->saas_coupon_id);

                $record = SaasCouponRedemption::query()
                    ->lockForUpdate()
                    ->findOrFail($id);

                if (
                    $record->status !==
                    SaasCouponRedemption::STATUS_RESERVED
                ) {
                    return $record;
                }

                if ($record->billing_charge_id !== null) {
                    throw ValidationException::withMessages([
                        'coupon' =>
                            'Reserva associada a cobranca: operacao bloqueada.',
                    ]);
                }

                if (
                    $expired &&
                    $record->reserved_until->greaterThan($at)
                ) {
                    throw ValidationException::withMessages([
                        'coupon' => 'A reserva ainda esta valida.',
                    ]);
                }

                $record->status = $expired
                    ? SaasCouponRedemption::STATUS_EXPIRED
                    : SaasCouponRedemption::STATUS_RELEASED;

                $record->released_at = $at;
                $record->save();

                return $record;
            },
            3
        );
    }

    /**
     * Valores e titular obtidos da BD, nunca do browser.
     *
     * @return array{
     *   customer_type:string,
     *   customer_id:string,
     *   subtotal:string,
     *   currency:string,
     *   previous_paid_purchases:int
     * }
     */
    private function purchaseSource(
        string $scope,
        string $sourceId
    ): array {
        if ($scope === SaasCoupon::SCOPE_SAAS) {
            $subscription = SaasSubscription::query()
                ->lockForUpdate()
                ->findOrFail($sourceId);

            if (
                ! $subscription->tenant_id ||
                $subscription->status ===
                    SaasSubscription::STATUS_CANCELED
            ) {
                throw ValidationException::withMessages([
                    'coupon' => 'Subscricao nao elegivel.',
                ]);
            }

            $previous = BillingCharge::query()
                ->where(
                    'tenant_id',
                    $subscription->tenant_id
                )
                ->where(
                    'source_type',
                    BillingCharge::SOURCE_SAAS_SUBSCRIPTION
                )
                ->where(
                    'status',
                    BillingCharge::STATUS_PAID
                )
                ->count();

            return [
                'customer_type' => 'tenant',
                'customer_id' =>
                    (string) $subscription->tenant_id,
                'subtotal' =>
                    (string) $subscription->price_amount,
                'currency' =>
                    (string) ($subscription->currency ?: 'EUR'),
                'previous_paid_purchases' => $previous,
            ];
        }

        $order = AdOrder::query()
            ->lockForUpdate()
            ->findOrFail($sourceId);

        if (
            ! $order->advertiser_id ||
            $order->status !== AdOrder::STATUS_PENDING ||
            (string) $order->discount !== '0.00' ||
            (string) $order->subtotal !== (string) $order->total
        ) {
            throw ValidationException::withMessages([
                'coupon' =>
                    'Encomenda publicitaria nao elegivel ou ja com desconto.',
            ]);
        }

        $previous = AdOrder::query()
            ->where(
                'advertiser_id',
                $order->advertiser_id
            )
            ->where(
                'status',
                AdOrder::STATUS_PAID
            )
            ->count();

        return [
            'customer_type' => 'advertiser',
            'customer_id' =>
                (string) $order->advertiser_id,
            'subtotal' =>
                (string) $order->subtotal,
            'currency' =>
                (string) ($order->currency ?: 'EUR'),
            'previous_paid_purchases' => $previous,
        ];
    }
}