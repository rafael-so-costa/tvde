<?php

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Services\Billing\IfthenpayReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set(
        'billing.providers.ifthenpay.backoffice_key',
        '1111-1111-1111-1111'
    );

    config()->set(
        'billing.providers.ifthenpay.reconciliation_url',
        'https://api.ifthenpay.com/v2/payments/read'
    );

    config()->set(
        'billing.providers.ifthenpay.reconciliation_timeout',
        15
    );

    config()->set(
        'billing.providers.ifthenpay.reconciliation_limit',
        20
    );
});

function reconciliationPayment(): array
{
    $charge =
        BillingCharge::create([
            'tenant_id' =>
                null,

            'source_type' =>
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION,

            'source_id' =>
                (string) Str::uuid(),

            'number' =>
                'SAAS-202610-RECON',

            'status' =>
                BillingCharge::STATUS_PENDING,

            'description' =>
                'Teste reconciliação Ifthenpay',

            'subtotal' =>
                19.90,

            'discount' =>
                0,

            'total' =>
                19.90,

            'currency' =>
                'EUR',

            'due_at' =>
                now()->addDays(7),

            'idempotency_key' =>
                'ifthenpay-reconciliation-' .
                Str::uuid(),
        ]);

    $payment =
        BillingPayment::create([
            'billing_charge_id' =>
                $charge->id,

            'provider' =>
                'ifthenpay',

            'method' =>
                BillingPayment::METHOD_MULTIBANCO,

            'status' =>
                BillingPayment::STATUS_PENDING,

            'amount' =>
                19.90,

            'currency' =>
                'EUR',

            'external_id' =>
                'REQRECON123',

            'provider_reference' =>
                'SAAS-202610-RECON',

            'entity' =>
                '11990',

            'reference' =>
                '123456789',

            'expires_at' =>
                now()->addDays(7),

            'metadata' => [
                'mock' =>
                    false,

                'sandbox' =>
                    true,
            ],
        ]);

    return [
        $charge,
        $payment,
    ];
}

test(
    'reconciliação confirma pagamento encontrado na ifthenpay',
    function () {
        [
            $charge,
            $payment,
        ] =
            reconciliationPayment();

        Http::fake([
            'api.ifthenpay.com/v2/payments/read' =>
                Http::response(
                    [
                        'payments' => [
                            [
                                'reference' =>
                                    '123456789',

                                'requestId' =>
                                    'REQRECON123',

                                'orderId' =>
                                    'SAAS-202610-RECON',

                                'amount' =>
                                    '19.90',
                            ],
                        ],
                    ],
                    200
                ),
        ]);

        $result =
            app(
                IfthenpayReconciliationService::class
            )->reconcilePending();

        expect(
            $result
        )->toBe([
            'checked' =>
                1,

            'confirmed' =>
                1,

            'pending' =>
                0,

            'errors' =>
                0,
        ]);

        expect(
            $payment
                ->refresh()
                ->status
        )->toBe(
            BillingPayment::STATUS_PAID
        );

        expect(
            $charge
                ->refresh()
                ->status
        )->toBe(
            BillingCharge::STATUS_PAID
        );

        expect(
            data_get(
                $payment->metadata,
                'ifthenpay_callback.source'
            )
        )->toBe(
            'reconciliation'
        );

        Http::assertSent(
            function ($request): bool {
                return
                    $request->url() ===
                    'https://api.ifthenpay.com/v2/payments/read'
                    &&
                    $request[
                        'boKey'
                    ] ===
                    '1111-1111-1111-1111'
                    &&
                    $request[
                        'reference'
                    ] ===
                    '123456789'
                    &&
                    $request[
                        'requestId'
                    ] ===
                    'REQRECON123'
                    &&
                    $request[
                        'amount'
                    ] ===
                    '19.90'
                    &&
                    $request[
                        'orderId'
                    ] ===
                    'SAAS-202610-RECON';
            }
        );
    }
);

test(
    'reconciliação mantém pagamento pendente quando ifthenpay não encontra pagamento',
    function () {
        [
            $charge,
            $payment,
        ] =
            reconciliationPayment();

        Http::fake([
            'api.ifthenpay.com/v2/payments/read' =>
                Http::response(
                    [
                        'payments' => [],
                    ],
                    200
                ),
        ]);

        $result =
            app(
                IfthenpayReconciliationService::class
            )->reconcilePending();

        expect(
            $result
        )->toBe([
            'checked' =>
                1,

            'confirmed' =>
                0,

            'pending' =>
                1,

            'errors' =>
                0,
        ]);

        expect(
            $payment
                ->refresh()
                ->status
        )->toBe(
            BillingPayment::STATUS_PENDING
        );

        expect(
            $charge
                ->refresh()
                ->status
        )->toBe(
            BillingCharge::STATUS_PENDING
        );
    }
);

test(
    'reconciliação contabiliza erro quando backoffice key é recusada',
    function () {
        [
            $charge,
            $payment,
        ] =
            reconciliationPayment();

        Http::fake([
            'api.ifthenpay.com/v2/payments/read' =>
                Http::response(
                    [
                        'message' =>
                            'Forbidden',
                    ],
                    403
                ),
        ]);

        $result =
            app(
                IfthenpayReconciliationService::class
            )->reconcilePending();

        expect(
            $result
        )->toBe([
            'checked' =>
                1,

            'confirmed' =>
                0,

            'pending' =>
                0,

            'errors' =>
                1,
        ]);

        expect(
            $payment
                ->refresh()
                ->status
        )->toBe(
            BillingPayment::STATUS_PENDING
        );

        expect(
            $charge
                ->refresh()
                ->status
        )->toBe(
            BillingCharge::STATUS_PENDING
        );
    }
);

test(
    'reconciliação exige backoffice key',
    function () {
        config()->set(
            'billing.providers.ifthenpay.backoffice_key',
            null
        );

        Http::fake();

        expect(
            fn () =>
                app(
                    IfthenpayReconciliationService::class
                )->reconcilePending()
        )->toThrow(
            ValidationException::class
        );

        Http::assertNothingSent();
    }
);

test(
    'reconciliação ignora pagamentos que já estão pagos',
    function () {
        [
            $charge,
            $payment,
        ] =
            reconciliationPayment();

        $payment->status =
            BillingPayment::STATUS_PAID;

        $payment->paid_at =
            now();

        $payment->save();

        $charge->status =
            BillingCharge::STATUS_PAID;

        $charge->paid_at =
            now();

        $charge->save();

        Http::fake();

        $result =
            app(
                IfthenpayReconciliationService::class
            )->reconcilePending();

        expect(
            $result
        )->toBe([
            'checked' =>
                0,

            'confirmed' =>
                0,

            'pending' =>
                0,

            'errors' =>
                0,
        ]);

        Http::assertNothingSent();
    }
);