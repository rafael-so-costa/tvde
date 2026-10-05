<?php

namespace App\Http\Controllers\Backoffice\Ads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ads\BackofficeAdCampaignActionRequest;
use App\Http\Requests\Ads\StoreBackofficeAdCampaignRequest;
use App\Http\Requests\Ads\UpdateBackofficeAdCampaignRequest;
use App\Models\AdCampaign;
use App\Services\Ads\AdAdminSerializer;
use App\Services\Ads\AdCampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BackofficeAdCampaignController extends Controller
{
    public function __construct(
        private readonly AdCampaignService $campaigns,
        private readonly AdAdminSerializer $serializer
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(AdCampaign::statuses())],
            'statuses' => ['nullable', 'array'],
            'statuses.*' => [Rule::in(AdCampaign::statuses())],
            'source' => ['nullable', Rule::in(AdCampaign::sources())],
            'kind' => ['nullable', Rule::in(AdCampaign::kinds())],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $query = AdCampaign::query()
            ->with([
                'advertiser',
                'category',
                'tenant',
            ])
            ->orderByDesc('created_at');

        if ($search = trim((string) ($data['search'] ?? ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhereHas(
                        'advertiser',
                        fn ($advertiser) => $advertiser
                            ->where('name', 'like', "%{$search}%")
                    );
            });
        }

        if ($status = $data['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($statuses = $data['statuses'] ?? null) {
            $query->whereIn('status', $statuses);
        }

        if ($source = $data['source'] ?? null) {
            $query->where('source', $source);
        }

        if ($kind = $data['kind'] ?? null) {
            $query->where('kind', $kind);
        }

        $paginator = $query->paginate(
            $data['per_page'] ?? 20
        );

        return response()->json([
            'data' => collect($paginator->items())
                ->map(
                    fn (AdCampaign $campaign) => $this
                        ->serializer
                        ->campaignSummary($campaign)
                )
                ->values(),
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

    public function store(
        StoreBackofficeAdCampaignRequest $request
    ): JsonResponse {
        $campaign = $this->campaigns->create(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Campanha criada com sucesso.',
            'data' => $this->serializer->campaignDetail($campaign),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $campaign = AdCampaign::query()->findOrFail($id);

        return response()->json([
            'data' => $this->serializer->campaignDetail($campaign),
        ]);
    }

    public function update(
        UpdateBackofficeAdCampaignRequest $request,
        string $id
    ): JsonResponse {
        $campaign = AdCampaign::query()->findOrFail($id);

        $campaign = $this->campaigns->update(
            $campaign,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Campanha atualizada.',
            'data' => $this->serializer->campaignDetail($campaign),
        ]);
    }

    public function action(
        BackofficeAdCampaignActionRequest $request,
        string $id
    ): JsonResponse {
        $campaign = AdCampaign::query()->findOrFail($id);
        $data = $request->validated();

        $campaign = $this->campaigns->action(
            $campaign,
            $data['action'],
            $request->user(),
            $data['reason'] ?? null,
            $data['notes'] ?? null
        );

        return response()->json([
            'message' => 'Campanha atualizada com sucesso.',
            'data' => $this->serializer->campaignDetail($campaign),
        ]);
    }
}
