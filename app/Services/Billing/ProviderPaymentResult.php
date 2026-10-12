<?php

namespace App\Services\Billing;

use Carbon\CarbonInterface;

readonly class ProviderPaymentResult
{
    public function __construct(
        public string $status,
        public string $externalId,
        public ?string $providerReference,
        public ?string $entity,
        public ?string $reference,
        public ?CarbonInterface $expiresAt,
        public array $metadata = []
    ) {}
}