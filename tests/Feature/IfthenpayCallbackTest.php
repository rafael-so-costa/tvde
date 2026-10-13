<?php

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set(
        'billing.providers.ifthenpay.callback_key',
        'callback-test-1234567890'
    );
});

function ifthenpayCallbackPayment(): array
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
                'SAAS-202610-CALLBACK',

            'status' =>
                BillingCharge::STATUS_PENDING,

            'description' =>
                'Teste callback Ifthenpay',

            'subtotal' =>
                1000,

            'discount' =>
                0,

            'total' =>
                1000,

            'currency' =>
                'EUR',

            'due_at' =>
                now()->addDays(7),

            'idempotency_key' =>
                'ifthenpay-callback-' .
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
                1000,

            'currency' =>
                'EUR',

            'external_id' =>
                'REQCALLBACK123',

            'provider_reference' =>
                'SAAS-202610-CALLBACK',

            'entity' =>
                '11990',

            'reference' =>
                '000826333',

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

function ifthenpayCallbackUrl(
    array $overrides = []
): string {
    $parameters =
        array_merge(
            [
                'key' =>
                    'callback-test-1234567890',

                'orderId' =>
                    'SAAS-202610-CALLBACK',

                'amount' =>
                    '1000.00',

                'requestId' =>
                    'REQCALLBACK123',

                'entity' =>
                    '11990',

                'reference' =>
                    '000826333',

                'payment_datetime' =>
                    '13-10-2026 21:24:49',
            ],
            $overrides
        );

    return
        '/api/payments/ifthenpay/callback?' .
        http_build_query(
            $parameters
        );
}

test(
    'callback multibanco confirma pagamento',
    function () {
        [
            $charge,
            $payment,
        ] =
            ifthenpayCallbackPayment();

        $response =
            $this->get(
                ifthenpayCallbackUrl()
            );

        $response
            ->assertOk()
            ->assertSeeText(
                'OK'
            );

        $payment->refresh();
        $charge->refresh();

        expect(
            $payment->status
        )->toBe(
            BillingPayment::STATUS_PAID
        );

        expect(
            $charge->status
        )->toBe(
            BillingCharge::STATUS_PAID
        );

        expect(
            $payment->paid_at
        )->not->toBeNull();

        expect(
            $charge->paid_at
        )->not->toBeNull();

        expect(
            data_get(
                $payment->metadata,
                'ifthenpay_callback.order_id'
            )
        )->toBe(
            'SAAS-202610-CALLBACK'
        );

        expect(
            data_get(
                $payment->metadata,
                'ifthenpay_callback.request_id'
            )
        )->toBe(
            'REQCALLBACK123'
        );
    }
);

test(
    'callback multibanco é idempotente',
    function () {
        [
            $charge,
            $payment,
        ] =
            ifthenpayCallbackPayment();

        $this
            ->get(
                ifthenpayCallbackUrl()
            )
            ->assertOk();

        $payment->refresh();
        $charge->refresh();

        $paidAt =
            $payment
                ->paid_at
                ?->toISOString();

        $metadata =
            $payment->metadata;

        $chargePaidAt =
            $charge
                ->paid_at
                ?->toISOString();

        $this
            ->get(
                ifthenpayCallbackUrl()
            )
            ->assertOk()
            ->assertSeeText(
                'OK'
            );

        $payment->refresh();
        $charge->refresh();

        expect(
            $payment
                ->paid_at
                ?->toISOString()
        )->toBe(
            $paidAt
        );

        expect(
            $charge
                ->paid_at
                ?->toISOString()
        )->toBe(
            $chargePaidAt
        );

        expect(
            $payment->metadata
        )->toBe(
            $metadata
        );

        expect(
            BillingPayment::query()
                ->count()
        )->toBe(1);

        expect(
            BillingCharge::query()
                ->count()
        )->toBe(1);
    }
);

test(
    'callback rejeita chave anti phishing inválida',
    function () {
        [
            $charge,
            $payment,
        ] =
            ifthenpayCallbackPayment();

        $this
            ->get(
                ifthenpayCallbackUrl([
                    'key' =>
                        'chave-incorreta',
                ])
            )
            ->assertStatus(400)
            ->assertSeeText(
                'error'
            );

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
    'callback rejeita valor diferente da cobrança',
    function () {
        [
            $charge,
            $payment,
        ] =
            ifthenpayCallbackPayment();

        $this
            ->get(
                ifthenpayCallbackUrl([
                    'amount' =>
                        '999.99',
                ])
            )
            ->assertStatus(400)
            ->assertSeeText(
                'error'
            );

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
    'callback rejeita identificadores que não correspondem ao pagamento',
    function () {
        [
            $charge,
            $payment,
        ] =
            ifthenpayCallbackPayment();

        $this
            ->get(
                ifthenpayCallbackUrl([
                    'requestId' =>
                        'OUTROREQUEST',
                ])
            )
            ->assertStatus(400)
            ->assertSeeText(
                'error'
            );

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