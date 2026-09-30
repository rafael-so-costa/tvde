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
        $override = $this->featureOverride(
            $tenant,
            $feature
        );

        if ($override !== null) {
            return $override;
        }

        $planValue = data_get(
            $tenant->saasPlan?->features,
            $feature
        );

        if ($planValue !== null) {
            return (bool) $planValue;
        }

        $settings = $tenant->settings ?? [];

        if ($tenant->saas_plan_id === null) {
            $legacyValue = data_get(
                $settings,
                "features.{$feature}"
            );

            if ($legacyValue !== null) {
                return (bool) $legacyValue;
            }
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

    public function featureOverride(
        Tenant $tenant,
        string $feature
    ): ?bool {
        $value = data_get(
            $tenant->settings ?? [],
            "saas_overrides.features.{$feature}"
        );

        if ($value === null) {
            return null;
        }

        return (bool) $value;
    }

    public function limit(
        Tenant $tenant,
        string $resource
    ): ?int {
        $override = $this->limitOverride(
            $tenant,
            $resource
        );

        if ($override !== null) {
            return $override;
        }

        $planLimit = data_get(
            $tenant->saasPlan?->limits,
            $resource
        );

        if ($planLimit !== null) {
            return max(
                0,
                (int) $planLimit
            );
        }

        if ($tenant->saas_plan_id === null) {
            $legacyLimit = data_get(
                $tenant->settings ?? [],
                "limits.{$resource}"
            );

            if ($legacyLimit !== null) {
                return max(
                    0,
                    (int) $legacyLimit
                );
            }
        }

        return null;
    }

    public function limitOverride(
        Tenant $tenant,
        string $resource
    ): ?int {
        $value = data_get(
            $tenant->settings ?? [],
            "saas_overrides.limits.{$resource}"
        );

        if ($value === null) {
            return null;
        }

        return max(
            0,
            (int) $value
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
        $limit = $this->limit(
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
