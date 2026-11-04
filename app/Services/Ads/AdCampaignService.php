<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdCampaignEvent;
use App\Models\AdOrder;
use App\Models\AdPayment;
use App\Models\AdReview;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdCampaignService
{
    public function __construct(
        private readonly AdCommercialSalesPolicy $commercialSales
    ) {}

    public function create(array $data, User $user): AdCampaign
    {
        $this->commercialSales->assertCanCreate($data);

        return DB::transaction(function () use ($data, $user) {
            $targeting = $this->extractTargeting($data);

            if ($data['kind'] === AdCampaign::KIND_TENANT_INTERNAL) {
                $data['payment_required'] = false;
                $data['quoted_price'] = 0;
            }

            $data['created_by_user_id'] = $user->id;
            $data['status'] = AdCampaign::STATUS_DRAFT;
            $data['payment_status'] = $data['payment_required']
                ? AdCampaign::PAYMENT_PENDING
                : AdCampaign::PAYMENT_NOT_REQUIRED;

            $campaign = AdCampaign::create($data);

            $this->syncTargeting($campaign, $targeting);

            $this->recordEvent(
                $campaign,
                $user,
                'created',
                null,
                $campaign->status
            );

            return $campaign->refresh();
        });
    }

    public function update(
        AdCampaign $campaign,
        array $data,
        User $user
    ): AdCampaign {
        $this->commercialSales->assertCanUpdate($campaign, $data);

        return DB::transaction(function () use ($campaign, $data, $user) {
            $targeting = $this->extractTargeting($data);

            if ($data['kind'] === AdCampaign::KIND_TENANT_INTERNAL) {
                $data['payment_required'] = false;
                $data['quoted_price'] = 0;
                $data['payment_status'] = AdCampaign::PAYMENT_NOT_REQUIRED;
            }

            $campaign->fill($data);
            $campaign->save();

            $this->syncTargeting($campaign, $targeting);

            $this->recordEvent(
                $campaign,
                $user,
                'updated',
                $campaign->status,
                $campaign->status
            );

            return $campaign->refresh();
        });
    }

    public function action(
        AdCampaign $campaign,
        string $action,
        User $user,
        ?string $reason = null,
        ?string $notes = null
    ): AdCampaign {
        return DB::transaction(function () use (
            $campaign,
            $action,
            $user,
            $reason,
            $notes
        ) {
            $from = $campaign->status;

            match ($action) {
                'submit' => $this->submit($campaign),
                'start_review' => $this->startReview($campaign),
                'approve' => $this->approve($campaign, $user, $notes),
                'request_changes' => $this->requestChanges($campaign, $user, $reason, $notes),
                'reject' => $this->reject($campaign, $user, $reason, $notes),
                'mark_paid' => $this->markPaid($campaign),
                'activate' => $this->activate($campaign),
                'pause' => $this->pause($campaign),
                'resume' => $this->resume($campaign),
                'complete' => $this->complete($campaign),
                'cancel' => $this->cancel($campaign),
                'suspend' => $this->suspend($campaign, $user, $reason, $notes),
                default => throw ValidationException::withMessages([
                    'action' => 'A ação informada não é suportada.',
                ]),
            };

            $campaign->save();

            $this->recordEvent(
                $campaign,
                $user,
                $action,
                $from,
                $campaign->status,
                array_filter([
                    'reason' => $reason,
                    'notes' => $notes,
                ])
            );

            return $campaign->refresh();
        });
    }

    public function syncAutomaticStatuses(): array
    {
        $activated = 0;
        $completed = 0;

        AdCampaign::query()
            ->where('status', AdCampaign::STATUS_SCHEDULED)
            ->where(function ($query) {
                $query
                    ->whereNull('start_at')
                    ->orWhere('start_at', '<=', now());
            })
            ->chunkById(100, function ($campaigns) use (&$activated) {
                foreach ($campaigns as $campaign) {
                    if (
                        $campaign->payment_required &&
                        $campaign->payment_status !== AdCampaign::PAYMENT_PAID
                    ) {
                        continue;
                    }

                    $campaign->status = AdCampaign::STATUS_ACTIVE;
                    $campaign->activated_at ??= now();
                    $campaign->save();

                    $activated++;
                }
            });

        AdCampaign::query()
            ->whereIn('status', [
                AdCampaign::STATUS_ACTIVE,
                AdCampaign::STATUS_PAUSED,
                AdCampaign::STATUS_SCHEDULED,
            ])
            ->whereNotNull('end_at')
            ->where('end_at', '<=', now())
            ->chunkById(100, function ($campaigns) use (&$completed) {
                foreach ($campaigns as $campaign) {
                    $campaign->status = AdCampaign::STATUS_COMPLETED;
                    $campaign->completed_at = now();
                    $campaign->save();

                    $completed++;
                }
            });

        return compact('activated', 'completed');
    }

    private function submit(AdCampaign $campaign): void
    {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_DRAFT,
                AdCampaign::STATUS_CHANGES_REQUESTED,
            ]
        );

        $campaign->status = AdCampaign::STATUS_SUBMITTED;
        $campaign->submitted_at = now();
    }

    private function startReview(AdCampaign $campaign): void
    {
        $this->requireStatus(
            $campaign,
            [AdCampaign::STATUS_SUBMITTED]
        );

        $campaign->status = AdCampaign::STATUS_IN_REVIEW;
    }

    private function approve(
        AdCampaign $campaign,
        User $user,
        ?string $notes
    ): void {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_SUBMITTED,
                AdCampaign::STATUS_IN_REVIEW,
            ]
        );

        $campaign->approved_at = now();
        $campaign->approved_by_user_id = $user->id;
        $campaign->rejected_at = null;
        $campaign->rejection_reason = null;

        $this->review(
            $campaign,
            $user,
            'approved',
            null,
            $notes
        );

        if (
            $campaign->payment_required &&
            $campaign->payment_status !== AdCampaign::PAYMENT_PAID
        ) {
            $campaign->status = AdCampaign::STATUS_AWAITING_PAYMENT;

            $this->ensureOrder($campaign);

            return;
        }

        $this->activateOrSchedule($campaign);
    }

    private function requestChanges(
        AdCampaign $campaign,
        User $user,
        ?string $reason,
        ?string $notes
    ): void {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_SUBMITTED,
                AdCampaign::STATUS_IN_REVIEW,
            ]
        );

        $campaign->status = AdCampaign::STATUS_CHANGES_REQUESTED;

        $this->review(
            $campaign,
            $user,
            'changes_requested',
            $reason,
            $notes
        );
    }

    private function reject(
        AdCampaign $campaign,
        User $user,
        ?string $reason,
        ?string $notes
    ): void {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_SUBMITTED,
                AdCampaign::STATUS_IN_REVIEW,
            ]
        );

        $campaign->status = AdCampaign::STATUS_REJECTED;
        $campaign->rejected_at = now();
        $campaign->rejection_reason = $reason;

        $this->review(
            $campaign,
            $user,
            'rejected',
            $reason,
            $notes
        );
    }

    private function markPaid(AdCampaign $campaign): void
    {
        if (! $campaign->payment_required) {
            throw ValidationException::withMessages([
                'action' => 'Esta campanha não exige pagamento.',
            ]);
        }

        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_AWAITING_PAYMENT,
                AdCampaign::STATUS_APPROVED,
            ]
        );

        $order = $this->ensureOrder($campaign);

        $order->status = AdOrder::STATUS_PAID;
        $order->paid_at = now();
        $order->save();

        if (
            ! $order
                ->payments()
                ->where('status', AdPayment::STATUS_PAID)
                ->exists()
        ) {
            $order->payments()->create([
                'provider' => 'manual_admin',
                'status' => AdPayment::STATUS_PAID,
                'amount' => $order->total,
                'currency' => $order->currency,
                'paid_at' => now(),
            ]);
        }

        $campaign->payment_status = AdCampaign::PAYMENT_PAID;

        $this->activateOrSchedule($campaign);
    }

    private function activate(AdCampaign $campaign): void
    {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_APPROVED,
                AdCampaign::STATUS_SCHEDULED,
                AdCampaign::STATUS_PAUSED,
            ]
        );

        if (
            $campaign->payment_required &&
            $campaign->payment_status !== AdCampaign::PAYMENT_PAID
        ) {
            throw ValidationException::withMessages([
                'action' => 'A campanha deve estar paga antes da ativação.',
            ]);
        }

        $this->activateOrSchedule($campaign);
    }

    private function pause(AdCampaign $campaign): void
    {
        $this->requireStatus(
            $campaign,
            [AdCampaign::STATUS_ACTIVE]
        );

        $campaign->status = AdCampaign::STATUS_PAUSED;
        $campaign->paused_at = now();
    }

    private function resume(AdCampaign $campaign): void
    {
        $this->requireStatus(
            $campaign,
            [AdCampaign::STATUS_PAUSED]
        );

        $campaign->paused_at = null;

        $this->activateOrSchedule($campaign);
    }

    private function complete(AdCampaign $campaign): void
    {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_ACTIVE,
                AdCampaign::STATUS_PAUSED,
                AdCampaign::STATUS_SCHEDULED,
            ]
        );

        $campaign->status = AdCampaign::STATUS_COMPLETED;
        $campaign->completed_at = now();
    }

    private function cancel(AdCampaign $campaign): void
    {
        if (
            in_array(
                $campaign->status,
                [
                    AdCampaign::STATUS_COMPLETED,
                    AdCampaign::STATUS_CANCELED,
                ],
                true
            )
        ) {
            throw ValidationException::withMessages([
                'action' => 'Esta campanha já está encerrada.',
            ]);
        }

        $campaign->status = AdCampaign::STATUS_CANCELED;
    }

    private function suspend(
        AdCampaign $campaign,
        User $user,
        ?string $reason,
        ?string $notes
    ): void {
        $this->requireStatus(
            $campaign,
            [
                AdCampaign::STATUS_APPROVED,
                AdCampaign::STATUS_SCHEDULED,
                AdCampaign::STATUS_ACTIVE,
                AdCampaign::STATUS_PAUSED,
            ]
        );

        $campaign->status = AdCampaign::STATUS_SUSPENDED;

        $this->review(
            $campaign,
            $user,
            'suspended',
            $reason,
            $notes
        );
    }

    private function activateOrSchedule(AdCampaign $campaign): void
    {
        if (
            $campaign->end_at &&
            $campaign->end_at->lte(now())
        ) {
            $campaign->status = AdCampaign::STATUS_COMPLETED;
            $campaign->completed_at = now();

            return;
        }

        if (
            $campaign->start_at &&
            $campaign->start_at->gt(now())
        ) {
            $campaign->status = AdCampaign::STATUS_SCHEDULED;

            return;
        }

        $campaign->status = AdCampaign::STATUS_ACTIVE;
        $campaign->activated_at ??= now();
    }

    private function ensureOrder(AdCampaign $campaign): AdOrder
    {
        $existing = $campaign
            ->orders()
            ->where('status', AdOrder::STATUS_PENDING)
            ->latest()
            ->first();

        if ($existing) {
            return $existing;
        }

        $this->commercialSales->assertCanCreateOrder($campaign);

        return $campaign->orders()->create([
            'advertiser_id' => $campaign->advertiser_id,
            'tenant_id' => $campaign->tenant_id,
            'number' => $this->nextOrderNumber(),
            'status' => AdOrder::STATUS_PENDING,
            'subtotal' => $campaign->quoted_price,
            'discount' => 0,
            'total' => $campaign->quoted_price,
            'currency' => $campaign->currency,
            'due_at' => now()->addDays(7),
        ]);
    }

    private function nextOrderNumber(): string
    {
        do {
            $number = sprintf(
                'ADS-%s-%s',
                now()->format('Ym'),
                Str::upper(Str::random(8))
            );
        } while (
            AdOrder::query()
                ->where('number', $number)
                ->exists()
        );

        return $number;
    }

    private function review(
        AdCampaign $campaign,
        User $user,
        string $decision,
        ?string $reason,
        ?string $notes
    ): void {
        AdReview::create([
            'campaign_id' => $campaign->id,
            'reviewer_user_id' => $user->id,
            'decision' => $decision,
            'reason' => $reason,
            'notes' => $notes,
            'snapshot' => [
                'name' => $campaign->name,
                'title' => $campaign->title,
                'description' => $campaign->description,
                'quoted_price' => $campaign->quoted_price,
                'start_at' => $campaign->start_at,
                'end_at' => $campaign->end_at,
            ],
        ]);
    }

    private function recordEvent(
        AdCampaign $campaign,
        ?User $user,
        string $event,
        ?string $from,
        ?string $to,
        array $data = []
    ): void {
        AdCampaignEvent::create([
            'campaign_id' => $campaign->id,
            'user_id' => $user?->id,
            'event_type' => $event,
            'from_status' => $from,
            'to_status' => $to,
            'data' => $data ?: null,
        ]);
    }

    private function requireStatus(
        AdCampaign $campaign,
        array $allowed
    ): void {
        if (! in_array($campaign->status, $allowed, true)) {
            throw ValidationException::withMessages([
                'action' => sprintf(
                    'A ação não é permitida para uma campanha no estado "%s".',
                    $campaign->status
                ),
            ]);
        }
    }

    private function extractTargeting(array &$data): array
    {
        return [
            'channels' => array_values(array_unique($data['channels'] ?? [])),
            'audiences' => array_values(array_unique($data['audiences'] ?? [])),
            'zone_ids' => array_values(array_unique($data['zone_ids'] ?? [])),
            'locations' => $data['locations'] ?? [],
        ];
    }

    private function syncTargeting(
        AdCampaign $campaign,
        array $targeting
    ): void {
        DB::table('ad_campaign_channels')
            ->where('campaign_id', $campaign->id)
            ->delete();

        foreach ($targeting['channels'] as $channel) {
            DB::table('ad_campaign_channels')->insert([
                'campaign_id' => $campaign->id,
                'channel' => $channel,
            ]);
        }

        DB::table('ad_campaign_audiences')
            ->where('campaign_id', $campaign->id)
            ->delete();

        foreach ($targeting['audiences'] as $audience) {
            DB::table('ad_campaign_audiences')->insert([
                'campaign_id' => $campaign->id,
                'audience' => $audience,
            ]);
        }

        $campaign
            ->zones()
            ->sync($targeting['zone_ids']);

        DB::table('ad_campaign_locations')
            ->where('campaign_id', $campaign->id)
            ->delete();

        foreach ($targeting['locations'] as $location) {
            DB::table('ad_campaign_locations')->insert([
                'id' => Str::uuid()->toString(),
                'campaign_id' => $campaign->id,
                'country_code' => strtoupper($location['country_code'] ?? 'PT'),
                'district' => $location['district'] ?? null,
                'municipality' => $location['municipality'] ?? null,
            ]);
        }
    }
}
