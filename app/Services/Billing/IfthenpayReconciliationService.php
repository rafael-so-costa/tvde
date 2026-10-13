<?php

namespace App\Services\Billing;

use App\Models\BillingPayment;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class IfthenpayReconciliationService
{
    public function __construct(
        private BillingService $billing
    ) {}

    public function reconcilePending(
        ?int $limit = null
    ): array {
        $backofficeKey =
            trim(
                (string) config(
                    'billing.providers.ifthenpay.backoffice_key',
                    ''
                )
            );

        if ($backofficeKey === '') {
            throw ValidationException::withMessages([
                'provider' =>
                    'A Backoffice Key da Ifthenpay não está configurada.',
            ]);
        }

        $limit =
            max(
                1,
                min(
                    100,
                    $limit
                    ?? (int) config(
                        'billing.providers.ifthenpay.reconciliation_limit',
                        20
                    )
                )
            );

        $payments =
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
                    'status',
                    BillingPayment::STATUS_PENDING
                )
                ->whereNotNull(
                    'external_id'
                )
                ->whereNotNull(
                    'provider_reference'
                )
                ->whereNotNull(
                    'reference'
                )
                ->oldest(
                    'created_at'
                )
                ->limit(
                    $limit
                )
                ->get();

        $result = [
            'checked' => 0,
            'confirmed' => 0,
            'pending' => 0,
            'errors' => 0,
        ];

        foreach ($payments as $payment) {
            $result['checked']++;

            try {
                if (
                    ! $this->isPaid(
                        $payment,
                        $backofficeKey
                    )
                ) {
                    $result['pending']++;

                    continue;
                }

                $this->billing
                    ->confirmPaid(
                        $payment,
                        [
                            'source' =>
                                'reconciliation',

                            'received_at' =>
                                now()
                                    ->toIso8601String(),

                            'order_id' =>
                                $payment
                                    ->provider_reference,

                            'request_id' =>
                                $payment
                                    ->external_id,

                            'reference' =>
                                $payment
                                    ->reference,

                            'amount' =>
                                (string) $payment
                                    ->amount,
                        ]
                    );

                $result['confirmed']++;
            } catch (Throwable $exception) {
                $result['errors']++;

                Log::warning(
                    'Reconciliação Ifthenpay falhou.',
                    [
                        'billing_payment_id' =>
                            $payment->id,

                        'order_id' =>
                            $payment
                                ->provider_reference,

                        'message' =>
                            $exception
                                ->getMessage(),
                    ]
                );
            }
        }

        return $result;
    }

    private function isPaid(
        BillingPayment $payment,
        string $backofficeKey
    ): bool {
        $url =
            (string) config(
                'billing.providers.ifthenpay.reconciliation_url',
                'https://api.ifthenpay.com/v2/payments/read'
            );

        try {
            $response =
                Http::acceptJson()
                    ->asJson()
                    ->timeout(
                        max(
                            1,
                            (int) config(
                                'billing.providers.ifthenpay.reconciliation_timeout',
                                15
                            )
                        )
                    )
                    ->post(
                        $url,
                        [
                            'boKey' =>
                                $backofficeKey,

                            'reference' =>
                                $payment
                                    ->reference,

                            'requestId' =>
                                $payment
                                    ->external_id,

                            'amount' =>
                                number_format(
                                    (float) $payment
                                        ->amount,
                                    2,
                                    '.',
                                    ''
                                ),

                            'orderId' =>
                                $payment
                                    ->provider_reference,

                            'dateStart' =>
                                null,

                            'dateEnd' =>
                                null,
                        ]
                    );
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                'Não foi possível comunicar com a Ifthenpay durante a reconciliação.',
                0,
                $exception
            );
        }

        if ($response->status() === 403) {
            throw new RuntimeException(
                'A Ifthenpay recusou a Backoffice Key.'
            );
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                sprintf(
                    'A Ifthenpay respondeu com HTTP %d durante a reconciliação.',
                    $response->status()
                )
            );
        }

        $data =
            $response->json();

        if (! is_array($data)) {
            throw new RuntimeException(
                'A Ifthenpay devolveu uma resposta inválida durante a reconciliação.'
            );
        }

        $payments =
            $data['payments']
            ?? null;

        if ($payments === null) {
            return false;
        }

        if (! is_array($payments)) {
            throw new RuntimeException(
                'A lista de pagamentos devolvida pela Ifthenpay é inválida.'
            );
        }

        return count(
            $payments
        ) > 0;
    }
}