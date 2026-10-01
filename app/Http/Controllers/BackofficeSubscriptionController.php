<?php

namespace App\Http\Controllers;

use App\Http\Requests\BackofficeSubscriptionActionRequest;
use App\Http\Requests\ListBackofficeSubscriptionsRequest;
use App\Http\Requests\UpdateBackofficeSubscriptionRequest;
use App\Models\SaasSubscription;
use App\Services\SaasSubscriptionService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class BackofficeSubscriptionController extends Controller
{
    public function __construct(
        private SaasSubscriptionService $subscriptions
    ) {}

    public function index(
        ListBackofficeSubscriptionsRequest $request
    ): JsonResponse {
        $data =
            $request->validated();

        $search =
            $data['search']
            ?? null;

        $status =
            $data['status']
            ?? null;

        $billingCycle =
            $data['billing_cycle']
            ?? null;

        $perPage =
            $data['per_page']
            ?? 20;

        $query =
            SaasSubscription::query()
                ->with([
                    'tenant:id,nome,slug,nif,email,telefone,ativo',
                    'plan:id,codigo,nome,descricao,ativo',
                ]);

        if ($search) {
            $query->whereHas(
                'tenant',
                function (
                    Builder $query
                ) use ($search): void {
                    $query
                        ->where(
                            'nome',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'slug',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        if ($status) {
            $query->where(
                'status',
                $status
            );
        }

        if ($billingCycle) {
            $query->where(
                'billing_cycle',
                $billingCycle
            );
        }

        $paginator =
            $query
                ->orderByDesc(
                    'updated_at'
                )
                ->paginate(
                    $perPage
                );

        $items =
            collect(
                $paginator->items()
            )
                ->map(
                    fn (
                        SaasSubscription $subscription
                    ): array => $this->serialize(
                        $subscription
                    )
                )
                ->values();

        return response()->json([
            'data' => $items,

            'meta' => [
                'current_page' => $paginator->currentPage(),

                'last_page' => $paginator->lastPage(),

                'per_page' => $paginator->perPage(),

                'total' => $paginator->total(),

                'from' => $paginator->firstItem(),

                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $subscription =
            SaasSubscription::query()
                ->with([
                    'tenant:id,nome,slug,nif,email,telefone,ativo',
                    'plan:id,codigo,nome,descricao,ativo',
                ])
                ->findOrFail(
                    $id
                );

        return response()->json([
            'data' => $this->serialize(
                $subscription
            ),
        ]);
    }

    public function update(
        UpdateBackofficeSubscriptionRequest $request,
        string $id
    ): JsonResponse {
        $subscription =
            SaasSubscription::query()
                ->findOrFail(
                    $id
                );

        $subscription =
            $this
                ->subscriptions
                ->updateTerms(
                    $subscription,
                    $request->validated()
                );

        return response()->json([
            'message' => 'Condições da assinatura atualizadas com sucesso.',

            'data' => $this->serialize(
                $subscription
            ),
        ]);
    }

    public function action(
        BackofficeSubscriptionActionRequest $request,
        string $id
    ): JsonResponse {
        $subscription =
            SaasSubscription::query()
                ->findOrFail(
                    $id
                );

        $data =
            $request->validated();

        $subscription =
            $this
                ->subscriptions
                ->applyAction(
                    $subscription,
                    $data['action'],
                    $data['trial_days']
                        ?? null
                );

        return response()->json([
            'message' => $this->actionMessage(
                $data['action']
            ),

            'data' => $this->serialize(
                $subscription
            ),
        ]);
    }

    private function actionMessage(
        string $action
    ): string {
        return match ($action) {
            'suspend' => 'Assinatura suspensa com sucesso.',

            'reactivate' => 'Assinatura reativada com sucesso.',

            'schedule_cancel' => 'Cancelamento agendado para o fim do período atual.',

            'clear_cancel' => 'Cancelamento agendado removido.',

            'cancel_now' => 'Assinatura cancelada com sucesso.',

            'start_trial' => 'Período experimental iniciado com sucesso.',

            'end_trial' => 'Período experimental encerrado com sucesso.',

            default => 'Assinatura atualizada com sucesso.',
        };
    }

    private function serialize(
        SaasSubscription $subscription
    ): array {
        $subscription->loadMissing([
            'tenant',
            'plan',
        ]);

        return [
            'id' => $subscription->id,

            'status' => $subscription->status,

            'billing_cycle' => $subscription
                ->billing_cycle,

            'price_amount' => $subscription
                ->price_amount ===
                    null
                        ? null
                        : (float) $subscription
                            ->price_amount,

            'currency' => $subscription->currency,

            'starts_at' => $subscription->starts_at,

            'trial_ends_at' => $subscription
                ->trial_ends_at,

            'current_period_starts_at' => $subscription
                ->current_period_starts_at,

            'current_period_ends_at' => $subscription
                ->current_period_ends_at,

            'cancels_at' => $subscription
                ->cancels_at,

            'canceled_at' => $subscription
                ->canceled_at,

            'cancel_scheduled' => $subscription
                ->cancels_at !==
                null,

            'external_provider' => $subscription
                ->external_provider,

            'external_subscription_id' => $subscription
                ->external_subscription_id,

            'tenant' => $subscription->tenant
                    ? [
                        'id' => $subscription
                            ->tenant
                            ->id,

                        'nome' => $subscription
                            ->tenant
                            ->nome,

                        'slug' => $subscription
                            ->tenant
                            ->slug,

                        'nif' => $subscription
                            ->tenant
                            ->nif,

                        'email' => $subscription
                            ->tenant
                            ->email,

                        'telefone' => $subscription
                            ->tenant
                            ->telefone,

                        'ativo' => $subscription
                            ->tenant
                            ->ativo,
                    ]
                    : null,

            'plan' => $subscription->plan
                    ? [
                        'id' => $subscription
                            ->plan
                            ->id,

                        'codigo' => $subscription
                            ->plan
                            ->codigo,

                        'nome' => $subscription
                            ->plan
                            ->nome,

                        'descricao' => $subscription
                            ->plan
                            ->descricao,

                        'ativo' => $subscription
                            ->plan
                            ->ativo,
                    ]
                    : null,

            'created_at' => $subscription
                ->created_at,

            'updated_at' => $subscription
                ->updated_at,
        ];
    }
}
