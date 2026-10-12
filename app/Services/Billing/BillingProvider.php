<?php

namespace App\Services\Billing;

use App\Models\BillingCharge;

interface BillingProvider
{
    public function code(): string;

    public function supports(
        string $method
    ): bool;

    public function createPayment(
        BillingCharge $charge,
        string $method
    ): ProviderPaymentResult;
}