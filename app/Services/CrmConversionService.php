<?php

namespace App\Services;

use App\Models\CrmLead;
use App\Models\CrmPipelineStage;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CrmConversionService
{
    public function __construct(
        private readonly CrmLeadService $leadService,
        private readonly SaasSubscriptionService $subscriptionService
    ) {}

    public function convert(
        CrmLead $lead,
        SaasPlan $plan,
        array $data,
        ?User $actor = null
    ): array {
        return DB::transaction(
            function () use (
                $lead,
                $plan,
                $data,
                $actor
            ): array {
                if (
                    $lead
                        ->converted_tenant_id
                ) {
                    throw ValidationException::withMessages([
                        'lead' => 'Este lead já foi convertido num cliente FrotaPRO.',
                    ]);
                }

                if (! $plan->ativo) {
                    throw ValidationException::withMessages([
                        'saas_plan_id' => 'O plano selecionado está inativo.',
                    ]);
                }

                $existingTenant =
                    $lead->nif
                        ? Tenant::query()
                            ->where(
                                'nif',
                                $lead->nif
                            )
                            ->first()
                        : null;

                if ($existingTenant) {
                    $otherLead =
                        CrmLead::query()
                            ->where(
                                'converted_tenant_id',
                                $existingTenant->id
                            )
                            ->where(
                                'id',
                                '!=',
                                $lead->id
                            )
                            ->first();

                    if ($otherLead) {
                        throw ValidationException::withMessages([
                            'nif' => 'Este NIF já pertence a um cliente convertido por outro lead.',
                        ]);
                    }
                }

                $tenantCreated =
                    $existingTenant ===
                    null;

                $tenant =
                    $existingTenant
                    ?? $this->createTenant(
                        $lead,
                        $plan,
                        $data
                    );

                /*
                 * Se encontrámos um Tenant já existente pelo NIF,
                 * não sobrescrevemos automaticamente o plano ou
                 * assinatura comercial que ele já possui.
                 */
                if (
                    ! $tenantCreated &&
                    ! $tenant->saas_plan_id
                ) {
                    $tenant->saas_plan_id =
                        $plan->id;

                    $tenant->save();
                }

                $subscription =
                    $this->resolveSubscription(
                        tenant: $tenant,
                        selectedPlan: $plan,
                        tenantCreated: $tenantCreated
                    );

                $trialDays = max(
                    0,
                    (int) (
                        $data[
                            'trial_days'
                        ]
                        ?? 0
                    )
                );

                if (
                    $tenantCreated &&
                    $trialDays > 0
                ) {
                    $subscription =
                        $this
                            ->subscriptionService
                            ->applyAction(
                                $subscription,
                                'start_trial',
                                $trialDays
                            );
                }

                $customerStage =
                    CrmPipelineStage::query()
                        ->where(
                            'code',
                            'customer'
                        )
                        ->where(
                            'is_active',
                            true
                        )
                        ->first();

                if (! $customerStage) {
                    throw ValidationException::withMessages([
                        'pipeline' => 'A etapa Cliente não está disponível no pipeline CRM.',
                    ]);
                }

                $lead->converted_tenant_id =
                    $tenant->id;

                $lead->converted_at =
                    now();

                $lead->next_follow_up_at =
                    null;

                $lead->lost_reason =
                    null;

                $lead->save();

                $lead =
                    $this
                        ->leadService
                        ->moveStage(
                            lead: $lead,
                            stage: $customerStage,
                            actor: $actor,
                            note: $tenantCreated
                                ? 'Lead convertido num novo cliente FrotaPRO.'
                                : 'Lead associado a um cliente FrotaPRO já existente.',
                            lostReason: null,
                            nextFollowUpAt: null,
                            allowCustomer: true
                        );

                return [
                    'lead' => $lead,

                    'tenant' => $tenant
                        ->refresh()
                        ->load([
                            'saasPlan',
                            'saasSubscription.plan',
                        ]),

                    'subscription' => $subscription
                        ->refresh()
                        ->load([
                            'plan',
                            'tenant',
                        ]),

                    'tenant_created' => $tenantCreated,

                    'trial_started' => $tenantCreated &&
                        $trialDays > 0,
                ];
            }
        );
    }

    private function createTenant(
        CrmLead $lead,
        SaasPlan $plan,
        array $data
    ): Tenant {
        $name = trim(
            (string) (
                $data[
                    'tenant_name'
                ]
                ?? $lead
                    ->company_name
            )
        );

        if ($name === '') {
            throw ValidationException::withMessages([
                'tenant_name' => 'Não foi possível determinar o nome da organização.',
            ]);
        }

        $slug =
            ! empty(
                $data[
                    'tenant_slug'
                ]
            )
                ? trim(
                    strtolower(
                        (string) $data[
                            'tenant_slug'
                        ]
                    )
                )
                : $this->uniqueSlug(
                    $name
                );

        if (
            Tenant::query()
                ->where(
                    'slug',
                    $slug
                )
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'tenant_slug' => 'Este identificador de organização já está em utilização.',
            ]);
        }

        return Tenant::create([
            'nome' => $name,

            'slug' => $slug,

            'nif' => $lead->nif,

            'email' => $data['email']
                ?? $lead->email,

            'telefone' => $data['phone']
                ?? $lead->phone,

            'ativo' => true,

            'saas_plan_id' => $plan->id,

            'settings' => [
                'crm_origin' => [
                    'lead_id' => $lead->id,

                    'source' => $lead->source,

                    'converted_at' => now()
                        ->toIso8601String(),
                ],
            ],
        ]);
    }

    private function resolveSubscription(
        Tenant $tenant,
        SaasPlan $selectedPlan,
        bool $tenantCreated
    ): SaasSubscription {
        if ($tenantCreated) {
            return $this
                ->subscriptionService
                ->ensureForTenant(
                    $tenant,
                    $selectedPlan
                );
        }

        $subscription =
            SaasSubscription::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->first();

        if ($subscription) {
            return $subscription
                ->load([
                    'tenant',
                    'plan',
                ]);
        }

        $plan =
            $tenant
                ->saasPlan()
                ->first()
            ?? $selectedPlan;

        if (
            ! $tenant
                ->saas_plan_id
        ) {
            $tenant->saas_plan_id =
                $plan->id;

            $tenant->save();
        }

        return $this
            ->subscriptionService
            ->ensureForTenant(
                $tenant,
                $plan
            );
    }

    private function uniqueSlug(
        string $name
    ): string {
        $base = Str::slug(
            $name
        );

        if ($base === '') {
            $base = 'cliente';
        }

        $base = Str::limit(
            $base,
            100,
            ''
        );

        $slug = $base;
        $suffix = 2;

        while (
            Tenant::query()
                ->where(
                    'slug',
                    $slug
                )
                ->exists()
        ) {
            $candidateSuffix =
                '-'.$suffix;

            $slug =
                Str::limit(
                    $base,
                    120 -
                        strlen(
                            $candidateSuffix
                        ),
                    ''
                )
                .$candidateSuffix;

            $suffix++;
        }

        return $slug;
    }
}
