<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Services\Billing\BillingService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CouponTerminalChargePaymentGuardTest extends TestCase
{
    private function assertBlocked(string $status): void
    {
        $charge = new BillingCharge([
            'status' => $status,
            'total' => '50.00',
            'currency' => 'EUR',
        ]);

        $charge->id = (string) Str::uuid();

        try {
            app(BillingService::class)->createPayment(
                $charge,
                'ifthenpay',
                BillingPayment::METHOD_MULTIBANCO
            );

            self::fail(
                'Nao deve emitir pagamento para cobranca terminal.'
            );
        } catch (ValidationException $exception) {
            self::assertArrayHasKey(
                'charge',
                $exception->errors()
            );
        }
    }

    public function test_canceled_charge_cannot_create_payment(): void
    {
        $this->assertBlocked(BillingCharge::STATUS_CANCELED);
    }

    public function test_expired_charge_cannot_create_payment(): void
    {
        $this->assertBlocked(BillingCharge::STATUS_EXPIRED);
    }

    public function test_refunded_charge_cannot_create_payment(): void
    {
        $this->assertBlocked(BillingCharge::STATUS_REFUNDED);
    }

    public function test_paid_charge_still_cannot_create_payment(): void
    {
        $this->assertBlocked(BillingCharge::STATUS_PAID);
    }

    public function test_unknown_charge_status_cannot_create_payment(): void
    {
        $this->assertBlocked('unknown_state');
    }
}