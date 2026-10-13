<?php

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use App\Services\Billing\IfthenpayProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set(
        'billing.providers.ifthenpay.enabled',
        true
    );

    config()->set(
        'billing.providers.ifthenpay.sandbox',
        true
    );

    config()->set(
        'billing.providers.ifthenpay.mb_key',
        'ITP-TESTE'
    );

    config()->set(
        'billing.providers.ifthenpay.multibanco_url',
        'https://api.ifthenpay.com/multibanco/reference/init'
    );

    config()->set(
        'billing.providers.ifthenpay.multibanco_expiry_days',
        7
    );

    config()->set(
        'billing.providers.ifthenpay.timeout',
        15
    );
});

function ifthenpayCharge(): BillingCharge
{
    return BillingCharge::create([
        'tenant_id' => null,
        'source_type' =>
            BillingCharge::SOURCE_SAAS_SUBSCRIPTION,
        'source_id' =>
            (string) Str::uuid(),
        'number' =>
            'SAAS-202610-TEST0001',
        'status' =>
            BillingCharge::STATUS_PENDING,
        'description' =>
            'Plano FrotaPRO mensal',
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
            'ifthenpay-provider-test-' .
            Str::uuid(),
    ]);
}

test(
    'ifthenpay cria referência multibanco real através da api',
    function () {
        Http::fake([
            'api.ifthenpay.com/*' =>
                Http::response(
                    [
                        'Amount' =>
                            '19.90',
                        'Entity' =>
                            '12345',
                        'ExpiryDate' =>
                            now()
                                ->addDays(7)
                                ->format('d-m-Y'),
                        'Message' =>
                            'Success',
                        'OrderId' =>
                            'SAAS-202610-TEST0001',
                        'Reference' =>
                            '123456789',
                        'RequestId' =>
                            'REQ123456789',
                        'Status' =>
                            '0',
                    ],
                    200
                ),
        ]);

        $charge =
            ifthenpayCharge();

        $result =
            app(
                IfthenpayProvider::class
            )->createPayment(
                $charge,
                BillingPayment::METHOD_MULTIBANCO
            );

        expect(
            $result->status
        )->toBe(
            BillingPayment::STATUS_PENDING
        );

        expect(
            $result->externalId
        )->toBe(
            'REQ123456789'
        );

        expect(
            $result->providerReference
        )->toBe(
            'SAAS-202610-TEST0001'
        );

        expect(
            $result->entity
        )->toBe(
            '12345'
        );

        expect(
            $result->reference
        )->toBe(
            '123456789'
        );

        expect(
            $result->metadata['mock']
        )->toBeFalse();

        Http::assertSent(
            function ($request): bool {
                return
                    $request->url() ===
                    'https://api.ifthenpay.com/multibanco/reference/init'
                    &&
                    $request[
                        'mbKey'
                    ] ===
                    'ITP-TESTE'
                    &&
                    $request[
                        'orderId'
                    ] ===
                    'SAAS-202610-TEST0001'
                    &&
                    $request[
                        'amount'
                    ] ===
                    '19.90'
                    &&
                    $request[
                        'expiryDays'
                    ] ===
                    7;
            }
        );
    }
);

test(
    'ifthenpay exige mb key configurada',
    function () {
        Http::fake();

        config()->set(
            'billing.providers.ifthenpay.mb_key',
            null
        );

        expect(
            fn () =>
                app(
                    IfthenpayProvider::class
                )->createPayment(
                    ifthenpayCharge(),
                    BillingPayment::METHOD_MULTIBANCO
                )
        )->toThrow(
            ValidationException::class
        );

        Http::assertNothingSent();
    }
);

test(
    'ifthenpay rejeita resposta de erro do provider',
    function () {
        Http::fake([
            'api.ifthenpay.com/*' =>
                Http::response(
                    [
                        'Status' =>
                            '-1',
                        'Message' =>
                            'Invalid MB Key',
                    ],
                    200
                ),
        ]);

        expect(
            fn () =>
                app(
                    IfthenpayProvider::class
                )->createPayment(
                    ifthenpayCharge(),
                    BillingPayment::METHOD_MULTIBANCO
                )
        )->toThrow(
            ValidationException::class
        );
    }
);