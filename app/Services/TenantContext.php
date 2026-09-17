<?php

namespace App\Services;

use App\Models\Tenant;
use RuntimeException;

class TenantContext
{
    private ?string $tenantId = null;

    public function set(?string $tenantId): void
    {
        $this->tenantId = $tenantId;
    }

    public function id(): ?string
    {
        return $this->tenantId;
    }

    public function hasTenant(): bool
    {
        return $this->tenantId !== null;
    }

    public function tenant(): ?Tenant
    {
        if (!$this->tenantId) {
            return null;
        }

        return Tenant::find($this->tenantId);
    }

    public function requireId(): string
    {
        if (!$this->tenantId) {
            throw new RuntimeException('Nenhum tenant definido no contexto atual.');
        }

        return $this->tenantId;
    }

    public function clear(): void
    {
        $this->tenantId = null;
    }
}
