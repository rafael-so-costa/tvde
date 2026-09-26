<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\AlertRecipient;
use App\Models\AlertRule;
use App\Models\TenantUser;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AlertService
{
    private const SEVERITIES = [
        'low',
        'medium',
        'high',
        'critical',
    ];

    public function __construct(
        private PermissionService $permissionService,
        private AlertDeliveryService $deliveryService
    ) {}

    public function raise(
        AlertRule $rule,
        array $data,
        iterable $recipientUserIds
    ): ?Alert {
        if (!$rule->enabled) {
            return null;
        }

        $sourceType = trim(
            (string)($data['source_type'] ?? '')
        );

        $sourceId = isset($data['source_id'])
            ? trim((string)$data['source_id'])
            : null;

        $dedupKey = trim(
            (string)($data['dedup_key'] ?? '')
        );

        $title = trim(
            (string)($data['title'] ?? '')
        );

        $category = trim(
            (string)(
                $data['category']
                ?? $rule->category
            )
        );

        $severity = trim(
            (string)(
                $data['severity']
                ?? $rule->severity
            )
        );

        if (
            $sourceType === '' ||
            $dedupKey === '' ||
            $title === '' ||
            $category === ''
        ) {
            throw ValidationException::withMessages([
                'alert' =>
                'Dados insuficientes para gerar o alerta.',
            ]);
        }

        if (!in_array(
            $severity,
            self::SEVERITIES,
            true
        )) {
            throw ValidationException::withMessages([
                'severity' =>
                'Severidade de alerta inválida.',
            ]);
        }

        $fingerprint = $this->fingerprint(
            $rule->tenant_id,
            $rule->code,
            $sourceType,
            $sourceId,
            $dedupKey
        );

        $userIds = $this->validRecipientIds(
            $rule->tenant_id,
            $recipientUserIds
        );

        $alert = DB::transaction(
            function () use (
                $rule,
                $data,
                $sourceType,
                $sourceId,
                $dedupKey,
                $title,
                $category,
                $severity,
                $fingerprint,
                $userIds
            ) {
                $alert = Alert::query()
                    ->where(
                        'tenant_id',
                        $rule->tenant_id
                    )
                    ->where(
                        'active_key',
                        $fingerprint
                    )
                    ->lockForUpdate()
                    ->first();

                if (!$alert) {
                    $alert = new Alert();

                    $alert->tenant_id =
                        $rule->tenant_id;

                    $alert->rule_id =
                        $rule->id;

                    $alert->rule_code =
                        $rule->code;

                    $alert->source_type =
                        $sourceType;

                    $alert->source_id =
                        $sourceId ?: null;

                    $alert->dedup_key =
                        $dedupKey;

                    $alert->fingerprint =
                        $fingerprint;

                    $alert->active_key =
                        $fingerprint;

                    $alert->status = 'open';

                    $alert->triggered_at =
                        now();
                }

                $alert->rule_id =
                    $rule->id;

                $alert->rule_code =
                    $rule->code;

                $alert->category =
                    $category;

                $alert->severity =
                    $severity;

                $alert->title =
                    $title;

                $alert->message =
                    isset($data['message'])
                    ? trim(
                        (string)$data['message']
                    ) ?: null
                    : null;

                $alert->due_at =
                    $data['due_at'] ?? null;

                $alert->action_url =
                    isset($data['action_url'])
                    ? trim(
                        (string)$data['action_url']
                    ) ?: null
                    : null;

                $alert->metadata =
                    is_array(
                        $data['metadata'] ?? null
                    )
                    ? $data['metadata']
                    : null;

                $alert->save();

                $this->syncRecipients(
                    $alert,
                    $userIds
                );

                return $alert->load([
                    'rule',
                    'recipients.user:id,name,email,ativo',
                ]);
            }
        );
        $this->deliveryService
            ->syncAlert(
                $alert
            );

        return $alert;
    }

    public function markRead(
        Alert $alert,
        User $user,
        string $tenantId
    ): AlertRecipient {
        $recipient = $this->recipient(
            $alert,
            $user,
            $tenantId
        );

        if (!$recipient->read_at) {
            $recipient->read_at = now();
            $recipient->save();
        }

        return $recipient->refresh();
    }

    public function acknowledge(
        Alert $alert,
        User $user,
        string $tenantId
    ): AlertRecipient {
        $recipient = $this->recipient(
            $alert,
            $user,
            $tenantId
        );

        $recipient->read_at =
            $recipient->read_at
            ?? now();

        $recipient->acknowledged_at =
            $recipient->acknowledged_at
            ?? now();

        $recipient->snoozed_until = null;

        $recipient->save();

        return $recipient->refresh();
    }

    public function snooze(
        Alert $alert,
        User $user,
        string $tenantId,
        CarbonInterface $until
    ): AlertRecipient {
        if ($until->lte(now())) {
            throw ValidationException::withMessages([
                'snoozed_until' =>
                'O adiamento deve terminar no futuro.',
            ]);
        }

        $recipient = $this->recipient(
            $alert,
            $user,
            $tenantId
        );

        $recipient->read_at =
            $recipient->read_at
            ?? now();

        $recipient->snoozed_until =
            $until;

        $recipient->save();

        return $recipient->refresh();
    }

    public function markAllRead(
        User $user,
        string $tenantId
    ): int {
        return AlertRecipient::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $user->id
            )
            ->where('active', true)
            ->whereNull('read_at')
            ->whereHas(
                'alert',
                fn($query) =>
                $query
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'status',
                        'open'
                    )
            )
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function resolve(
        Alert $alert,
        User $actor,
        string $tenantId,
        ?string $note = null
    ): Alert {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        if ($alert->tenant_id !== $tenantId) {
            abort(404);
        }

        return DB::transaction(
            function () use (
                $alert,
                $actor,
                $note
            ) {
                $locked = Alert::query()
                    ->where(
                        'tenant_id',
                        $alert->tenant_id
                    )
                    ->whereKey(
                        $alert->id
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                return $this->resolveLocked(
                    $locked,
                    'manual',
                    $note,
                    $actor->id
                );
            }
        );
    }

    public function resolveCondition(
        string $tenantId,
        string $ruleCode,
        string $sourceType,
        ?string $sourceId,
        string $dedupKey,
        ?string $note = null
    ): ?Alert {
        $fingerprint = $this->fingerprint(
            $tenantId,
            $ruleCode,
            $sourceType,
            $sourceId,
            $dedupKey
        );

        return DB::transaction(
            function () use (
                $tenantId,
                $fingerprint,
                $note
            ) {
                $alert = Alert::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'active_key',
                        $fingerprint
                    )
                    ->lockForUpdate()
                    ->first();

                if (!$alert) {
                    return null;
                }

                return $this->resolveLocked(
                    $alert,
                    'automatic',
                    $note
                        ?? 'Condição do alerta deixou de estar ativa.',
                    null
                );
            }
        );
    }

    public function fingerprint(
        string $tenantId,
        string $ruleCode,
        string $sourceType,
        ?string $sourceId,
        string $dedupKey
    ): string {
        return hash(
            'sha256',
            implode('|', [
                $tenantId,
                $ruleCode,
                $sourceType,
                $sourceId ?? '',
                $dedupKey,
            ])
        );
    }

    private function resolveLocked(
        Alert $alert,
        string $resolutionType,
        ?string $note,
        ?string $resolvedBy
    ): Alert {
        if ($alert->status === 'resolved') {
            return $alert;
        }

        $alert->status = 'resolved';

        /*
         * Liberta a chave ativa.
         *
         * A mesma condição poderá criar uma nova
         * ocorrência no futuro sem eliminar o
         * histórico desta ocorrência.
         */
        $alert->active_key = null;

        $alert->resolved_at = now();

        $alert->resolution_type =
            $resolutionType;

        $alert->resolution_note =
            $note;

        $alert->resolved_by =
            $resolvedBy;

        $alert->save();

        return $alert->refresh();
    }

    private function recipient(
        Alert $alert,
        User $user,
        string $tenantId
    ): AlertRecipient {
        if ($alert->tenant_id !== $tenantId) {
            abort(404);
        }

        return AlertRecipient::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'alert_id',
                $alert->id
            )
            ->where(
                'user_id',
                $user->id
            )
            ->where('active', true)
            ->firstOrFail();
    }

    private function validRecipientIds(
        string $tenantId,
        iterable $recipientUserIds
    ): Collection {
        $ids = collect(
            $recipientUserIds
        )
            ->map(
                fn($id) => trim(
                    (string)$id
                )
            )
            ->filter()
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        return TenantUser::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'ativo'
            )
            ->whereIn(
                'user_id',
                $ids
            )
            ->whereHas(
                'user',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->pluck('user_id')
            ->unique()
            ->values();
    }

    private function syncRecipients(
        Alert $alert,
        Collection $userIds
    ): void {
        $stale = AlertRecipient::query()
            ->where(
                'alert_id',
                $alert->id
            )
            ->where('active', true);

        if ($userIds->isEmpty()) {
            $stale->update([
                'active' => false,
                'updated_at' => now(),
            ]);
        } else {
            $stale
                ->whereNotIn(
                    'user_id',
                    $userIds
                )
                ->update([
                    'active' => false,
                    'updated_at' => now(),
                ]);
        }

        foreach ($userIds as $userId) {
            $recipient = AlertRecipient::query()
                ->where(
                    'alert_id',
                    $alert->id
                )
                ->where(
                    'user_id',
                    $userId
                )
                ->first();

            if (!$recipient) {
                $recipient =
                    new AlertRecipient();

                $recipient->tenant_id =
                    $alert->tenant_id;

                $recipient->alert_id =
                    $alert->id;

                $recipient->user_id =
                    $userId;

                $recipient->active = true;

                $recipient->save();

                continue;
            }

            if (!$recipient->active) {
                /*
                 * Se voltou a ser destinatário da
                 * mesma ocorrência, recebe-a como
                 * não lida novamente.
                 */
                $recipient->active = true;
                $recipient->read_at = null;
                $recipient->acknowledged_at = null;
                $recipient->snoozed_until = null;

                $recipient->save();
            }
        }
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if (!$this->permissionService->allows(
            $actor,
            'alertas',
            'configurar',
            $tenantId
        )) {
            abort(
                403,
                'Sem permissão suficiente para gerir alertas.'
            );
        }
    }
}
