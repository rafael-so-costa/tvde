<?php

namespace App\Http\Controllers\Backoffice\Ads;

use App\Http\Controllers\Controller;
use App\Models\AdOrder;
use App\Services\Ads\AdAdminSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BackofficeAdOrderController extends Controller
{
    public function __construct(
        private readonly AdAdminSerializer $serializer
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    AdOrder::STATUS_PENDING,
                    AdOrder::STATUS_PAID,
                    AdOrder::STATUS_CANCELED,
                    AdOrder::STATUS_EXPIRED,
                    AdOrder::STATUS_REFUNDED,
                ]),
            ],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $query = AdOrder::query()
            ->with([
                'campaign:id,name,title,status',
                'advertiser:id,name,type',
                'tenant:id,nome',
                'payments',
                'billingCharges.payments',
            ])
            ->latest();

        if ($status = $data['status'] ?? null) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate(
            $data['per_page'] ?? 20
        );

        return response()->json([
            'data' => collect($paginator->items())
                ->map(
                    fn (AdOrder $order) => $this
                        ->serializer
                        ->order($order)
                )
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
