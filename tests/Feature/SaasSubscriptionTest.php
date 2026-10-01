<?php

use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use App\Services\SaasSubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function subscriptionPlan(
    string $codigo,
    string $nome,
    int $ordem
): SaasPlan {
    return SaasPlan::create([
        'codigo' => $codigo,

        'nome' => $nome,

        'ativo' => true,

        'limits' => [
            'empresas' => 1,
            'veiculos' => 10,
            'motoristas' => 10,
            'utilizadores' => 5,
        ],

        'features' => [
            'multi_company' => false,
            'integracoes' => false,
            'relatorios_avancados' => false,
        ],

        'ordem' => $ordem,
    ]);
}

function subscriptionTenant(
    SaasPlan $plan
): Tenant {
    return Tenant::create([
        'saas_plan_id' => $plan->id,

        'nome' => 'Cliente Assinatura',

        'slug' => 'cliente-assinatura',

        'nif' => '509800001',

        'email' => 'assinatura@cliente.test',

        'ativo' => true,
    ]);
}

test(
    'serviço cria assinatura inicial do tenant',
    function () {
        $plan =
            subscriptionPlan(
                'starter-assinatura',
                'Starter Assinatura',
                10
            );

        $tenant =
            subscriptionTenant(
                $plan
            );

        $subscription =
            app(
                SaasSubscriptionService::class
            )
                ->ensureForTenant(
                    $tenant,
                    $plan
                );

        expect(
            $subscription->tenant_id
        )->toBe(
            $tenant->id
        );

        expect(
            $subscription->saas_plan_id
        )->toBe(
            $plan->id
        );

        expect(
            $subscription->status
        )->toBe(
            SaasSubscription::STATUS_ACTIVE
        );

        expect(
            $subscription->billing_cycle
        )->toBe(
            SaasSubscription::BILLING_MONTHLY
        );

        expect(
            $subscription->currency
        )->toBe(
            'EUR'
        );

        expect(
            $subscription->starts_at
        )->not->toBeNull();

        expect(
            $subscription->current_period_starts_at
        )->not->toBeNull();

        expect(
            $subscription->current_period_ends_at
        )->not->toBeNull();
    }
);

test(
    'ensure não duplica assinatura existente',
    function () {
        $plan =
            subscriptionPlan(
                'starter-unico',
                'Starter Único',
                10
            );

        $tenant =
            subscriptionTenant(
                $plan
            );

        $service =
            app(
                SaasSubscriptionService::class
            );

        $first =
            $service
                ->ensureForTenant(
                    $tenant,
                    $plan
                );

        $second =
            $service
                ->ensureForTenant(
                    $tenant,
                    $plan
                );

        expect(
            $second->id
        )->toBe(
            $first->id
        );

        expect(
            SaasSubscription::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'troca de plano sincroniza tenant e assinatura',
    function () {
        $starter =
            subscriptionPlan(
                'starter-sync',
                'Starter Sync',
                10
            );

        $pro =
            subscriptionPlan(
                'pro-sync',
                'Pro Sync',
                20
            );

        $tenant =
            subscriptionTenant(
                $starter
            );

        $service =
            app(
                SaasSubscriptionService::class
            );

        $subscription =
            $service
                ->ensureForTenant(
                    $tenant,
                    $starter
                );

        $startsAt =
            $subscription
                ->starts_at
                ->toISOString();

        $periodStartsAt =
            $subscription
                ->current_period_starts_at
                ->toISOString();

        $periodEndsAt =
            $subscription
                ->current_period_ends_at
                ->toISOString();

        $updated =
            $service
                ->changePlan(
                    $tenant,
                    $pro
                );

        expect(
            $tenant
                ->refresh()
                ->saas_plan_id
        )->toBe(
            $pro->id
        );

        expect(
            $updated->saas_plan_id
        )->toBe(
            $pro->id
        );

        expect(
            $updated
                ->plan
                ->codigo
        )->toBe(
            'pro-sync'
        );

        expect(
            $updated
                ->starts_at
                ->toISOString()
        )->toBe(
            $startsAt
        );

        expect(
            $updated
                ->current_period_starts_at
                ->toISOString()
        )->toBe(
            $periodStartsAt
        );

        expect(
            $updated
                ->current_period_ends_at
                ->toISOString()
        )->toBe(
            $periodEndsAt
        );
    }
);

test(
    'troca de plano cria assinatura para tenant legado',
    function () {
        $starter =
            subscriptionPlan(
                'starter-legado',
                'Starter Legado',
                10
            );

        $pro =
            subscriptionPlan(
                'pro-legado',
                'Pro Legado',
                20
            );

        $tenant =
            subscriptionTenant(
                $starter
            );

        expect(
            $tenant
                ->saasSubscription()
                ->exists()
        )->toBeFalse();

        $subscription =
            app(
                SaasSubscriptionService::class
            )
                ->changePlan(
                    $tenant,
                    $pro
                );

        expect(
            $subscription->saas_plan_id
        )->toBe(
            $pro->id
        );

        expect(
            $tenant
                ->refresh()
                ->saas_plan_id
        )->toBe(
            $pro->id
        );

        expect(
            $tenant
                ->saasSubscription()
                ->count()
        )->toBe(1);
    }
);
