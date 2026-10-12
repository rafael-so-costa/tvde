<?php

namespace App\Http\Controllers;

use App\Models\AdOrder;
use App\Models\BillingPayment;
use App\Models\SaasSubscription;
use App\Services\Billing\BillingService;
use Illuminate\Http\JsonResponse;

class BackofficeBillingPaymentController extends Controller
{
    public function __construct(
        private BillingService $billing
    ) {}

    public function subscription(
        string $id
    ): JsonResponse {
        $subscription =
            SaasSubscription::query()
                ->with([
                    'tenant',
                    'plan',
                ])
                ->findOrFail(
                    $id
                );

        $payment =
            $this->billing
                ->createForSubscription(
                    $subscription
                );

        return response()->json([
            'message' =>
                $this->message(
                    $payment
                ),

            'data' =>
                $this->serialize(
                    $payment
                ),
        ], 201);
    }

    public function adOrder(
        string $id
    ): JsonResponse {
        $order =
            AdOrder::query()
                ->findOrFail(
                    $id
                );

        $payment =
            $this->billing
                ->createForAdOrder(
                    $order
                );

        return response()->json([
            'message' =>
                $this->message(
                    $payment
                ),

            'data' =>
                $this->serialize(
                    $payment
                ),
        ], 201);
    }

    public function simulate(
        string $id
    ): JsonResponse {
        $payment =
            BillingPayment::query()
                ->with('charge')
                ->findOrFail(
                    $id
                );

        $payment =
            $this->billing
                ->simulatePaid(
                    $payment
                );

        return response()->json([
            'message' =>
                'Pagamento MOCK confirmado com sucesso.',

            'data' =>
                $this->serialize(
                    $payment
                ),
        ]);
    }

    private function message(
        BillingPayment $payment
    ): string {
        return data_get(
            $payment->metadata,
            'mock'
        )
            ? 'Referência Multibanco MOCK criada para testes.'
            : 'Referência Multibanco criada com sucesso.';
    }

    private function serialize(
        BillingPayment $payment
    ): array {
        $payment->loadMissing(
            'charge'
        );

        return [
            'id' =>
                $payment->id,

            'provider' =>
                $payment->provider,

            'method' =>
                $payment->method,

            'status' =>
                $payment->status,

            'amount' =>
                (float) $payment->amount,

            'currency' =>
                $payment->currency,

            'entity' =>
                $payment->entity,

            'reference' =>
                $payment->reference,

            'provider_reference' =>
                $payment->provider_reference,

            'expires_at' =>
                $payment->expires_at,

            'paid_at' =>
                $payment->paid_at,

            'mock' =>
                (bool) data_get(
                    $payment->metadata,
                    'mock',
                    false
                ),

            'warning' =>
                data_get(
                    $payment->metadata,
                    'warning'
                ),

            'charge' => [
                'id' =>
                    $payment
                        ->charge
                        ->id,

                'number' =>
                    $payment
                        ->charge
                        ->number,

                'source_type' =>
                    $payment
                        ->charge
                        ->source_type,

                'source_id' =>
                    $payment
                        ->charge
                        ->source_id,

                'status' =>
                    $payment
                        ->charge
                        ->status,

                'description' =>
                    $payment
                        ->charge
                        ->description,

                'due_at' =>
                    $payment
                        ->charge
                        ->due_at,
            ],
        ];
    }
}