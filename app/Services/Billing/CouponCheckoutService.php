<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\AdOrder;
use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Models\SaasSubscription;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Integra os serviços financeiros existentes.
 *
 * Não aceita preços ou descontos calculados pelo frontend.
 * Não confirma pagamentos.
 * Não cancela referências emitidas.
 */
final class CouponCheckoutService
{
    public function __construct(
        private readonly BillingService $billing,
        private readonly CouponEligibilityService $eligibility,
        private readonly CouponReservationService $reservations,
        private readonly CouponChargeBindingService $binding
    ) {}

    public function quote(
        string $scope,
        string $id,
        string $code
    ): array {
        $this->requireEnabled();

        $source = $this->source($scope, $id);

        if (
            $scope === SaasCoupon::SCOPE_ADS &&
            SaasCouponRedemption::query()
                ->where('source_type', $scope)
                ->where('source_id', $id)
                ->whereNotNull('billing_charge_id')
                ->exists()
        ) {
            $this->reject(
                'Este pedido já possui uma reserva de cupão vinculada.'
            );
        }

        $coupon = SaasCoupon::query()
            ->where('code', $code)
            ->first();

        if (!$coupon) {
            $this->reject('Cupão inexistente.');
        }

        $customerType = $scope === SaasCoupon::SCOPE_SAAS
            ? 'tenant'
            : 'advertiser';

        $customerId = $scope === SaasCoupon::SCOPE_SAAS
            ? $source->tenant_id
            : $source->advertiser_id;

        if (!$customerId) {
            $this->reject('Titular da compra inválido.');
        }

        $subtotal = $scope === SaasCoupon::SCOPE_SAAS
            ? $source->price_amount
            : $source->subtotal;

        $currency = $source->currency ?: 'EUR';

        $now = CarbonImmutable::now('UTC');

        $active = static function ($query) use ($now): void {
            $query->where(function ($q) use ($now): void {
                $q->where(
                    'status',
                    SaasCouponRedemption::STATUS_REDEEMED
                )->orWhere(function ($q) use ($now): void {
                    $q->where(
                        'status',
                        SaasCouponRedemption::STATUS_RESERVED
                    )->where(function ($hold) use ($now): void {
                        $hold->whereNotNull(
                            'billing_charge_id'
                        )->orWhere(
                            'reserved_until',
                            '>',
                            $now
                        );
                    });
                });
            });
        };

        $globalQuery = SaasCouponRedemption::query()
            ->where('saas_coupon_id', $coupon->id);

        $active($globalQuery);

        $customerQuery = SaasCouponRedemption::query()
            ->where('saas_coupon_id', $coupon->id)
            ->where('customer_type', $customerType)
            ->where('customer_id', $customerId);

        $active($customerQuery);

        $previous = $scope === SaasCoupon::SCOPE_SAAS
            ? BillingCharge::query()
                ->where('tenant_id', $customerId)
                ->where(
                    'source_type',
                    BillingCharge::SOURCE_SAAS_SUBSCRIPTION
                )
                ->where(
                    'status',
                    BillingCharge::STATUS_PAID
                )
                ->count()

            : AdOrder::query()
                ->where('advertiser_id', $customerId)
                ->where('status', AdOrder::STATUS_PAID)
                ->count();

        $quote = $this->eligibility->quote(
            $coupon,
            $scope,
            (string) $subtotal,
            (string) $currency,
            $globalQuery->count(),
            $customerQuery->count(),
            $previous,
            $now
        );

        if ($this->cents((string) $quote['total']) < 1) {
            $this->reject(
                'Desconto integral ainda não disponível para pagamentos Multibanco.'
            );
        }

        return [
            'code' => $coupon->code,
            'subtotal' => (string) $quote['subtotal'],
            'discount' => (string) $quote['discount'],
            'total' => (string) $quote['total'],
            'currency' => $currency,
            'note' =>
                'Cotação informativa. Validada novamente ao emitir a referência.',
        ];
    }

    public function checkout(
        string $scope,
        string $id,
        string $code
    ): BillingPayment {
        $this->requireEnabled();

        if (
            config('billing.default_provider', 'ifthenpay')
            !== 'ifthenpay'
        ) {
            $this->reject(
                'O prestador de pagamentos não é suportado neste checkout.'
            );
        }

        /*
         * Serializar pedidos concorrentes sobre a mesma
         * compra, evitando emissão duplicada.
         */
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        $lockName = 'fp_coupon_' . substr(
            hash('sha256', $scope . ':' . $id),
            0,
            48
        );

        $locked = false;

        if ($driver === 'mysql') {
            $result = $connection->selectOne(
                'SELECT GET_LOCK(?, 10) AS acquired',
                [$lockName]
            );

            if ((int) ($result->acquired ?? 0) !== 1) {
                $this->reject(
                    'Compra ocupada. Tente novamente mais tarde.'
                );
            }

            $locked = true;
        } elseif (
            $driver !== 'sqlite' ||
            !app()->environment('testing')
        ) {
            $this->reject(
                'Base de dados não suportada para este checkout.'
            );
        }

        try {
            $source = $this->source($scope, $id);

            $charge = $scope === SaasCoupon::SCOPE_SAAS
                ? $this->billing->subscriptionCharge($source)
                : $this->billing->adOrderCharge($source);

            if (
                $charge->status !==
                BillingCharge::STATUS_PENDING
            ) {
                $this->reject(
                    'Cobrança não está pendente.'
                );
            }

            $bound = SaasCouponRedemption::query()
                ->where('billing_charge_id', $charge->id)
                ->first();

            if ($bound) {
                $existingCoupon = SaasCoupon::query()
                    ->findOrFail($bound->saas_coupon_id);

                if (
                    $existingCoupon->code !== $code ||
                    !in_array(
                        $bound->status,
                        [
                            SaasCouponRedemption::STATUS_RESERVED,
                            SaasCouponRedemption::STATUS_REDEEMED,
                        ],
                        true
                    ) ||
                    $bound->source_type !== $scope ||
                    $bound->source_id !== $id
                ) {
                    $this->reject(
                        'Esta cobrança já tem outro cupão vinculado.'
                    );
                }
            } else {
                if ($charge->payments()->exists()) {
                    $this->reject(
                        'Referência já emitida. O valor da cobrança não pode ser alterado.'
                    );
                }

                $reservation = $this->reservations->reserve(
                    $code,
                    $scope,
                    $id,
                    'charge:' . $charge->id
                );

                $this->binding->bind(
                    $reservation->id,
                    $charge->id
                );
            }

            $charge->refresh();

            /*
             * A emissão usa exclusivamente o BillingService.
             * O valor vem da cobrança validada e vinculada.
             */
            $payment = $this->billing->createPayment(
                $charge,
                'ifthenpay',
                BillingPayment::METHOD_MULTIBANCO
            );

            if (
                $this->cents((string) $payment->amount)
                !== $this->cents((string) $charge->total)
            ) {
                throw new RuntimeException(
                    'Inconsistência entre pagamento e cobrança.'
                );
            }

            return $payment;
        } finally {
            if ($locked) {
                $connection->selectOne(
                    'SELECT RELEASE_LOCK(?) AS released',
                    [$lockName]
                );
            }
        }
    }

    private function source(
        string $scope,
        string $id
    ): SaasSubscription|AdOrder {
        if ($scope === SaasCoupon::SCOPE_SAAS) {
            $source = SaasSubscription::query()
                ->findOrFail($id);

            if (
                !$source->tenant_id ||
                $source->status ===
                    SaasSubscription::STATUS_CANCELED ||
                !$source->current_period_starts_at ||
                !$source->current_period_ends_at ||
                $source->current_period_ends_at
                    ->lessThanOrEqualTo(
                        $source->current_period_starts_at
                    )
            ) {
                $this->reject(
                    'Período ou assinatura não elegível.'
                );
            }

            return $source;
        }

        if ($scope === SaasCoupon::SCOPE_ADS) {
            $source = AdOrder::query()
                ->findOrFail($id);

            if (
                !$source->advertiser_id ||
                $source->status !== AdOrder::STATUS_PENDING
            ) {
                $this->reject(
                    'Pedido publicitário não elegível.'
                );
            }

            $hasDiscount =
                $this->cents((string) $source->discount) !== 0 ||
                $this->cents((string) $source->subtotal)
                    !== $this->cents((string) $source->total);

            if ($hasDiscount) {
                $hasBoundRedemption = SaasCouponRedemption::query()
                    ->where(
                        'source_type',
                        SaasCoupon::SCOPE_ADS
                    )
                    ->where('source_id', $source->id)
                    ->whereNotNull('billing_charge_id')
                    ->where(
                        'status',
                        SaasCouponRedemption::STATUS_RESERVED
                    )
                    ->exists();

                if (!$hasBoundRedemption) {
                    $this->reject(
                        'Pedido publicitário com desconto não reconhecido.'
                    );
                }
            }

            return $source;
        }

        $this->reject('Âmbito não suportado.');
    }

    private function requireEnabled(): void
    {
        if (!(bool) config('billing.coupons.enabled', false)) {
            $this->reject(
                'Os descontos de cupões estão desativados.'
            );
        }
    }

    private function cents(string $amount): int
    {
        if (!preg_match(
            '/\A\d+(?:\.\d{1,2})?\z/',
            $amount
        )) {
            $this->reject('Valor financeiro inválido.');
        }

        [$euros, $cents] = array_pad(
            explode('.', $amount, 2),
            2,
            '0'
        );

        if (strlen($euros) > 10) {
            $this->reject(
                'Valor financeiro demasiado elevado.'
            );
        }

        return ((int) $euros * 100) +
            (int) str_pad($cents, 2, '0');
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages([
            'coupon_code' => $message,
        ]);
    }
}