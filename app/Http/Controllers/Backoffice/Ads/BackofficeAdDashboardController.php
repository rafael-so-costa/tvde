<?php

namespace App\Http\Controllers\Backoffice\Ads;

use App\Http\Controllers\Controller;
use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\AdDailyStat;
use App\Models\AdPayment;
use App\Services\Ads\AdAdminSerializer;
use Illuminate\Http\JsonResponse;

class BackofficeAdDashboardController extends Controller
{
    public function __construct(
        private readonly AdAdminSerializer $serializer
    ) {}

    public function show(): JsonResponse
    {
        $stats = AdDailyStat::query()
            ->whereBetween('date', [
                now()->startOfMonth()->toDateString(),
                now()->endOfMonth()->toDateString(),
            ])
            ->selectRaw(
                'COALESCE(SUM(impressions),0) impressions,
                 COALESCE(SUM(viewable_impressions),0) viewable_impressions,
                 COALESCE(SUM(clicks),0) clicks'
            )
            ->first();

        $revenue = (float) AdPayment::query()
            ->where('status', AdPayment::STATUS_PAID)
            ->whereBetween('paid_at', [
                now()->startOfMonth(),
                now()->endOfMonth(),
            ])
            ->sum('amount');

        $impressions = (int) $stats->impressions;
        $clicks = (int) $stats->clicks;

        $recent = AdCampaign::query()
            ->with(['advertiser', 'category', 'tenant'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(
                fn (AdCampaign $campaign) => $this
                    ->serializer
                    ->campaignSummary($campaign)
            )
            ->values();

        return response()->json([
            'data' => [
                'metrics' => [
                    'campaigns_total' => AdCampaign::query()->count(),
                    'campaigns_active' => AdCampaign::query()
                        ->where('status', AdCampaign::STATUS_ACTIVE)
                        ->count(),
                    'pending_approval' => AdCampaign::query()
                        ->whereIn('status', [
                            AdCampaign::STATUS_SUBMITTED,
                            AdCampaign::STATUS_IN_REVIEW,
                        ])
                        ->count(),
                    'awaiting_payment' => AdCampaign::query()
                        ->where('status', AdCampaign::STATUS_AWAITING_PAYMENT)
                        ->count(),
                    'advertisers_active' => AdAdvertiser::query()
                        ->where('status', AdAdvertiser::STATUS_ACTIVE)
                        ->count(),
                    'revenue_month' => $revenue,
                    'impressions_month' => $impressions,
                    'viewable_impressions_month' => (int) $stats->viewable_impressions,
                    'clicks_month' => $clicks,
                    'ctr_month' => $impressions > 0
                        ? round(($clicks / $impressions) * 100, 2)
                        : 0,
                ],
                'recent_campaigns' => $recent,
            ],
        ]);
    }
}
