<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\BillingPayment;
use App\Services\Billing\CouponCheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class BackofficeCouponCheckoutController extends Controller
{
    public function status(): JsonResponse
    {
        return response()->json([
            'data' => [
                'enabled' => (bool) config(
                    'billing.coupons.enabled',
                    false
                ),
            ],
        ]);
    }

    public function quote(
        Request $request,
        CouponCheckoutService $service
    ): JsonResponse {
        $data = $this->validated($request);

        return response()->json([
            'data' => $service->quote(
                $data['scope'],
                $data['source_id'],
                $data['coupon_code']
            ),
        ]);
    }

    public function checkout(
        Request $request,
        CouponCheckoutService $service
    ): JsonResponse {
        $data = $this->validated($request);

        $payment = $service->checkout(
            $data['scope'],
            $data['source_id'],
            $data['coupon_code']
        )->loadMissing('charge');

        return response()->json([
            'message' =>
                'Referência Multibanco emitida com desconto validado.',

            'data' => $this->payment($payment),
        ], 201);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'scope' => [
                'required',
                Rule::in([
                    'saas_subscription',
                    'ad_order',
                ]),
            ],

            'source_id' => [
                'required',
                'uuid',
            ],

            'coupon_code' => [
                'required',
                'string',
                'min:2',
                'max:64',
                'regex:/\A[A-Za-z0-9_-]{2,64}\z/',
            ],
        ]);

        $data['coupon_code'] = strtoupper(
            trim($data['coupon_code'])
        );

        return $data;
    }

    private function payment(BillingPayment $payment): array
    {
        $charge = $payment->charge;

        return [
            'id' => $payment->id,
            'provider' => $payment->provider,
            'method' => $payment->method,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'entity' => $payment->entity,
            'reference' => $payment->reference,
            'provider_reference' => $payment->provider_reference,
            'external_id' => $payment->external_id,

            'sandbox' => (bool) data_get(
                $payment->metadata,
                'sandbox',
                true
            ),

            'expires_at' => $payment->expires_at,
            'paid_at' => $payment->paid_at,

            'mock' => (bool) data_get(
                $payment->metadata,
                'mock',
                false
            ),

            'warning' => data_get(
                $payment->metadata,
                'warning'
            ),

            'charge' => $charge ? [
                'id' => $charge->id,
                'number' => $charge->number,
                'source_type' => $charge->source_type,
                'source_id' => $charge->source_id,
                'status' => $charge->status,
                'description' => $charge->description,
                'due_at' => $charge->due_at,
            ] : null,

            'coupon' => $charge ? [
                'subtotal' => (float) $charge->subtotal,
                'discount' => (float) $charge->discount,
                'total' => (float) $charge->total,
            ] : null,
        ];
    }
}