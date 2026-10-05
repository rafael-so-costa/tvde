<?php

namespace App\Services;

use App\Models\ChatAttachment;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ChatService
{
    public function tenantConversations(
        User $user,
        string $tenantId
    ): LengthAwarePaginator {
        return $this
            ->visibleQuery(
                $user,
                $tenantId
            )
            ->with([
                'createdBy:id,name,email',
                'latestMessage.sender:id,name,email',
                'latestMessage.attachments',
            ])
            ->withCount('participants')
            ->orderByDesc(
                'last_message_at'
            )
            ->paginate(30)
            ->through(
                fn(ChatConversation $conversation) =>
                $this->serializeConversation(
                    $conversation,
                    $user
                )
            );
    }

    public function globalConversations(
        User $user
    ): LengthAwarePaginator {
        return ChatConversation::query()
            ->where(
                'source',
                'saas'
            )
            ->whereHas(
                'participants',
                fn($query) =>
                $query->where(
                    'user_id',
                    $user->id
                )
            )
            ->with([
                'createdBy:id,name,email',
                'latestMessage.sender:id,name,email',
                'latestMessage.attachments',
            ])
            ->withCount('participants')
            ->orderByDesc(
                'last_message_at'
            )
            ->paginate(30)
            ->through(
                fn(ChatConversation $conversation) =>
                $this->serializeConversation(
                    $conversation,
                    $user
                )
            );
    }

    public function conversation(
        User $user,
        string $id,
        ?string $tenantId = null
    ): ChatConversation {
        $query = ChatConversation::query()
            ->whereKey($id)
            ->whereHas(
                'participants',
                fn($query) =>
                $query->where(
                    'user_id',
                    $user->id
                )
            );

        if (
            !$user->isSuperAdmin() ||
            $tenantId
        ) {
            $query->where(
                function ($query) use (
                    $tenantId
                ) {
                    $query->whereNull(
                        'tenant_id'
                    );

                    if ($tenantId) {
                        $query->orWhere(
                            'tenant_id',
                            $tenantId
                        );
                    }
                }
            );
        }

        $conversation = $query
            ->with([
                'createdBy:id,name,email',

                'messages' => fn($query) =>
                $query->orderBy(
                    'created_at'
                ),

                'messages.sender:id,name,email',
                'messages.attachments',
            ])
            ->withCount([
                'participants',

                'participants as read_participants_count' =>
                fn($query) =>
                $query->whereNotNull(
                    'last_read_at'
                ),
            ])
            ->firstOrFail();

        if (
            $conversation->type ===
            'direct'
        ) {
            $conversation->load(
                'participants.user:id,name,email'
            );
        } else {
            $conversation->load([
                'participants' => fn($query) =>
                $query->where(
                    'user_id',
                    $user->id
                ),

                'participants.user:id,name,email',
            ]);
        }

        return $conversation;
    }

    public function createTenant(
        User $user,
        string $tenantId,
        array $data,
        array $attachments = []
    ): ChatConversation {
        $manager = $this->isManager(
            $user,
            $tenantId
        );

        $driver = $user->hasRole(
            'motorista',
            $tenantId
        );

        $owner = $user->hasRole(
            'proprietario',
            $tenantId
        );

        if (
            !$manager &&
            !$driver &&
            !$owner
        ) {
            abort(
                403,
                'Este perfil não pode iniciar novas conversas.'
            );
        }

        $type = $data['type'];

        if (
            ($driver || $owner) &&
            $type !== 'direct'
        ) {
            abort(
                403,
                'Este perfil apenas pode iniciar conversas diretas.'
            );
        }

        if (
            $type ===
            'direct'
        ) {
            $ids = collect(
                $data['recipient_ids'] ??
                    []
            )
                ->unique()
                ->values();

            if (
                $ids->count() !==
                1
            ) {
                throw ValidationException::withMessages([
                    'recipient_ids' =>
                    'Selecione exatamente um destinatário.',
                ]);
            }

            $recipientId =
                $ids->first();

            if ($manager) {
                $this->assertTenantRecipient(
                    $recipientId,
                    $tenantId,
                    [
                        'funcionario',
                        'motorista',
                        'proprietario',
                    ]
                );
            } else {
                $this->assertTenantRecipient(
                    $recipientId,
                    $tenantId,
                    [
                        'admin_empresa',
                    ]
                );
            }

            return $this->createConversation(
                $user,
                $tenantId,
                'tenant',
                'direct',
                null,
                $data['subject'],
                true,
                [
                    $recipientId,
                ],
                $data['body'] ??
                    null,
                $attachments
            );
        }

        if (!$manager) {
            abort(403);
        }

        $audience =
            $data['audience'] ??
            'all';

        $recipientIds =
            $this->resolveTenantAudience(
                $tenantId,
                $audience,
                collect(
                    $data['recipient_ids'] ??
                        []
                )
            );

        if (
            $recipientIds
            ->isEmpty()
        ) {
            throw ValidationException::withMessages([
                'audience' =>
                'Nenhum destinatário corresponde ao público selecionado.',
            ]);
        }

        return $this->createConversation(
            $user,
            $tenantId,
            'tenant',
            'broadcast',
            $audience,
            $data['subject'],
            false,
            $recipientIds->all(),
            $data['body'] ??
                null,
            $attachments
        );
    }

    public function createGlobal(
        User $user,
        array $data,
        array $attachments = []
    ): ChatConversation {
        if (
            !$user->isSuperAdmin()
        ) {
            abort(403);
        }

        $type = $data['type'];

        if (
            $type ===
            'direct'
        ) {
            $ids = collect(
                $data['recipient_ids'] ??
                    []
            )
                ->unique()
                ->values();

            if (
                $ids->count() !==
                1
            ) {
                throw ValidationException::withMessages([
                    'recipient_ids' =>
                    'Selecione exatamente um destinatário.',
                ]);
            }

            $recipient =
                User::query()
                ->whereKey(
                    $ids->first()
                )
                ->where(
                    'ativo',
                    true
                )
                ->first();

            if (
                !$recipient ||
                $recipient->id ===
                $user->id
            ) {
                throw ValidationException::withMessages([
                    'recipient_ids' =>
                    'Destinatário inválido.',
                ]);
            }

            return $this->createConversation(
                $user,
                null,
                'saas',
                'direct',
                null,
                $data['subject'],
                true,
                [
                    $recipient->id,
                ],
                $data['body'] ??
                    null,
                $attachments
            );
        }

        $audience =
            $data['audience'] ??
            'all';

        $recipientIds =
            $this->resolveGlobalAudience(
                $user,
                $audience,
                collect(
                    $data['recipient_ids'] ??
                        []
                )
            );

        if (
            $recipientIds
            ->isEmpty()
        ) {
            throw ValidationException::withMessages([
                'audience' =>
                'Nenhum destinatário corresponde ao público selecionado.',
            ]);
        }

        return $this->createConversation(
            $user,
            null,
            'saas',
            'broadcast',
            $audience,
            $data['subject'],
            false,
            $recipientIds->all(),
            $data['body'] ??
                null,
            $attachments
        );
    }

    public function send(
        User $user,
        ChatConversation $conversation,
        ?string $body,
        array $attachments = []
    ): ChatMessage {
        $this->assertParticipant(
            $conversation,
            $user
        );

        if (
            !$conversation
                ->allow_replies
        ) {
            abort(
                403,
                'Esta comunicação não aceita respostas.'
            );
        }

        $this->assertContent(
            $body,
            $attachments
        );

        return DB::transaction(
            function () use (
                $user,
                $conversation,
                $body,
                $attachments
            ) {
                $message =
                    ChatMessage::create([
                        'conversation_id' =>
                        $conversation->id,

                        'sender_user_id' =>
                        $user->id,

                        'body' =>
                        filled($body)
                            ? trim($body)
                            : null,

                        'kind' => 'text',
                    ]);

                $this->storeAttachments(
                    $message,
                    $attachments
                );

                $conversation->update([
                    'last_message_at' =>
                    $message
                        ->created_at,
                ]);

                $this->markRead(
                    $conversation,
                    $user
                );

                return $message
                    ->load([
                        'sender:id,name,email',
                        'attachments',
                    ]);
            }
        );
    }

    public function markRead(
        ChatConversation $conversation,
        User $user
    ): void {
        ChatParticipant::query()
            ->where(
                'conversation_id',
                $conversation->id
            )
            ->where(
                'user_id',
                $user->id
            )
            ->update([
                'last_read_at' => now(),
            ]);
    }

    public function unread(
        User $user,
        ?string $tenantId = null,
        bool $global = false
    ): int {
        $query =
            ChatParticipant::query()
            ->where(
                'user_id',
                $user->id
            )
            ->whereNull(
                'archived_at'
            );

        if ($global) {
            $query->whereHas(
                'conversation',
                fn($query) =>
                $query->where(
                    'source',
                    'saas'
                )
            );
        } else {
            $query->whereHas(
                'conversation',
                function ($query) use (
                    $tenantId
                ) {
                    $query->whereNull(
                        'tenant_id'
                    );

                    if ($tenantId) {
                        $query->orWhere(
                            'tenant_id',
                            $tenantId
                        );
                    }
                }
            );
        }

        return $query
            ->get()
            ->sum(
                fn(ChatParticipant $participant) =>
                $this->unreadCount(
                    $participant,
                    $user
                )
            );
    }

    public function tenantRecipients(
        User $user,
        string $tenantId,
        ?string $search = null
    ): array {
        if (
            $this->isManager(
                $user,
                $tenantId
            )
        ) {
            $roles = [
                'funcionario',
                'motorista',
                'proprietario',
            ];

            $canBroadcast = true;

            $audiences = [
                [
                    'value' => 'all',
                    'label' => 'Todos',
                ],
                [
                    'value' => 'employees',
                    'label' => 'Funcionários',
                ],
                [
                    'value' => 'drivers',
                    'label' => 'Motoristas',
                ],
                [
                    'value' => 'owners',
                    'label' => 'Proprietários',
                ],
                [
                    'value' => 'selected',
                    'label' => 'Selecionados',
                ],
            ];
        } elseif (
            $user->hasRole(
                'motorista',
                $tenantId
            ) ||
            $user->hasRole(
                'proprietario',
                $tenantId
            )
        ) {
            $roles = [
                'admin_empresa',
            ];

            $canBroadcast = false;
            $audiences = [];
        } else {
            return [
                'can_create' => false,
                'can_broadcast' => false,
                'audiences' => [],
                'recipients' => [],
            ];
        }

        return [
            'can_create' => true,

            'can_broadcast' =>
            $canBroadcast,

            'audiences' =>
            $audiences,

            'recipients' =>
            $this
                ->usersByTenantRoles(
                    $tenantId,
                    $roles,
                    $search
                )
                ->reject(
                    fn(array $item) =>
                    $item['id'] ===
                        $user->id
                )
                ->values()
                ->all(),
        ];
    }

    public function globalRecipients(
        User $user,
        ?string $search = null,
        ?string $role = null
    ): array {
        if (
            !$user->isSuperAdmin()
        ) {
            abort(403);
        }

        $query =
            User::query()
            ->where(
                'ativo',
                true
            )
            ->where(
                'id',
                '!=',
                $user->id
            )
            ->with(
                'roles:id,codigo'
            );

        if (
            filled($search)
        ) {
            $term =
                '%' .
                trim($search) .
                '%';

            $query->where(
                function ($query) use (
                    $term
                ) {
                    $query
                        ->where(
                            'name',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'email',
                            'like',
                            $term
                        );
                }
            );
        }

        if (
            filled($role) &&
            $role !== 'all'
        ) {
            $query->whereHas(
                'roles',
                fn($query) =>
                $query->where(
                    'roles.codigo',
                    $role
                )
            );
        }

        $users = $query
            ->orderBy('name')
            ->limit(100)
            ->get([
                'id',
                'name',
                'email',
            ]);

        return [
            'can_create' => true,
            'can_broadcast' => true,

            'audiences' => [
                [
                    'value' => 'all',
                    'label' => 'Todos os utilizadores',
                ],
                [
                    'value' => 'managers',
                    'label' => 'Gestores de frota',
                ],
                [
                    'value' => 'employees',
                    'label' => 'Funcionários',
                ],
                [
                    'value' => 'drivers',
                    'label' => 'Motoristas',
                ],
                [
                    'value' => 'owners',
                    'label' => 'Proprietários',
                ],
                [
                    'value' => 'selected',
                    'label' => 'Selecionados',
                ],
            ],

            'recipients' =>
            $users
                ->map(
                    fn(User $item) => [
                        'id' => $item->id,
                        'name' => $item->name,
                        'email' => $item->email,

                        'roles' =>
                        $item
                            ->roles
                            ->pluck(
                                'codigo'
                            )
                            ->unique()
                            ->values()
                            ->all(),
                    ]
                )
                ->all(),
        ];
    }

    public function serializeConversation(
        ChatConversation $conversation,
        User $user,
        bool $withMessages = false
    ): array {
        $participant =
            $conversation
            ->relationLoaded(
                'participants'
            )
            ? $conversation
            ->participants
            ->firstWhere(
                'user_id',
                $user->id
            )
            : ChatParticipant::query()
            ->where(
                'conversation_id',
                $conversation->id
            )
            ->where(
                'user_id',
                $user->id
            )
            ->first();

        $unread =
            $participant
            ? $this->unreadCount(
                $participant,
                $user
            )
            : 0;

        $participantsCount =
            isset(
                $conversation
                    ->participants_count
            )
            ? (int)
            $conversation
                ->participants_count
            : null;

        $readCount =
            isset(
                $conversation
                    ->read_participants_count
            )
            ? (int)
            $conversation
                ->read_participants_count
            : null;

        $data = [
            'id' => $conversation->id,

            'tenant_id' =>
            $conversation->tenant_id,

            'source' =>
            $conversation->source,

            'type' =>
            $conversation->type,

            'audience' =>
            $conversation->audience,

            'subject' =>
            $conversation->subject,

            /*
             * Nome público da API.
             * Banco usa allow_replies.
             */
            'reply_enabled' =>
            (bool)
            $conversation
                ->allow_replies,

            'status' => 'active',

            'last_message_at' =>
            $conversation
                ->last_message_at
                ?->toISOString(),

            'created_at' =>
            $conversation
                ->created_at
                ?->toISOString(),

            'created_by' =>
            $conversation
                ->createdBy
                ? [
                    'id' =>
                    $conversation
                        ->createdBy
                        ->id,

                    'name' =>
                    $conversation
                        ->createdBy
                        ->name,

                    'email' =>
                    $conversation
                        ->createdBy
                        ->email,
                ]
                : null,

            'participants' =>
            $conversation
                ->relationLoaded(
                    'participants'
                )
                ? $conversation
                ->participants
                ->map(
                    fn(ChatParticipant $item) => [
                        'id' =>
                        $item
                            ->user_id,

                        'name' =>
                        $item
                            ->user
                            ?->name,

                        'email' =>
                        $item
                            ->user
                            ?->email,

                        'role' =>
                        $item
                            ->role_snapshot,

                        'last_read_at' =>
                        $item
                            ->last_read_at
                            ?->toISOString(),
                    ]
                )
                ->values()
                ->all()
                : [],

            'participant_count' =>
            $participantsCount,

            'recipient_count' =>
            $participantsCount !== null
                ? max(
                    0,
                    $participantsCount - 1
                )
                : null,

            'read_count' =>
            $readCount !== null
                ? max(
                    0,
                    $readCount - 1
                )
                : null,

            'unread_count' =>
            $unread,
        ];

        if (
            $conversation
            ->relationLoaded(
                'latestMessage'
            )
        ) {
            $data['last_message'] =
                $conversation
                ->latestMessage
                ? $this->serializeMessage(
                    $conversation
                        ->latestMessage
                )
                : null;
        }

        if (
            $withMessages &&
            $conversation
            ->relationLoaded(
                'messages'
            )
        ) {
            $data['messages'] =
                $conversation
                ->messages
                ->map(
                    fn(ChatMessage $message) =>
                    $this->serializeMessage(
                        $message
                    )
                )
                ->values()
                ->all();
        }

        return $data;
    }

    public function serializeMessage(
        ChatMessage $message
    ): array {
        return [
            'id' => $message->id,

            'body' => $message->body,

            'kind' => $message->kind,

            /*
             * Nome público da API.
             * Banco usa created_at.
             */
            'sent_at' =>
            $message
                ->created_at
                ?->toISOString(),

            'sender' =>
            $message
                ->sender
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

            'attachments' =>
            $message
                ->attachments
                ->map(
                    fn(ChatAttachment $item) => [
                        'id' => $item->id,

                        'kind' =>
                        $item->kind,

                        'name' =>
                        $item
                            ->original_name,

                        'mime' =>
                        $item
                            ->mime_type,

                        'size' =>
                        $item->size,

                        'url' =>
                        "/api/chat/anexos/{$item->id}/arquivo",

                        'download_url' =>
                        "/api/chat/anexos/{$item->id}/download",
                    ]
                )
                ->values()
                ->all(),
        ];
    }

    private function createConversation(
        User $creator,
        ?string $tenantId,
        string $source,
        string $type,
        ?string $audience,
        string $subject,
        bool $allowReplies,
        array $recipientIds,
        ?string $body,
        array $attachments
    ): ChatConversation {
        $this->assertContent(
            $body,
            $attachments
        );

        $conversationId =
            DB::transaction(
                function () use (
                    $creator,
                    $tenantId,
                    $source,
                    $type,
                    $audience,
                    $subject,
                    $allowReplies,
                    $recipientIds,
                    $body,
                    $attachments
                ) {
                    $conversation =
                        ChatConversation::create([
                            'tenant_id' =>
                            $tenantId,

                            'created_by_user_id' =>
                            $creator->id,

                            'source' =>
                            $source,

                            'type' =>
                            $type,

                            'audience' =>
                            $audience,

                            'subject' =>
                            trim($subject),

                            'allow_replies' =>
                            $allowReplies,

                            'last_message_at' =>
                            null,
                        ]);

                    $participants =
                        collect(
                            $recipientIds
                        )
                        ->push(
                            $creator->id
                        )
                        ->unique()
                        ->values();

                    $snapshots =
                        $this->roleSnapshots(
                            $participants,
                            $tenantId
                        );

                    $now = now();

                    $rows =
                        $participants
                        ->map(
                            fn(string $userId) => [
                                'id' =>
                                (string)
                                Str::uuid(),

                                'conversation_id' =>
                                $conversation->id,

                                'user_id' =>
                                $userId,

                                'role_snapshot' =>
                                $tenantId
                                    ? (
                                        $snapshots[$userId] ??
                                        null
                                    )
                                    : (
                                        $userId ===
                                        $creator->id
                                        ? 'super_admin'
                                        : null
                                    ),

                                'joined_at' => $now,

                                'last_read_at' =>
                                $userId ===
                                    $creator->id
                                    ? $now
                                    : null,

                                'archived_at' =>
                                null,

                                'created_at' => $now,
                                'updated_at' => $now,
                            ]
                        );

                    foreach (
                        $rows->chunk(1000)
                        as $chunk
                    ) {
                        ChatParticipant::query()
                            ->insert(
                                $chunk->all()
                            );
                    }

                    $message =
                        ChatMessage::create([
                            'conversation_id' =>
                            $conversation->id,

                            'sender_user_id' =>
                            $creator->id,

                            'body' =>
                            filled($body)
                                ? trim($body)
                                : null,

                            'kind' =>
                            $type ===
                                'broadcast'
                                ? 'announcement'
                                : 'text',
                        ]);

                    $this->storeAttachments(
                        $message,
                        $attachments
                    );

                    $conversation->update([
                        'last_message_at' =>
                        $message
                            ->created_at,
                    ]);

                    return $conversation->id;
                }
            );

        return $this->conversation(
            $creator,
            $conversationId,
            $tenantId
        );
    }

    private function storeAttachments(
        ChatMessage $message,
        array $attachments
    ): void {
        foreach (
            $attachments as $file
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
                );

            $filename =
                Str::uuid() .
                '.' .
                $extension;

            $path =
                $file->storeAs(
                    "chat/{$message->conversation_id}/{$message->id}",
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

            ChatAttachment::create([
                'message_id' =>
                $message->id,

                'disk' => 'local',

                'path' => $path,

                'original_name' =>
                $file
                    ->getClientOriginalName(),

                'mime_type' =>
                $file
                    ->getMimeType()
                    ?: 'application/octet-stream',

                'size' =>
                $file->getSize(),

                'kind' =>
                $file
                    ->getMimeType() ===
                    'application/pdf'
                    ? 'pdf'
                    : 'image',

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

    private function resolveTenantAudience(
        string $tenantId,
        string $audience,
        Collection $selected
    ): Collection {
        if (
            $audience ===
            'selected'
        ) {
            return $selected
                ->unique()
                ->filter(
                    fn(string $id) =>
                    $this
                        ->tenantUserHasRole(
                            $id,
                            $tenantId,
                            [
                                'funcionario',
                                'motorista',
                                'proprietario',
                            ]
                        )
                )
                ->values();
        }

        $roles = match ($audience) {
            'employees' => [
                'funcionario',
            ],

            'drivers' => [
                'motorista',
            ],

            'owners' => [
                'proprietario',
            ],

            default => [
                'funcionario',
                'motorista',
                'proprietario',
            ],
        };

        return $this
            ->tenantUserIdsByRoles(
                $tenantId,
                $roles
            );
    }

    private function resolveGlobalAudience(
        User $creator,
        string $audience,
        Collection $selected
    ): Collection {
        if (
            $audience ===
            'selected'
        ) {
            return User::query()
                ->where(
                    'ativo',
                    true
                )
                ->whereIn(
                    'id',
                    $selected
                )
                ->where(
                    'id',
                    '!=',
                    $creator->id
                )
                ->pluck('id');
        }

        if (
            $audience ===
            'all'
        ) {
            return User::query()
                ->where(
                    'ativo',
                    true
                )
                ->where(
                    'id',
                    '!=',
                    $creator->id
                )
                ->pluck('id');
        }

        $role = match ($audience) {
            'managers' =>
            'admin_empresa',

            'employees' =>
            'funcionario',

            'drivers' =>
            'motorista',

            'owners' =>
            'proprietario',

            default => null,
        };

        if (!$role) {
            return collect();
        }

        return UserRole::query()
            ->whereHas(
                'role',
                fn($query) =>
                $query->where(
                    'codigo',
                    $role
                )
            )
            ->whereNotNull(
                'tenant_id'
            )
            ->where(
                'user_id',
                '!=',
                $creator->id
            )
            ->whereHas(
                'user',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->whereExists(
                function ($query) {
                    $query
                        ->selectRaw(1)
                        ->from(
                            'tenant_users'
                        )
                        ->whereColumn(
                            'tenant_users.user_id',
                            'user_roles.user_id'
                        )
                        ->whereColumn(
                            'tenant_users.tenant_id',
                            'user_roles.tenant_id'
                        )
                        ->where(
                            'tenant_users.status',
                            'ativo'
                        );
                }
            )
            ->distinct()
            ->pluck(
                'user_id'
            );
    }

    private function usersByTenantRoles(
        string $tenantId,
        array $roles,
        ?string $search
    ): Collection {
        $userIds =
            $this
            ->tenantUserIdsByRoles(
                $tenantId,
                $roles
            );

        $query =
            User::query()
            ->whereIn(
                'id',
                $userIds
            )
            ->where(
                'ativo',
                true
            );

        if (
            filled($search)
        ) {
            $term =
                '%' .
                trim($search) .
                '%';

            $query->where(
                function ($query) use (
                    $term
                ) {
                    $query
                        ->where(
                            'name',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'email',
                            'like',
                            $term
                        );
                }
            );
        }

        return $query
            ->orderBy('name')
            ->limit(100)
            ->get([
                'id',
                'name',
                'email',
            ])
            ->map(
                fn(User $item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'email' => $item->email,

                    'roles' =>
                    UserRole::query()
                        ->where(
                            'user_id',
                            $item->id
                        )
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->with(
                            'role:id,codigo'
                        )
                        ->get()
                        ->pluck(
                            'role.codigo'
                        )
                        ->filter()
                        ->values()
                        ->all(),
                ]
            );
    }

    private function tenantUserIdsByRoles(
        string $tenantId,
        array $roles
    ): Collection {
        $activeUsers =
            TenantUser::query()
            ->select(
                'user_id'
            )
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'ativo'
            );

        return UserRole::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereIn(
                'user_id',
                $activeUsers
            )
            ->whereHas(
                'role',
                fn($query) =>
                $query->whereIn(
                    'codigo',
                    $roles
                )
            )
            ->whereHas(
                'user',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->distinct()
            ->pluck(
                'user_id'
            );
    }

    private function assertTenantRecipient(
        string $userId,
        string $tenantId,
        array $roles
    ): void {
        if (
            !$this
                ->tenantUserHasRole(
                    $userId,
                    $tenantId,
                    $roles
                )
        ) {
            throw ValidationException::withMessages([
                'recipient_ids' =>
                'O destinatário não pertence ao público permitido.',
            ]);
        }
    }

    private function tenantUserHasRole(
        string $userId,
        string $tenantId,
        array $roles
    ): bool {
        $membership =
            TenantUser::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $userId
            )
            ->where(
                'status',
                'ativo'
            )
            ->exists();

        if (
            !$membership
        ) {
            return false;
        }

        return UserRole::query()
            ->where(
                'user_id',
                $userId
            )
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereHas(
                'role',
                fn($query) =>
                $query->whereIn(
                    'codigo',
                    $roles
                )
            )
            ->whereHas(
                'user',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->exists();
    }

    private function roleSnapshots(
        Collection $userIds,
        ?string $tenantId
    ): array {
        if (
            !$tenantId
        ) {
            return [];
        }

        $priority = [
            'admin_empresa' => 1,
            'funcionario' => 2,
            'motorista' => 3,
            'proprietario' => 4,
        ];

        return UserRole::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereIn(
                'user_id',
                $userIds
            )
            ->with(
                'role:id,codigo'
            )
            ->get()
            ->groupBy(
                'user_id'
            )
            ->map(
                function ($items) use (
                    $priority
                ) {
                    return $items
                        ->map(
                            fn($item) =>
                            $item
                                ->role
                                ?->codigo
                        )
                        ->filter()
                        ->sortBy(
                            fn(string $code) =>
                            $priority[$code] ??
                                999
                        )
                        ->first();
                }
            )
            ->all();
    }

    private function visibleQuery(
        User $user,
        string $tenantId
    ) {
        return ChatConversation::query()
            ->where(
                function ($query) use (
                    $tenantId
                ) {
                    $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->orWhereNull(
                            'tenant_id'
                        );
                }
            )
            ->whereHas(
                'participants',
                fn($query) =>
                $query
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->whereNull(
                        'archived_at'
                    )
            );
    }

    private function assertParticipant(
        ChatConversation $conversation,
        User $user
    ): void {
        if (
            !$conversation
                ->participants()
                ->where(
                    'user_id',
                    $user->id
                )
                ->exists()
        ) {
            abort(403);
        }
    }

    private function assertContent(
        ?string $body,
        array $attachments
    ): void {
        if (
            blank($body) &&
            count(
                $attachments
            ) === 0
        ) {
            throw ValidationException::withMessages([
                'body' =>
                'Escreva uma mensagem ou anexe um ficheiro.',
            ]);
        }
    }

    private function unreadCount(
        ChatParticipant $participant,
        User $user
    ): int {
        $query = ChatMessage::query()
            ->where(
                'conversation_id',
                $participant->conversation_id
            )
            ->where(
                function ($query) use ($user) {
                    $query
                        ->whereNull(
                            'sender_user_id'
                        )
                        ->orWhere(
                            'sender_user_id',
                            '!=',
                            $user->id
                        );
                }
            );

        if ($participant->last_read_at) {
            $query->where(
                'created_at',
                '>',
                $participant->last_read_at
            );
        } else {
            $query->where(
                'created_at',
                '>=',
                $participant->joined_at
            );
        }

        return $query->count();
    }

    private function isManager(
        User $user,
        string $tenantId
    ): bool {
        return
            $user->isSuperAdmin() ||
            $user->hasRole(
                'admin_empresa',
                $tenantId
            );
    }
}
