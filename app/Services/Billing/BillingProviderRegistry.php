<?php

namespace App\Services\Billing;

use Illuminate\Validation\ValidationException;

class BillingProviderRegistry
{
    public function __construct(
        private IfthenpayProvider $ifthenpay
    ) {}

    public function get(
        string $provider
    ): BillingProvider {
        return match (
            $provider
        ) {
            'ifthenpay' =>
                $this->ifthenpay,

            default =>
                throw ValidationException::withMessages([
                    'provider' =>
                        'O provider de pagamentos indicado não está disponível.',
                ]),
        };
    }
}