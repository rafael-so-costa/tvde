<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Administracao global: as rotas exigem auth:sanctum + super_admin. */
final class BackofficeCouponController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'enabled' => ['nullable', 'in:0,1'],
            'applies_to' => ['nullable', Rule::in([
                SaasCoupon::SCOPE_SAAS, SaasCoupon::SCOPE_ADS,
                SaasCoupon::SCOPE_BOTH,
            ])],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = $this->detailedQuery();
        if (filled($filters['q'] ?? null)) {
            $term = addcslashes(trim($filters['q']), '%_\\');
            $query->where(function ($q) use ($term): void {
                $q->where('code', 'like', "%{$term}%")
                  ->orWhere('name', 'like', "%{$term}%");
            });
        }
        if (array_key_exists('enabled', $filters)) {
            $query->where('enabled', $filters['enabled'] === '1');
        }
        if (filled($filters['applies_to'] ?? null)) {
            $query->where('applies_to', $filters['applies_to']);
        }

        $page = $query->orderByDesc('created_at')->paginate(15);
        $page->setCollection($page->getCollection()->map(
            fn (SaasCoupon $coupon): array => $this->serialize($coupon)
        ));

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
            ],
            'module_enabled' => (bool) config('billing.coupons.enabled', false),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $coupon = $this->detailedQuery()->findOrFail($id);
        return response()->json(['data' => $this->serialize($coupon)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['enabled'] = (bool) ($data['enabled'] ?? false);
        $data['first_payment_only'] = (bool) ($data['first_payment_only'] ?? true);
        $coupon = SaasCoupon::create($data);

        return response()->json([
            'message' => 'Cupão criado.',
            'data' => $this->serialize($this->detailedQuery()->findOrFail($coupon->id)),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $this->validated($request, $id);

        $coupon = DB::transaction(function () use ($id, $data): SaasCoupon {
            $coupon = SaasCoupon::query()->lockForUpdate()->findOrFail($id);

            // Nao reescrever termos historicos depois de existir qualquer tentativa.
            if ($coupon->redemptions()->exists()) {
                foreach (['code', 'discount_type', 'discount_value', 'applies_to',
                    'first_payment_only', 'min_subtotal'] as $field) {
                    if (array_key_exists($field, $data)
                        && (string) ($coupon->{$field} ?? '') !== (string) ($data[$field] ?? '')) {
                        throw ValidationException::withMessages([
                            $field => 'Este campo não pode ser alterado após a primeira utilização.',
                        ]);
                    }
                }
            }

            $candidate = array_merge($coupon->only([
                'code', 'discount_type', 'discount_value', 'applies_to',
                'enabled', 'first_payment_only', 'min_subtotal',
                'max_redemptions', 'max_per_customer', 'starts_at', 'expires_at',
            ]), $data);
            $this->assertTerms($candidate);

            $active = $coupon->redemptions()
                ->where(function ($query): void {
                    $query->where('status', SaasCouponRedemption::STATUS_REDEEMED)
                        ->orWhere(function ($q): void {
                            $q->where('status', SaasCouponRedemption::STATUS_RESERVED)
                                ->where(function ($hold): void {
                                    $hold->whereNotNull('billing_charge_id')
                                        ->orWhere('reserved_until', '>', now('UTC'));
                                });
                        });
                });

            if ($candidate['max_redemptions'] !== null
                && $active->count() > (int) $candidate['max_redemptions']) {
                throw ValidationException::withMessages([
                    'max_redemptions' => 'Limite inferior às utilizações já comprometidas.',
                ]);
            }
            if ($candidate['max_per_customer'] !== null) {
                $peak = (clone $active)->selectRaw('customer_type, customer_id, count(*) as total')
                    ->groupBy('customer_type', 'customer_id')
                    ->orderByDesc('total')->first();
                if ($peak && (int) $peak->total > (int) $candidate['max_per_customer']) {
                    throw ValidationException::withMessages([
                        'max_per_customer' => 'Limite inferior às utilizações existentes por cliente.',
                    ]);
                }
            }

            $coupon->fill($data);
            $coupon->save();
            return $coupon;
        }, 3);

        return response()->json([
            'message' => 'Cupão atualizado.',
            'data' => $this->serialize($this->detailedQuery()->findOrFail($coupon->id)),
        ]);
    }

    public function history(Request $request, string $id): JsonResponse
    {
        SaasCoupon::query()->findOrFail($id);
        $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);
        $page = SaasCouponRedemption::query()
            ->where('saas_coupon_id', $id)
            ->orderByDesc('created_at')
            ->paginate(20);
        $page->setCollection($page->getCollection()->map(function (SaasCouponRedemption $r): array {
            return [
                'id' => $r->id,
                'status' => $r->status,
                'source_type' => $r->source_type,
                'source_id' => $r->source_id,
                'billing_charge_id' => $r->billing_charge_id,
                'subtotal_amount' => (string) $r->subtotal_amount,
                'discount_amount' => (string) $r->discount_amount,
                'currency' => $r->currency,
                'reserved_until' => $r->reserved_until?->toIso8601String(),
                'redeemed_at' => $r->redeemed_at?->toIso8601String(),
                'created_at' => $r->created_at?->toIso8601String(),
            ];
        }));
        return response()->json([
            'data' => $page->items(),
            'meta' => ['total' => $page->total(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage()],
        ]);
    }

    private function detailedQuery()
    {
        return SaasCoupon::query()->withCount([
            'redemptions as usage_count',
            'redemptions as redeemed_count' => fn ($q) =>
                $q->where('status', SaasCouponRedemption::STATUS_REDEEMED),
            'redemptions as reserved_count' => fn ($q) =>
                $q->where('status', SaasCouponRedemption::STATUS_RESERVED),
        ])->withSum([
            'redemptions as saved_amount' => fn ($q) =>
                $q->where('status', SaasCouponRedemption::STATUS_REDEEMED),
        ], 'discount_amount');
    }

    private function serialize(SaasCoupon $coupon): array
    {
        return [
            'id' => $coupon->id, 'code' => $coupon->code,
            'name' => $coupon->name, 'description' => $coupon->description,
            'discount_type' => $coupon->discount_type,
            'discount_value' => (string) $coupon->discount_value,
            'applies_to' => $coupon->applies_to,
            'enabled' => (bool) $coupon->enabled,
            'first_payment_only' => (bool) $coupon->first_payment_only,
            'min_subtotal' => $coupon->min_subtotal === null ? null : (string) $coupon->min_subtotal,
            'max_redemptions' => $coupon->max_redemptions,
            'max_per_customer' => $coupon->max_per_customer,
            'starts_at' => $coupon->starts_at?->toIso8601String(),
            'expires_at' => $coupon->expires_at?->toIso8601String(),
            'usage_count' => (int) ($coupon->usage_count ?? 0),
            'redeemed_count' => (int) ($coupon->redeemed_count ?? 0),
            'reserved_count' => (int) ($coupon->reserved_count ?? 0),
            'saved_amount' => (string) ($coupon->saved_amount ?? '0.00'),
            'created_at' => $coupon->created_at?->toIso8601String(),
        ];
    }

    private function validated(Request $request, ?string $id = null): array
    {
        if ($request->exists('code')) {
            $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);
        }
        $required = $id === null ? 'required' : 'sometimes';
        $data = $request->validate([
            'code' => [$required, 'string', 'regex:/\A[A-Z0-9_-]{2,64}\z/',
                Rule::unique('saas_coupons', 'code')->ignore($id)],
            'name' => [$required, 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'discount_type' => [$required, Rule::in([SaasCoupon::TYPE_FIXED, SaasCoupon::TYPE_PERCENTAGE])],
            'discount_value' => [$required, 'numeric', 'gt:0', 'decimal:0,2', 'max:9999999999'],
            'applies_to' => [$required, Rule::in([
                SaasCoupon::SCOPE_SAAS, SaasCoupon::SCOPE_ADS, SaasCoupon::SCOPE_BOTH,
            ])],
            'enabled' => ['sometimes', 'boolean'],
            'first_payment_only' => ['sometimes', 'boolean'],
            'min_subtotal' => ['sometimes', 'nullable', 'numeric', 'min:0', 'decimal:0,2'],
            'max_redemptions' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000000'],
            'max_per_customer' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000000'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $this->assertTerms(array_merge($id === null ? [] : SaasCoupon::findOrFail($id)->only([
            'discount_type', 'discount_value', 'starts_at', 'expires_at',
        ]), $data));
        return $data;
    }

    private function assertTerms(array $data): void
    {
        if (($data['discount_type'] ?? null) === SaasCoupon::TYPE_PERCENTAGE
            && isset($data['discount_value'])
            && (float) $data['discount_value'] > 100) {
            throw ValidationException::withMessages([
                'discount_value' => 'A percentagem não pode ultrapassar 100%.',
            ]);
        }
        $start = $data['starts_at'] ?? null;
        $end = $data['expires_at'] ?? null;
        if ($start && $end && strtotime((string) $end) <= strtotime((string) $start)) {
            throw ValidationException::withMessages([
                'expires_at' => 'A validade final deve ser posterior ao início.',
            ]);
        }
    }
}