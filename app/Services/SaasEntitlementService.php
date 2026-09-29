<?php

namespace App\Services;

use App\Models\Tenant;

class SaasEntitlementService
{
    public function feature(
        Tenant $tenant,
        string $feature,
        bool $default = false
    ): bool {
        $settings =
            $tenant->settings ?? [];

        $override = data_get(
            $settings,
            "features.{$feature}"
        );

        if ($override !== null) {
            return (bool) $override;
        }

        $planValue = data_get(
            $tenant->saasPlan?->features,
            $feature
        );

        if ($planValue !== null) {
            return (bool) $planValue;
        }

        if (
            $feature ===
            'multi_company'
        ) {
            return ! array_key_exists(
                'onboarding',
                $settings
            );
        }

        return $default;
    }

    public function limit(
        Tenant $tenant,
        string $resource
    ): ?int {
        $settings =
            $tenant->settings ?? [];

        $override = data_get(
            $settings,
            "limits.{$resource}"
        );

        if ($override !== null) {
            return max(
                0,
                (int) $override
            );
        }

        $planLimit = data_get(
            $tenant->saasPlan?->limits,
            $resource
        );

        if ($planLimit === null) {
            return null;
        }

        return max(
            0,
            (int) $planLimit
        );
    }

    public function usage(
        Tenant $tenant,
        string $resource
    ): int {
        return match ($resource) {
            'empresas' => $tenant
                ->empresas()
                ->count(),

            'veiculos' => $tenant
                ->veiculos()
                ->count(),

            'motoristas' => $tenant
                ->motoristas()
                ->count(),

            'utilizadores' => $tenant
                ->tenantUsers()
                ->where(
                    'status',
                    'ativo'
                )
                ->count(),

            default => 0,
        };
    }

    public function canCreate(
        Tenant $tenant,
        string $resource
    ): bool {
        $limit =
            $this->limit(
                $tenant,
                $resource
            );

        if ($limit === null) {
            return true;
        }

        return $this->usage(
            $tenant,
            $resource
        ) < $limit;
    }

    public function multiCompanyEnabled(
        Tenant $tenant
    ): bool {
        return $this->feature(
            $tenant,
            'multi_company'
        );
    }
}
