<?php

namespace App\Http\Controllers;

use App\Models\BillingPayment;
use App\Services\Billing\BillingService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class IfthenpayCallbackController extends Controller
{
    public function __construct(
        private BillingService $billing
    ) {}

    public function __invoke(Request $request): Response
    {
        $payload = [
            'key' =>
                $this->queryString(
                    $request,
                    'key'
                ),

            'order_id' =>
                $this->queryString(
                    $request,
                    'orderId'
                ),

            'amount' =>
                $this->queryString(
                    $request,
                    'amount'
                ),

            'request_id' =>
                $this->queryString(
                    $request,
                    'requestId'
                ),

            'entity' =>
                preg_replace(
                    '/\D+/',
                    '',
                    $this->queryString(
                        $request,
                        'entity'
                    )
                ) ?? '',

            'reference' =>
                preg_replace(
                    '/\D+/',
                    '',
                    $this->queryString(
                        $request,
                        'reference'
                    )
                ) ?? '',

            'payment_datetime' =>
                $this->queryString(
                    $request,
                    'payment_datetime'
                ),
        ];

        foreach (
            [
                'key',
                'order_id',
                'amount',
                'request_id',
                'entity',
                'reference',
                'payment_datetime',
            ] as $required
        ) {
            if (
                $payload[$required] === ''
            ) {
                return $this->reject(
                    'missing_' . $required,
                    $payload
                );
            }
        }

        $expectedKey =
            trim(
                (string) config(
                    'billing.providers.ifthenpay.callback_key',
                    ''
                )
            );

        if (
            $expectedKey === '' ||
            ! hash_equals(
                $expectedKey,
                $payload['key']
            )
        ) {
            return $this->reject(
                'invalid_antiphishing_key',
                $payload
            );
        }

        $callbackCents =
            $this->amountToCents(
                $payload['amount']
            );

        if (
            $callbackCents === null ||
            $callbackCents <= 0
        ) {
            return $this->reject(
                'invalid_amount',
                $payload
            );
        }

        $payment =
            BillingPayment::query()
                ->where(
                    'provider',
                    'ifthenpay'
                )
                ->where(
                    'method',
                    BillingPayment::METHOD_MULTIBANCO
                )
                ->where(
                    'provider_reference',
                    $payload['order_id']
                )
                ->where(
                    'external_id',
                    $payload['request_id']
                )
                ->where(
                    'entity',
                    $payload['entity']
                )
                ->where(
                    'reference',
                    $payload['reference']
                )
                ->latest()
                ->first();

        if (! $payment) {
            return $this->reject(
                'payment_not_found',
                $payload
            );
        }

        $paymentCents =
            $this->amountToCents(
                (string) $payment->amount
            );

        if (
            $paymentCents === null ||
            $paymentCents !==
            $callbackCents
        ) {
            return $this->reject(
                'amount_mismatch',
                $payload
            );
        }

        if (
            ! in_array(
                $payment->status,
                [
                    BillingPayment::STATUS_PENDING,
                    BillingPayment::STATUS_PAID,
                ],
                true
            )
        ) {
            return $this->reject(
                'invalid_payment_status',
                $payload
            );
        }

        try {
            $this->billing
                ->confirmPaid(
                    $payment,
                    [
                        'received_at' =>
                            now()
                                ->toIso8601String(),

                        'order_id' =>
                            $payload['order_id'],

                        'request_id' =>
                            $payload['request_id'],

                        'entity' =>
                            $payload['entity'],

                        'reference' =>
                            $payload['reference'],

                        'amount' =>
                            $payload['amount'],

                        'payment_datetime' =>
                            $payload['payment_datetime'],
                    ]
                );
        } catch (
            ValidationException
        ) {
            return $this->reject(
                'payment_confirmation_rejected',
                $payload
            );
        }

        return response(
            'OK',
            200,
            [
                'Content-Type' =>
                    'text/plain',
            ]
        );
    }

    private function queryString(
        Request $request,
        string $key
    ): string {
        $value =
            $request->query(
                $key
            );

        if (
            ! is_string($value) &&
            ! is_numeric($value)
        ) {
            return '';
        }

        return trim(
            (string) $value
        );
    }

    private function amountToCents(
        string $amount
    ): ?int {
        $normalized =
            str_replace(
                ',',
                '.',
                trim($amount)
            );

        if (
            ! preg_match(
                '/^\d+(?:\.\d{1,2})?$/',
                $normalized
            )
        ) {
            return null;
        }

        [
            $whole,
            $fraction,
        ] =
            array_pad(
                explode(
                    '.',
                    $normalized,
                    2
                ),
                2,
                '0'
            );

        return
            ((int) $whole * 100) +
            (int) str_pad(
                $fraction,
                2,
                '0'
            );
    }

    private function reject(
        string $reason,
        array $payload
    ): Response {
        Log::warning(
            'Callback Ifthenpay rejeitado.',
            [
                'reason' =>
                    $reason,

                'order_id' =>
                    $payload['order_id']
                    ?? null,

                'request_id' =>
                    $payload['request_id']
                    ?? null,

                'entity' =>
                    $payload['entity']
                    ?? null,

                'reference' =>
                    $payload['reference']
                    ?? null,

                'amount' =>
                    $payload['amount']
                    ?? null,
            ]
        );

        return response(
            'error',
            400,
            [
                'Content-Type' =>
                    'text/plain',
            ]
        );
    }
}