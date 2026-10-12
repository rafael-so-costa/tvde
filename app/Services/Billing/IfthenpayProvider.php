<?php

namespace App\Services\Billing;

use App\Models\BillingCharge;
use App\Models\BillingPayment;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class IfthenpayProvider implements BillingProvider
{
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

        $sandbox =
            (bool) config(
                'billing.providers.ifthenpay.sandbox',
                true
            );

        $mbKey =
            config(
                'billing.providers.ifthenpay.mb_key'
            );

        /*
         * Enquanto não existem credenciais de teste,
         * utilizamos uma referência MOCK.
         *
         * Esta referência nunca deve ser apresentada
         * como referência bancária real.
         */
        if (
            $sandbox &&
            blank(
                $mbKey
            )
        ) {
            return $this->mockMultibanco(
                $charge
            );
        }

        if (
            blank(
                $mbKey
            )
        ) {
            throw ValidationException::withMessages([
                'provider' =>
                    'A MB KEY da Ifthenpay não está configurada.',
            ]);
        }

        /*
         * A chamada REST real será ativada quando
         * recebermos as credenciais oficiais/teste.
         */
        throw new RuntimeException(
            'A ligação real à API Multibanco da Ifthenpay ainda não está ativada.'
        );
    }

    private function mockMultibanco(
        BillingCharge $charge
    ): ProviderPaymentResult {
        $hash =
            abs(
                crc32(
                    $charge->id
                )
            );

        $reference =
            str_pad(
                (string) (
                    $hash %
                    1000000000
                ),
                9,
                '0',
                STR_PAD_LEFT
            );

        return new ProviderPaymentResult(
            status:
                BillingPayment::STATUS_PENDING,

            externalId:
                'mock_' .
                Str::lower(
                    Str::random(24)
                ),

            providerReference:
                'mock:' .
                $charge->number,

            entity:
                '99999',

            reference:
                $reference,

            expiresAt:
                $charge->due_at,

            metadata: [
                'mock' => true,

                'sandbox' => true,

                'warning' =>
                    'Referência de teste. Não efetuar pagamento bancário.',
            ]
        );
    }
}