<?php

namespace App\Http\Controllers\Backoffice\Ads;

use App\Http\Controllers\Controller;
use App\Models\AdAdvertiser;
use App\Models\AdCategory;
use App\Models\AdPriceRule;
use App\Models\AdZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BackofficeAdCatalogController extends Controller
{
    public function advertisers(Request $request): JsonResponse
    {
        $query = AdAdvertiser::query()
            ->with('tenant:id,nome')
            ->withCount('campaigns')
            ->orderBy('name');

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('legal_name', 'like', "%{$search}%")
                    ->orWhere('nif', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function storeAdvertiser(Request $request): JsonResponse
    {
        $data = $request->validate(
            $this->advertiserRules()
        );

        if ($data['type'] === AdAdvertiser::TYPE_SAAS) {
            $data['verified_at'] = now();
            $data['verified_by_user_id'] = $request->user()->id;
        }

        $advertiser = AdAdvertiser::create($data);

        return response()->json([
            'message' => 'Anunciante criado com sucesso.',
            'data' => $advertiser,
        ], 201);
    }

    public function updateAdvertiser(
        Request $request,
        string $id
    ): JsonResponse {
        $advertiser = AdAdvertiser::query()->findOrFail($id);

        $advertiser->fill(
            $request->validate(
                $this->advertiserRules()
            )
        );

        $advertiser->save();

        return response()->json([
            'message' => 'Anunciante atualizado.',
            'data' => $advertiser->fresh(),
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => AdCategory::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $category = AdCategory::create(
            $request->validate(
                $this->categoryRules()
            )
        );

        return response()->json([
            'message' => 'Categoria criada.',
            'data' => $category,
        ], 201);
    }

    public function updateCategory(
        Request $request,
        string $id
    ): JsonResponse {
        $category = AdCategory::query()->findOrFail($id);

        $category->fill(
            $request->validate(
                $this->categoryRules($category->id)
            )
        );

        $category->save();

        return response()->json([
            'message' => 'Categoria atualizada.',
            'data' => $category->fresh(),
        ]);
    }

    public function zones(): JsonResponse
    {
        return response()->json([
            'data' => AdZone::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storeZone(Request $request): JsonResponse
    {
        $zone = AdZone::create(
            $request->validate(
                $this->zoneRules()
            )
        );

        return response()->json([
            'message' => 'Zona publicitária criada.',
            'data' => $zone,
        ], 201);
    }

    public function updateZone(
        Request $request,
        string $id
    ): JsonResponse {
        $zone = AdZone::query()->findOrFail($id);

        $zone->fill(
            $request->validate(
                $this->zoneRules($zone->id)
            )
        );

        $zone->save();

        return response()->json([
            'message' => 'Zona publicitária atualizada.',
            'data' => $zone->fresh(),
        ]);
    }

    public function priceRules(): JsonResponse
    {
        return response()->json([
            'data' => AdPriceRule::query()
                ->with([
                    'zone:id,name,code',
                    'category:id,name,slug',
                ])
                ->orderBy('priority')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storePriceRule(Request $request): JsonResponse
    {
        $rule = AdPriceRule::create(
            $request->validate(
                $this->priceRuleRules()
            )
        );

        return response()->json([
            'message' => 'Regra de preço criada.',
            'data' => $rule,
        ], 201);
    }

    public function updatePriceRule(
        Request $request,
        string $id
    ): JsonResponse {
        $rule = AdPriceRule::query()->findOrFail($id);

        $rule->fill(
            $request->validate(
                $this->priceRuleRules()
            )
        );

        $rule->save();

        return response()->json([
            'message' => 'Regra de preço atualizada.',
            'data' => $rule->fresh(),
        ]);
    }

    public function destroyPriceRule(string $id): JsonResponse
    {
        AdPriceRule::query()
            ->findOrFail($id)
            ->delete();

        return response()->json([
            'message' => 'Regra de preço eliminada.',
        ]);
    }

    private function advertiserRules(): array
    {
        return [
            'tenant_id' => ['nullable', 'uuid', 'exists:tenants,id'],
            'type' => ['required', Rule::in(AdAdvertiser::types())],
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'nif' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url', 'max:2048'],
            'status' => ['required', Rule::in(AdAdvertiser::statuses())],
            'metadata' => ['nullable', 'array'],
        ];
    }

    private function categoryRules(?string $ignoreId = null): array
    {
        return [
            'parent_id' => ['nullable', 'uuid', 'exists:ad_categories,id'],
            'slug' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9][a-z0-9-]*$/',
                Rule::unique('ad_categories', 'slug')->ignore($ignoreId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'active' => ['required', 'boolean'],
            'allowed_on_public' => ['required', 'boolean'],
            'requires_special_review' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
        ];
    }

    private function zoneRules(?string $ignoreId = null): array
    {
        return [
            'code' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9][a-z0-9_]*$/',
                Rule::unique('ad_zones', 'code')->ignore($ignoreId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'channel' => ['required', Rule::in(AdZone::channels())],
            'audience' => ['nullable', Rule::in(['driver', 'owner', 'manager'])],
            'description' => ['nullable', 'string', 'max:5000'],
            'max_concurrent_campaigns' => ['required', 'integer', 'min:1'],
            'saas_reserved_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'allowed_sources' => ['nullable', 'array'],
            'allowed_sources.*' => ['required', Rule::in(['saas', 'tenant', 'external'])],
            'allowed_categories' => ['nullable', 'array'],
            'allowed_categories.*' => ['string'],
            'active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
        ];
    }

    private function priceRuleRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'zone_id' => ['nullable', 'uuid', 'exists:ad_zones,id'],
            'category_id' => ['nullable', 'uuid', 'exists:ad_categories,id'],
            'channel' => ['nullable', Rule::in(AdZone::channels())],
            'audience' => ['nullable', Rule::in(['driver', 'owner', 'manager'])],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'priority' => ['required', 'integer', 'min:0'],
            'active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
