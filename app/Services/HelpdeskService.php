<?php

namespace App\Services;

use App\Models\HelpdeskAttachment;
use App\Models\HelpdeskMessage;
use App\Models\HelpdeskRating;
use App\Models\HelpdeskTicket;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class HelpdeskService


{

    public function __construct(
        private NotificationCenterService $notifications
    ) {}
    private const TYPES = [
        'support' => 'Suporte técnico',
        'question' => 'Dúvida',
        'suggestion' => 'Sugestão de melhoria',
        'feature_request' => 'Nova funcionalidade',
        'feedback' => 'Feedback',
    ];

    private const IDEA_TYPES = [
        'suggestion',
        'feature_request',
        'feedback',
    ];

    private const CATEGORIES = [
        'technical' => 'Técnico',
        'account_access' => 'Conta e acesso',
        'billing' => 'Faturação',
        'contracts_documents' => 'Contratos e documentos',
        'drivers' => 'Motoristas',
        'owners' => 'Proprietários',
        'vehicles' => 'Veículos',
        'rentals' => 'Alugueres',
        'maintenance' => 'Manutenção',
        'fines_claims' => 'Multas e sinistros',
        'checklists' => 'Checklists',
        'reports' => 'Relatórios',
        'integrations' => 'Integrações',
        'other' => 'Outro',
    ];

    private const PRIORITIES = [
        'low' => 'Baixa',
        'normal' => 'Normal',
        'high' => 'Alta',
        'urgent' => 'Urgente',
    ];

    private const SUPPORT_STATUSES = [
        'open' => 'Aberto',
        'in_progress' => 'Em atendimento',
        'waiting_customer' => 'Aguardando gestor',
        'resolved' => 'Resolvido',
        'closed' => 'Fechado',
    ];

    private const IDEA_STATUSES = [
        'received' => 'Recebido',
        'under_review' => 'Em análise',
        'planned' => 'Planeado',
        'implemented' => 'Implementado',
        'not_planned' => 'Não previsto',
        'closed' => 'Fechado',
    ];

    private const FEATURES = [
        'dashboard' => 'Dashboard',
        'empresas' => 'Empresas',
        'proprietarios' => 'Proprietários',
        'motoristas' => 'Motoristas',
        'funcionarios' => 'Funcionários',
        'veiculos' => 'Veículos',
        'alugueres' => 'Alugueres',
        'contratos' => 'Contratos',
        'templates' => 'Templates',
        'assinaturas' => 'Assinaturas',
        'checklists' => 'Checklists',
        'manutencao' => 'Manutenção',
        'multas' => 'Multas',
        'sinistros' => 'Sinistros',
        'expediente' => 'Expediente',
        'recibos_verdes' => 'Recibos verdes',
        'registos_criminais' => 'Registos criminais',
        'mensagens' => 'Mensagens',
        'alertas' => 'Alertas',
        'relatorios' => 'Relatórios',
        'auditoria' => 'Auditoria',
        'configuracoes' => 'Configurações',
        'conta' => 'Minha conta',
        'helpdesk' => 'Helpdesk',
        'other' => 'Outro',
    ];

    public static function typeCodes(): array
    {
        return array_keys(
            self::TYPES
        );
    }

    public static function categoryCodes(): array
    {
        return array_keys(
            self::CATEGORIES
        );
    }

    public static function priorityCodes(): array
    {
        return array_keys(
            self::PRIORITIES
        );
    }

    public static function statusCodes(): array
    {
        return array_values(
            array_unique([
                ...array_keys(
                    self::SUPPORT_STATUSES
                ),
                ...array_keys(
                    self::IDEA_STATUSES
                ),
            ])
        );
    }

    public static function featureCodes(): array
    {
        return array_keys(
            self::FEATURES
        );
    }

    public function tenantIndex(
        User $user,
        string $tenantId,
        array $filters
    ): array {
        $this->assertTenantManager(
            $user,
            $tenantId
        );

        return $this->index(
            $filters,
            false,
            $tenantId
        );
    }

    public function backofficeIndex(
        User $user,
        array $filters
    ): array {
        $this->assertSuperAdmin(
            $user
        );

        return $this->index(
            $filters,
            true
        );
    }

    public function tenantSummary(
        User $user,
        string $tenantId
    ): array {
        $this->assertTenantManager(
            $user,
            $tenantId
        );

        return $this->summary(
            HelpdeskTicket::query()
                ->where(
                    'tenant_id',
                    $tenantId
                ),
            'tenant'
        );
    }

    public function backofficeSummary(
        User $user
    ): array {
        $this->assertSuperAdmin(
            $user
        );

        return $this->summary(
            HelpdeskTicket::query(),
            'saas'
        );
    }

    public function meta(
        User $user,
        bool $backoffice = false,
        ?string $tenantId = null
    ): array {
        if ($backoffice) {
            $this->assertSuperAdmin(
                $user
            );
        } else {
            if (!$tenantId) {
                abort(403);
            }

            $this->assertTenantManager(
                $user,
                $tenantId
            );
        }

        return [
            'types' => $this->options(
                self::TYPES,
                fn(string $value) => [
                    'workflow' =>
                    $this->isIdeaType(
                        $value
                    )
                        ? 'idea'
                        : 'support',
                ]
            ),

            'categories' =>
            $this->options(
                self::CATEGORIES
            ),

            'priorities' =>
            $this->options(
                self::PRIORITIES
            ),

            'statuses' => [
                ...$this->options(
                    self::SUPPORT_STATUSES,
                    fn() => [
                        'workflow' => 'support',
                    ]
                ),
                ...$this->options(
                    self::IDEA_STATUSES,
                    fn() => [
                        'workflow' => 'idea',
                    ]
                ),
            ],

            'features' =>
            $this->options(
                self::FEATURES
            ),

            'assignees' =>
            $backoffice
                ? $this->assignees()
                : [],

            'tenants' =>
            $backoffice
                ? Tenant::query()
                ->orderBy('nome')
                ->get([
                    'id',
                    'nome',
                    'ativo',
                ])
                ->map(fn(Tenant $tenant) => [
                    'id' => $tenant->id,
                    'name' => $tenant->nome,
                    'active' => $tenant->ativo,
                ])
                ->values()
                ->all()
                : [],
        ];
    }

    public function createTenant(
        User $user,
        string $tenantId,
        array $data,
        array $attachments = []
    ): array {
        $this->assertTenantManager(
            $user,
            $tenantId
        );

        $this->assertContent(
            $data['body'] ?? null,
            $attachments
        );

        $tenant =
            Tenant::query()
            ->findOrFail(
                $tenantId
            );

        $ticket =
            DB::transaction(
                function () use (
                    $user,
                    $tenant,
                    $data,
                    $attachments
                ) {
                    $ticket =
                        HelpdeskTicket::create([
                            'number' =>
                            $this->number(),

                            'tenant_id' =>
                            $tenant->id,

                            'tenant_name' =>
                            $tenant->nome,

                            'opened_by_user_id' =>
                            $user->id,

                            'type' =>
                            $data['type'],

                            'category' =>
                            $data['category'],

                            'priority' =>
                            $data['priority'],

                            'status' =>
                            $this->initialStatus(
                                $data['type']
                            ),

                            'feature_key' =>
                            $data['feature_key'] ?? null,

                            'origin_url' =>
                            $data['origin_url'] ?? null,

                            'subject' =>
                            trim(
                                $data['subject']
                            ),
                        ]);

                    $message =
                        HelpdeskMessage::create([
                            'ticket_id' =>
                            $ticket->id,

                            'sender_user_id' =>
                            $user->id,

                            'sender_side' =>
                            'tenant',

                            'body' =>
                            filled(
                                $data['body'] ??
                                    null
                            )
                                ? trim(
                                    $data['body']
                                )
                                : null,
                        ]);

                    $this->storeAttachments(
                        $ticket,
                        $message,
                        $attachments
                    );

                    $ticket->saas_unread_count = 1;
                    $ticket->last_message_at =
                        $message->created_at;

                    $ticket->save();

                    return $ticket;
                }
            );

        return $this->detail(
            $ticket
        );
    }

    public function tenantDetail(
        User $user,
        string $tenantId,
        string $id
    ): array {
        $ticket =
            $this->ticketForTenant(
                $user,
                $tenantId,
                $id
            );

        $this->markRead(
            $ticket,
            'tenant'
        );

        return $this->detail(
            $ticket->refresh()
        );
    }

    public function backofficeDetail(
        User $user,
        string $id
    ): array {
        $ticket =
            $this->ticketForBackoffice(
                $user,
                $id
            );

        $this->markRead(
            $ticket,
            'saas'
        );

        return $this->detail(
            $ticket->refresh()
        );
    }

    public function tenantReply(
        User $user,
        string $tenantId,
        string $id,
        ?string $body,
        array $attachments = []
    ): array {
        $ticket =
            $this->ticketForTenant(
                $user,
                $tenantId,
                $id
            );

        return $this->reply(
            $ticket,
            $user,
            'tenant',
            $body,
            $attachments
        );
    }

    public function backofficeReply(
        User $user,
        string $id,
        ?string $body,
        array $attachments = []
    ): array {
        $ticket =
            $this->ticketForBackoffice(
                $user,
                $id
            );

        return $this->reply(
            $ticket,
            $user,
            'saas',
            $body,
            $attachments
        );
    }

    public function updateBackoffice(
        User $user,
        string $id,
        array $data
    ): array {
        $ticket =
            $this->ticketForBackoffice(
                $user,
                $id
            );

        $oldStatus =
            $ticket->status;

        $newType =
            $data['type'] ??
            $ticket->type;

        if (
            array_key_exists(
                'type',
                $data
            )
        ) {
            $ticket->type =
                $newType;

            if (
                !array_key_exists(
                    'status',
                    $data
                )
            ) {
                $ticket->status =
                    $this->initialStatus(
                        $newType
                    );
            }
        }

        foreach (
            [
                'category',
                'priority',
                'feature_key',
            ] as $field
        ) {
            if (
                array_key_exists(
                    $field,
                    $data
                )
            ) {
                $ticket->{$field} =
                    $data[$field];
            }
        }

        if (
            array_key_exists(
                'assigned_to_user_id',
                $data
            )
        ) {
            $assigned =
                $data['assigned_to_user_id'];

            if ($assigned) {
                $this->assertSuperAdminId(
                    $assigned
                );
            }

            $ticket->assigned_to_user_id =
                $assigned;
        }

        if (
            array_key_exists(
                'status',
                $data
            )
        ) {
            $ticket->status =
                $data['status'];
        }

        $this->assertStatusForType(
            $ticket->type,
            $ticket->status
        );

        if (
            $ticket->status !==
            $oldStatus
        ) {
            $this->applyStatus(
                $ticket,
                $user
            );
        }

        $ticket->save();

        if (
            $ticket->status !==
            $oldStatus
        ) {
            $this->systemMessage(
                $ticket,
                $user,
                'saas',
                sprintf(
                    'Estado alterado de "%s" para "%s".',
                    $this->statusLabel(
                        $oldStatus
                    ),
                    $this->statusLabel(
                        $ticket->status
                    )
                )
            );
        }

        return $this->detail(
            $ticket->refresh()
        );
    }

    public function closeTenant(
        User $user,
        string $tenantId,
        string $id
    ): array {
        $ticket =
            $this->ticketForTenant(
                $user,
                $tenantId,
                $id
            );

        if (
            $ticket->status ===
            'closed'
        ) {
            return $this->detail(
                $ticket
            );
        }

        $ticket->status = 'closed';
        $ticket->closed_at = now();
        $ticket->closed_by_user_id =
            $user->id;

        $ticket->save();

        $this->systemMessage(
            $ticket,
            $user,
            'tenant',
            'Chamado fechado pelo gestor da frota.'
        );

        return $this->detail(
            $ticket->refresh()
        );
    }

    public function reopenTenant(
        User $user,
        string $tenantId,
        string $id
    ): array {
        $ticket =
            $this->ticketForTenant(
                $user,
                $tenantId,
                $id
            );

        if (
            $ticket->rating()
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'ticket' =>
                'Um chamado já avaliado não pode ser reaberto. Abra um novo chamado.',
            ]);
        }

        if (
            $ticket->status !==
            'closed'
        ) {
            return $this->detail(
                $ticket
            );
        }

        $ticket->status =
            $this->initialStatus(
                $ticket->type
            );

        $ticket->closed_at = null;
        $ticket->closed_by_user_id = null;
        $ticket->resolved_at = null;
        $ticket->resolved_by_user_id = null;
        $ticket->reopened_at = now();

        $ticket->save();

        $this->systemMessage(
            $ticket,
            $user,
            'tenant',
            'Chamado reaberto pelo gestor da frota.'
        );

        return $this->detail(
            $ticket->refresh()
        );
    }

    public function rateTenant(
        User $user,
        string $tenantId,
        string $id,
        array $data
    ): array {
        $ticket =
            $this->ticketForTenant(
                $user,
                $tenantId,
                $id
            );

        if (
            $ticket->status !==
            'closed'
        ) {
            throw ValidationException::withMessages([
                'ticket' =>
                'O atendimento só pode ser avaliado depois do chamado ser fechado.',
            ]);
        }

        if (
            $ticket->rating()
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'rating' =>
                'Este atendimento já foi avaliado.',
            ]);
        }

        $rating =
            HelpdeskRating::create([
                'ticket_id' =>
                $ticket->id,

                'tenant_id' =>
                $tenantId,

                'submitted_by_user_id' =>
                $user->id,

                'rating' =>
                $data['rating'],

                'comment' =>
                filled(
                    $data['comment'] ??
                        null
                )
                    ? trim(
                        $data['comment']
                    )
                    : null,
            ]);

        return $this->serializeRating(
            $rating->load(
                'submittedBy:id,name,email'
            )
        );
    }

    public function attachmentForUser(
        User $user,
        string $id
    ): HelpdeskAttachment {
        $attachment =
            HelpdeskAttachment::query()
            ->whereKey($id)
            ->with(
                'message.ticket'
            )
            ->firstOrFail();

        $ticket =
            $attachment
            ->message
            ->ticket;

        if (
            !$user->isSuperAdmin()
        ) {
            if (
                !$ticket->tenant_id ||
                !$user->hasRole(
                    'admin_empresa',
                    $ticket->tenant_id
                )
            ) {
                abort(404);
            }
        }

        if (
            !Storage::disk(
                $attachment->disk
            )->exists(
                $attachment->path
            )
        ) {
            abort(
                404,
                'Ficheiro não encontrado.'
            );
        }

        return $attachment;
    }

    private function index(
        array $filters,
        bool $backoffice,
        ?string $tenantId = null
    ): array {
        $query =
            $this->filteredQuery(
                $filters,
                $backoffice,
                $tenantId
            );

        $summaryFilters =
            $filters;

        unset(
            $summaryFilters['status'],
            $summaryFilters['unread'],
            $summaryFilters['page'],
            $summaryFilters['per_page']
        );

        $summaryQuery =
            $this->filteredQuery(
                $summaryFilters,
                $backoffice,
                $tenantId
            );

        $perPage =
            (int)(
                $filters['per_page'] ?? 25
            );

        $paginator =
            $query
            ->with([
                'openedBy:id,name,email',
                'assignedTo:id,name,email',
                'latestMessage.sender:id,name,email',
                'rating',
            ])
            ->withCount(
                'messages'
            )
            ->orderByDesc(
                'last_message_at'
            )
            ->orderByDesc(
                'created_at'
            )
            ->paginate(
                $perPage
            );

        return [
            'data' =>
            $paginator
                ->getCollection()
                ->map(
                    fn(
                        HelpdeskTicket $ticket
                    ) =>
                    $this->serializeTicket(
                        $ticket,
                        $backoffice
                            ? 'saas'
                            : 'tenant'
                    )
                )
                ->values()
                ->all(),

            'summary' =>
            $this->summary(
                $summaryQuery,
                $backoffice
                    ? 'saas'
                    : 'tenant'
            ),

            'meta' => [
                'current_page' =>
                $paginator
                    ->currentPage(),

                'last_page' =>
                $paginator
                    ->lastPage(),

                'per_page' =>
                $paginator
                    ->perPage(),

                'total' =>
                $paginator
                    ->total(),

                'from' =>
                $paginator
                    ->firstItem(),

                'to' =>
                $paginator
                    ->lastItem(),
            ],
        ];
    }

    private function filteredQuery(
        array $filters,
        bool $backoffice,
        ?string $tenantId = null
    ): Builder {
        $query =
            HelpdeskTicket::query();

        if (!$backoffice) {
            $query->where(
                'tenant_id',
                $tenantId
            );
        } elseif (
            !empty($filters['tenant_id'])
        ) {
            $query->where(
                'tenant_id',
                $filters['tenant_id']
            );
        }

        foreach (
            [
                'type',
                'category',
                'priority',
                'status',
                'assigned_to_user_id',
            ] as $field
        ) {
            if (
                !empty($filters[$field])
            ) {
                $query->where(
                    $field,
                    $filters[$field]
                );
            }
        }

        if (
            !empty($filters['inicio'])
        ) {
            $query->whereDate(
                'created_at',
                '>=',
                $filters['inicio']
            );
        }

        if (
            !empty($filters['fim'])
        ) {
            $query->whereDate(
                'created_at',
                '<=',
                $filters['fim']
            );
        }

        if (
            isset(
                $filters['unread']
            ) &&
            $filters['unread']
        ) {
            $query->where(
                $backoffice
                    ? 'saas_unread_count'
                    : 'tenant_unread_count',
                '>',
                0
            );
        }

        if (
            !empty($filters['search'])
        ) {
            $term =
                trim(
                    $filters['search']
                );

            $query->where(
                function (
                    Builder $query
                ) use (
                    $term
                ) {
                    $like =
                        "%{$term}%";

                    $query
                        ->where(
                            'number',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'subject',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'tenant_name',
                            'like',
                            $like
                        );
                }
            );
        }

        return $query;
    }

    private function summary(
        Builder $query,
        string $side
    ): array {
        return [
            'total' => (clone $query)
                ->count(),

            'active' => (clone $query)
                ->whereNotIn(
                    'status',
                    [
                        'resolved',
                        'implemented',
                        'not_planned',
                        'closed',
                    ]
                )
                ->count(),

            'waiting_customer' => (clone $query)
                ->where(
                    'status',
                    'waiting_customer'
                )
                ->count(),

            'resolved' => (clone $query)
                ->whereIn(
                    'status',
                    [
                        'resolved',
                        'implemented',
                        'not_planned',
                    ]
                )
                ->count(),

            'closed' => (clone $query)
                ->where(
                    'status',
                    'closed'
                )
                ->count(),

            'unread' =>
            (int)(
                (clone $query)
                ->sum(
                    $side === 'saas'
                        ? 'saas_unread_count'
                        : 'tenant_unread_count'
                )
            ),
        ];
    }

    private function reply(
        HelpdeskTicket $ticket,
        User $user,
        string $side,
        ?string $body,
        array $attachments
    ): array {
        if (
            $ticket->status ===
            'closed'
        ) {
            throw ValidationException::withMessages([
                'ticket' => 'O chamado está fechado.',
            ]);
        }

        $this->assertContent(
            $body,
            $attachments
        );

        $messageId = null;

        DB::transaction(
            function () use (
                $ticket,
                $user,
                $side,
                $body,
                $attachments,
                &$messageId
            ) {
                $message =
                    HelpdeskMessage::create([
                        'ticket_id' => $ticket->id,
                        'sender_user_id' => $user->id,
                        'sender_side' => $side,
                        'body' => filled($body)
                            ? trim($body)
                            : null,
                    ]);

                $messageId =
                    $message->id;

                $this->storeAttachments(
                    $ticket,
                    $message,
                    $attachments
                );

                if (
                    $side === 'tenant'
                ) {
                    $ticket->tenant_unread_count = 0;
                    $ticket->saas_unread_count++;

                    if (
                        !$this->isIdeaType(
                            $ticket->type
                        ) &&
                        in_array(
                            $ticket->status,
                            [
                                'waiting_customer',
                                'resolved',
                            ],
                            true
                        )
                    ) {
                        $ticket->status = 'open';
                        $ticket->resolved_at = null;
                        $ticket->resolved_by_user_id = null;
                        $ticket->reopened_at = now();
                    }

                    if (
                        $this->isIdeaType(
                            $ticket->type
                        ) &&
                        in_array(
                            $ticket->status,
                            [
                                'implemented',
                                'not_planned',
                            ],
                            true
                        )
                    ) {
                        $ticket->status = 'received';
                        $ticket->resolved_at = null;
                        $ticket->resolved_by_user_id = null;
                        $ticket->reopened_at = now();
                    }
                } else {
                    $ticket->saas_unread_count = 0;
                    $ticket->tenant_unread_count++;

                    if (
                        !$ticket->first_response_at
                    ) {
                        $ticket->first_response_at =
                            now();
                    }

                    if (
                        !$this->isIdeaType(
                            $ticket->type
                        ) &&
                        $ticket->status ===
                        'open'
                    ) {
                        $ticket->status =
                            'in_progress';
                    }

                    if (
                        $this->isIdeaType(
                            $ticket->type
                        ) &&
                        $ticket->status ===
                        'received'
                    ) {
                        $ticket->status =
                            'under_review';
                    }
                }

                $ticket->last_message_at =
                    $message->created_at;

                $ticket->save();
            }
        );

        if (
            $side === 'saas' &&
            $messageId
        ) {
            $this->notifications
                ->notifyHelpdeskReply(
                    $ticket->refresh(),
                    $messageId
                );
        }

        return $this->detail(
            $ticket->refresh()
        );
    }

    private function systemMessage(
        HelpdeskTicket $ticket,
        User $actor,
        string $side,
        string $body
    ): void {
        $message =
            HelpdeskMessage::create([
                'ticket_id' =>
                $ticket->id,

                'sender_user_id' =>
                $actor->id,

                'sender_side' =>
                $side,

                'body' => $body,
                'system' => true,
            ]);

        if (
            $side === 'saas'
        ) {
            $ticket->tenant_unread_count++;
        } else {
            $ticket->saas_unread_count++;
        }

        $ticket->last_message_at =
            $message->created_at;

        $ticket->save();
    }

    private function applyStatus(
        HelpdeskTicket $ticket,
        User $actor
    ): void {
        if (
            in_array(
                $ticket->status,
                [
                    'resolved',
                    'implemented',
                    'not_planned',
                ],
                true
            )
        ) {
            $ticket->resolved_at =
                $ticket->resolved_at ??
                now();

            $ticket->resolved_by_user_id =
                $actor->id;
        } elseif (
            $ticket->status !==
            'closed'
        ) {
            $ticket->resolved_at = null;
            $ticket->resolved_by_user_id = null;
        }

        if (
            $ticket->status ===
            'closed'
        ) {
            $ticket->closed_at = now();
            $ticket->closed_by_user_id =
                $actor->id;
        } else {
            if (
                $ticket->closed_at
            ) {
                $ticket->reopened_at = now();
            }

            $ticket->closed_at = null;
            $ticket->closed_by_user_id = null;
        }
    }

    private function detail(
        HelpdeskTicket $ticket
    ): array {
        $ticket->load([
            'openedBy:id,name,email',
            'assignedTo:id,name,email',
            'messages' => fn($query) =>
            $query->orderBy(
                'created_at'
            ),
            'messages.sender:id,name,email',
            'messages.attachments',
            'rating.submittedBy:id,name,email',
        ]);

        $ticket->loadCount(
            'messages'
        );

        return [
            ...$this->serializeTicket(
                $ticket,
                'tenant'
            ),

            'origin_url' =>
            $ticket->origin_url,

            'feature_key' =>
            $ticket->feature_key,

            'messages' =>
            $ticket
                ->messages
                ->map(
                    fn(
                        HelpdeskMessage $message
                    ) =>
                    $this->serializeMessage(
                        $message
                    )
                )
                ->values()
                ->all(),

            'rating' =>
            $ticket->rating
                ? $this->serializeRating(
                    $ticket->rating
                )
                : null,
        ];
    }

    private function serializeTicket(
        HelpdeskTicket $ticket,
        string $side
    ): array {
        return [
            'id' => $ticket->id,
            'number' => $ticket->number,

            'tenant' => [
                'id' => $ticket->tenant_id,
                'name' => $ticket->tenant_name,
            ],

            'opened_by' =>
            $ticket->openedBy
                ? [
                    'id' =>
                    $ticket
                        ->openedBy
                        ->id,

                    'name' =>
                    $ticket
                        ->openedBy
                        ->name,

                    'email' =>
                    $ticket
                        ->openedBy
                        ->email,
                ]
                : null,

            'assigned_to' =>
            $ticket->assignedTo
                ? [
                    'id' =>
                    $ticket
                        ->assignedTo
                        ->id,

                    'name' =>
                    $ticket
                        ->assignedTo
                        ->name,

                    'email' =>
                    $ticket
                        ->assignedTo
                        ->email,
                ]
                : null,

            'subject' => $ticket->subject,

            'type' => $ticket->type,
            'type_label' =>
            self::TYPES[$ticket->type] ?? $ticket->type,

            'category' => $ticket->category,
            'category_label' =>
            self::CATEGORIES[$ticket->category] ?? $ticket->category,

            'priority' => $ticket->priority,
            'priority_label' =>
            self::PRIORITIES[$ticket->priority] ?? $ticket->priority,

            'status' => $ticket->status,
            'status_label' =>
            $this->statusLabel(
                $ticket->status
            ),

            'workflow' =>
            $this->isIdeaType(
                $ticket->type
            )
                ? 'idea'
                : 'support',

            'feature_key' =>
            $ticket->feature_key,

            'feature_label' =>
            $ticket->feature_key
                ? (
                    self::FEATURES[$ticket->feature_key] ??
                    $ticket->feature_key
                )
                : null,

            'origin_url' =>
            $ticket->origin_url,

            'unread_count' =>
            $side === 'saas'
                ? $ticket
                ->saas_unread_count
                : $ticket
                ->tenant_unread_count,

            'messages_count' =>
            (int)(
                $ticket
                ->messages_count ??
                0
            ),

            'first_response_at' =>
            $ticket
                ->first_response_at
                ?->toISOString(),

            'last_message_at' =>
            $ticket
                ->last_message_at
                ?->toISOString(),

            'resolved_at' =>
            $ticket
                ->resolved_at
                ?->toISOString(),

            'closed_at' =>
            $ticket
                ->closed_at
                ?->toISOString(),

            'reopened_at' =>
            $ticket
                ->reopened_at
                ?->toISOString(),

            'created_at' =>
            $ticket
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $ticket
                ->updated_at
                ?->toISOString(),

            'rating' =>
            $ticket->relationLoaded(
                'rating'
            ) &&
                $ticket->rating
                ? $this->serializeRating(
                    $ticket->rating
                )
                : null,
        ];
    }

    private function serializeMessage(
        HelpdeskMessage $message
    ): array {
        return [
            'id' => $message->id,

            'sender_side' =>
            $message->sender_side,

            'sender' =>
            $message->sender
                ? [
                    'id' =>
                    $message
                        ->sender
                        ->id,

                    'name' =>
                    $message
                        ->sender
                        ->name,

                    'email' =>
                    $message
                        ->sender
                        ->email,
                ]
                : null,

            'body' => $message->body,
            'system' => $message->system,

            'attachments' =>
            $message
                ->attachments
                ->map(
                    fn(
                        HelpdeskAttachment $attachment
                    ) => [
                        'id' => $attachment->id,
                        'name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                        'kind' => $attachment->kind,
                        'inline_url' =>
                        "/api/helpdesk/anexos/{$attachment->id}/arquivo",
                        'download_url' =>
                        "/api/helpdesk/anexos/{$attachment->id}/download",
                    ]
                )
                ->values()
                ->all(),

            'created_at' =>
            $message
                ->created_at
                ?->toISOString(),
        ];
    }

    private function serializeRating(
        HelpdeskRating $rating
    ): array {
        return [
            'id' => $rating->id,
            'rating' => $rating->rating,
            'comment' => $rating->comment,

            'submitted_by' =>
            $rating->submittedBy
                ? [
                    'id' =>
                    $rating
                        ->submittedBy
                        ->id,

                    'name' =>
                    $rating
                        ->submittedBy
                        ->name,
                ]
                : null,

            'created_at' =>
            $rating
                ->created_at
                ?->toISOString(),
        ];
    }

    private function ticketForTenant(
        User $user,
        string $tenantId,
        string $id
    ): HelpdeskTicket {
        $this->assertTenantManager(
            $user,
            $tenantId
        );

        return HelpdeskTicket::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereKey(
                $id
            )
            ->firstOrFail();
    }

    private function ticketForBackoffice(
        User $user,
        string $id
    ): HelpdeskTicket {
        $this->assertSuperAdmin(
            $user
        );

        return HelpdeskTicket::query()
            ->whereKey(
                $id
            )
            ->firstOrFail();
    }

    private function markRead(
        HelpdeskTicket $ticket,
        string $side
    ): void {
        HelpdeskTicket::query()
            ->whereKey(
                $ticket->id
            )
            ->update([
                $side === 'saas'
                    ? 'saas_unread_count'
                    : 'tenant_unread_count'
                => 0,

                'updated_at' =>
                $ticket->updated_at,
            ]);
    }

    private function storeAttachments(
        HelpdeskTicket $ticket,
        HelpdeskMessage $message,
        array $attachments
    ): void {
        foreach (
            $attachments
            as $file
        ) {
            if (
                !$file instanceof
                    UploadedFile
            ) {
                continue;
            }

            $extension =
                strtolower(
                    $file
                        ->getClientOriginalExtension()
                        ?: $file->extension()
                        ?: 'bin'
                );

            $filename =
                Str::uuid() .
                '.' .
                $extension;

            $path =
                $file->storeAs(
                    "helpdesk/{$ticket->id}/{$message->id}",
                    $filename,
                    'local'
                );

            if (!$path) {
                throw ValidationException::withMessages([
                    'attachments' =>
                    'Não foi possível guardar o anexo.',
                ]);
            }

            $fullPath =
                Storage::disk(
                    'local'
                )->path(
                    $path
                );

            $mime =
                $file->getMimeType()
                ?: 'application/octet-stream';

            HelpdeskAttachment::create([
                'message_id' =>
                $message->id,

                'disk' => 'local',
                'path' => $path,

                'original_name' =>
                $file
                    ->getClientOriginalName(),

                'mime_type' => $mime,

                'size' =>
                $file->getSize(),

                'kind' =>
                str_starts_with(
                    $mime,
                    'image/'
                )
                    ? 'image'
                    : (
                        $mime ===
                        'application/pdf'
                        ? 'pdf'
                        : 'file'
                    ),

                'metadata' => [
                    'sha256' =>
                    hash_file(
                        'sha256',
                        $fullPath
                    ),
                ],
            ]);
        }
    }

    private function number(): string
    {
        do {
            $number =
                'SUP-' .
                now()->format(
                    'Ymd'
                ) .
                '-' .
                Str::upper(
                    Str::random(6)
                );
        } while (
            HelpdeskTicket::query()
            ->where(
                'number',
                $number
            )
            ->exists()
        );

        return $number;
    }

    private function initialStatus(
        string $type
    ): string {
        return $this->isIdeaType(
            $type
        )
            ? 'received'
            : 'open';
    }

    private function isIdeaType(
        string $type
    ): bool {
        return in_array(
            $type,
            self::IDEA_TYPES,
            true
        );
    }

    private function assertStatusForType(
        string $type,
        string $status
    ): void {
        $valid =
            $this->isIdeaType(
                $type
            )
            ? array_keys(
                self::IDEA_STATUSES
            )
            : array_keys(
                self::SUPPORT_STATUSES
            );

        if (
            !in_array(
                $status,
                $valid,
                true
            )
        ) {
            throw ValidationException::withMessages([
                'status' =>
                'O estado selecionado não pertence ao fluxo deste tipo de chamado.',
            ]);
        }
    }

    private function statusLabel(
        string $status
    ): string {
        return self::SUPPORT_STATUSES[$status]
            ??
            self::IDEA_STATUSES[$status]
            ??
            $status;
    }

    private function assertContent(
        ?string $body,
        array $attachments
    ): void {
        if (
            blank($body) &&
            empty($attachments)
        ) {
            throw ValidationException::withMessages([
                'body' =>
                'Escreva uma mensagem ou adicione um anexo.',
            ]);
        }
    }

    private function assertTenantManager(
        User $user,
        string $tenantId
    ): void {
        if (
            !$user->hasRole(
                'admin_empresa',
                $tenantId
            )
        ) {
            abort(
                403,
                'Apenas gestores de frota podem utilizar o Helpdesk.'
            );
        }
    }

    private function assertSuperAdmin(
        User $user
    ): void {
        if (
            !$user->isSuperAdmin()
        ) {
            abort(403);
        }
    }

    private function assertSuperAdminId(
        string $userId
    ): void {
        $valid =
            UserRole::query()
            ->where(
                'user_id',
                $userId
            )
            ->whereNull(
                'tenant_id'
            )
            ->whereHas(
                'role',
                fn($query) =>
                $query->where(
                    'codigo',
                    'super_admin'
                )
            )
            ->exists();

        if (!$valid) {
            throw ValidationException::withMessages([
                'assigned_to_user_id' =>
                'O responsável selecionado não pertence à equipa SaaS.',
            ]);
        }
    }

    private function assignees(): array
    {
        $ids =
            UserRole::query()
            ->whereNull(
                'tenant_id'
            )
            ->whereHas(
                'role',
                fn($query) =>
                $query->where(
                    'codigo',
                    'super_admin'
                )
            )
            ->pluck(
                'user_id'
            );

        return User::query()
            ->whereIn(
                'id',
                $ids
            )
            ->where(
                'ativo',
                true
            )
            ->orderBy(
                'name'
            )
            ->get([
                'id',
                'name',
                'email',
            ])
            ->map(fn(User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])
            ->values()
            ->all();
    }

    private function options(
        array $items,
        ?callable $extra = null
    ): array {
        $result = [];

        foreach (
            $items
            as $value => $label
        ) {
            $item = [
                'value' => $value,
                'label' => $label,
            ];

            if ($extra) {
                $item = [
                    ...$item,
                    ...$extra(
                        $value,
                        $label
                    ),
                ];
            }

            $result[] = $item;
        }

        return $result;
    }
}
