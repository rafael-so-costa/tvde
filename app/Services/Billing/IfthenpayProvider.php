<?php

namespace App\Services\Billing;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class IfthenpayProvider implements BillingProvider
{
    private const DEFAULT_MULTIBANCO_URL =
        'https://api.ifthenpay.com/multibanco/reference/init';

    public function code(): string
    {
        return 'ifthenpay';
    }

    public function supports(
        string $method
    ): bool {
        return in_array(
            $method,
            [
                BillingPayment::METHOD_MULTIBANCO,
            ],
            true
        );
    }

    public function createPayment(
        BillingCharge $charge,
        string $method
    ): ProviderPaymentResult {
        if (
            ! config(
                'billing.providers.ifthenpay.enabled',
                false
            )
        ) {
            throw ValidationException::withMessages([
                'provider' =>
                    'A integração Ifthenpay está desativada.',
            ]);
        }

        if (
            ! $this->supports(
                $method
            )
        ) {
            throw ValidationException::withMessages([
                'method' =>
                    'O método de pagamento não é suportado pela Ifthenpay.',
            ]);
        }

        $mbKey = trim(
            (string) config(
                'billing.providers.ifthenpay.mb_key',
                ''
            )
        );

        if ($mbKey === '') {
            throw ValidationException::withMessages([
                'provider' =>
                    'A MB KEY da Ifthenpay não está configurada.',
            ]);
        }

        $orderId =
            $this->orderId(
                $charge
            );

        $amount =
            number_format(
                (float) $charge->total,
                2,
                '.',
                ''
            );

        $expiryDays =
            $this->expiryDays();

        $url =
            (string) config(
                'billing.providers.ifthenpay.multibanco_url',
                self::DEFAULT_MULTIBANCO_URL
            );

        try {
            $response =
                Http::acceptJson()
                    ->asJson()
                    ->timeout(
                        max(
                            1,
                            (int) config(
                                'billing.providers.ifthenpay.timeout',
                                15
                            )
                        )
                    )
                    ->post(
                        $url,
                        [
                            'mbKey' =>
                                $mbKey,

                            'orderId' =>
                                $orderId,

                            'amount' =>
                                $amount,

                            'description' =>
                                Str::limit(
                                    (string) (
                                        $charge->description
                                        ?: $charge->number
                                    ),
                                    255,
                                    ''
                                ),

                            'expiryDays' =>
                                $expiryDays,
                        ]
                    );
        } catch (
            ConnectionException $exception
        ) {
            throw new RuntimeException(
                'Não foi possível comunicar com a Ifthenpay.',
                0,
                $exception
            );
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                sprintf(
                    'A Ifthenpay respondeu com HTTP %d.',
                    $response->status()
                )
            );
        }

        $data =
            $response->json();

        if (! is_array($data)) {
            throw new RuntimeException(
                'A Ifthenpay devolveu uma resposta inválida.'
            );
        }

        $status =
            (string) (
                $data['Status']
                ?? ''
            );

        if ($status !== '0') {
            $message =
                trim(
                    (string) (
                        $data['Message']
                        ?? ''
                    )
                );

            throw ValidationException::withMessages([
                'provider' =>
                    $message !== ''
                        ? 'Ifthenpay: ' . $message
                        : 'A Ifthenpay recusou a geração da referência Multibanco.',
            ]);
        }

        $entity =
            trim(
                (string) (
                    $data['Entity']
                    ?? ''
                )
            );

        $reference =
            preg_replace(
                '/\D+/',
                '',
                (string) (
                    $data['Reference']
                    ?? ''
                )
            );

        $requestId =
            trim(
                (string) (
                    $data['RequestId']
                    ?? ''
                )
            );

        $responseOrderId =
            trim(
                (string) (
                    $data['OrderId']
                    ?? ''
                )
            );

        if (
            $entity === '' ||
            $reference === '' ||
            $requestId === '' ||
            $responseOrderId === ''
        ) {
            throw new RuntimeException(
                'A Ifthenpay não devolveu todos os dados obrigatórios da referência Multibanco.'
            );
        }

        if (
            ! hash_equals(
                $orderId,
                $responseOrderId
            )
        ) {
            throw new RuntimeException(
                'O identificador devolvido pela Ifthenpay não corresponde à cobrança.'
            );
        }

        $responseAmount =
            number_format(
                (float) (
                    $data['Amount']
                    ?? 0
                ),
                2,
                '.',
                ''
            );

        if (
            ! hash_equals(
                $amount,
                $responseAmount
            )
        ) {
            throw new RuntimeException(
                'O valor devolvido pela Ifthenpay não corresponde à cobrança.'
            );
        }

        return new ProviderPaymentResult(
            status:
                BillingPayment::STATUS_PENDING,

            externalId:
                $requestId,

            providerReference:
                $orderId,

            entity:
                $entity,

            reference:
                $reference,

            expiresAt:
                $this->expiresAt(
                    $data,
                    $charge
                ),

            metadata: [
                'mock' => false,

                'sandbox' =>
                    (bool) config(
                        'billing.providers.ifthenpay.sandbox',
                        true
                    ),

                'order_id' =>
                    $orderId,

                'request_id' =>
                    $requestId,

                'provider_message' =>
                    $data['Message']
                    ?? null,
            ]
        );
    }

    private function orderId(
        BillingCharge $charge
    ): string {
        $number =
            trim(
                (string) $charge->number
            );

        if (
            $number !== '' &&
            mb_strlen(
                $number
            ) <= 25
        ) {
            return $number;
        }

        return
            'FP' .
            Str::upper(
                substr(
                    str_replace(
                        '-',
                        '',
                        $charge->id
                    ),
                    0,
                    23
                )
            );
    }

    private function expiryDays(): ?int
    {
        $value =
            config(
                'billing.providers.ifthenpay.multibanco_expiry_days',
                7
            );

        if (
            $value === null ||
            $value === ''
        ) {
            return null;
        }

        $days =
            (int) $value;

        $allowed = [
            ...range(
                0,
                32
            ),
            45,
            60,
            90,
            120,
        ];

        if (
            ! in_array(
                $days,
                $allowed,
                true
            )
        ) {
            throw ValidationException::withMessages([
                'provider' =>
                    'O prazo Multibanco da Ifthenpay é inválido.',
            ]);
        }

        return $days;
    }

    private function expiresAt(
        array $data,
        BillingCharge $charge
    ): ?CarbonInterface {
        $expiry =
            trim(
                (string) (
                    $data['ExpiryDate']
                    ?? ''
                )
            );

        if ($expiry === '') {
            return $charge->due_at;
        }

        try {
            return Carbon::createFromFormat(
                'd-m-Y',
                $expiry,
                config(
                    'app.timezone',
                    'Europe/Lisbon'
                )
            )->endOfDay();
        } catch (Throwable) {
            return $charge->due_at;
        }
    }
}