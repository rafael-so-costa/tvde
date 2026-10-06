<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\AlertRecipient;
use App\Models\AlertRule;
use App\Models\HelpContent;
use App\Models\HelpdeskTicket;
use App\Models\PlatformNotification;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class NotificationCenterService
{
    private const TYPES=[
        'news'=>'Novidade',
        'platform_status'=>'Status da plataforma',
        'maintenance'=>'Manutenção programada',
        'system'=>'Sistema',
        'account'=>'Conta',
    ];

    private const AUDIENCES=[
        'admin_empresa'=>'Gestor de Frota',
        'funcionario'=>'Funcionário',
        'motorista'=>'Motorista',
        'proprietario'=>'Proprietário',
    ];

    private const SEVERITIES=[
        'low'=>'Baixa',
        'medium'=>'Média',
        'high'=>'Alta',
        'critical'=>'Crítica',
    ];

    public function __construct(
        private AlertService $alerts
    ){}

    public function meta(): array
    {
        return [
            'types'=>$this->options(
                self::TYPES
            ),

            'audiences'=>$this->options(
                self::AUDIENCES
            ),

            'severities'=>$this->options(
                self::SEVERITIES
            ),

            'scopes'=>[
                [
                    'value'=>'all',
                    'label'=>'Todos os clientes',
                ],
                [
                    'value'=>'selected',
                    'label'=>'Tenants selecionados',
                ],
            ],

            'channels'=>[
                [
                    'value'=>'in_app',
                    'label'=>'No FrotaPro',
                ],
                [
                    'value'=>'email',
                    'label'=>'Email',
                ],
            ],

            'tenants'=>
                Tenant::query()
                    ->where(
                        'ativo',
                        true
                    )
                    ->orderBy(
                        'nome'
                    )
                    ->get([
                        'id',
                        'nome',
                    ])
                    ->map(fn(Tenant $tenant)=>[
                        'id'=>$tenant->id,
                        'name'=>$tenant->nome,
                    ])
                    ->values()
                    ->all(),
        ];
    }

    public function summary(): array
    {
        $base=
            PlatformNotification::query();

        return [
            'total'=>
                (clone $base)
                    ->count(),

            'published'=>
                (clone $base)
                    ->where(
                        'active',
                        true
                    )
                    ->whereNotNull(
                        'published_at'
                    )
                    ->where(
                        'published_at',
                        '<=',
                        now()
                    )
                    ->whereNull(
                        'resolved_at'
                    )
                    ->where(
                        function(
                            Builder $query
                        ){
                            $query
                                ->whereNull(
                                    'expires_at'
                                )
                                ->orWhere(
                                    'expires_at',
                                    '>',
                                    now()
                                );
                        }
                    )
                    ->count(),

            'scheduled'=>
                (clone $base)
                    ->where(
                        'active',
                        true
                    )
                    ->where(
                        'published_at',
                        '>',
                        now()
                    )
                    ->whereNull(
                        'resolved_at'
                    )
                    ->count(),

            'incidents'=>
                (clone $base)
                    ->whereIn(
                        'type',
                        [
                            'platform_status',
                            'maintenance',
                        ]
                    )
                    ->where(
                        'active',
                        true
                    )
                    ->whereNull(
                        'resolved_at'
                    )
                    ->count(),

            'recipients'=>
                AlertRecipient::query()
                    ->whereHas(
                        'alert',
                        fn(Builder $query)=>
                            $query->where(
                                'source_type',
                                'platform_notification'
                            )
                    )
                    ->count(),
        ];
    }

    public function index(
        array $filters
    ): array {
        $query=
            PlatformNotification::query()
                ->with(
                    'tenants:id,nome'
                )
                ->orderByDesc(
                    'created_at'
                );

        if(
            !empty(
                $filters['search']
            )
        ){
            $term=
                '%'.
                trim(
                    $filters['search']
                ).
                '%';

            $query->where(
                function(
                    Builder $query
                ) use(
                    $term
                ){
                    $query
                        ->where(
                            'title',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'message',
                            'like',
                            $term
                        );
                }
            );
        }

        if(
            !empty(
                $filters['type']
            )
        ){
            $query->where(
                'type',
                $filters['type']
            );
        }

        if(
            !empty(
                $filters['target_scope']
            )
        ){
            $query->where(
                'target_scope',
                $filters[
                    'target_scope'
                ]
            );
        }

        if(
            !empty(
                $filters['status']
            )
        ){
            match(
                $filters['status']
            ){
                'draft'=>
                    $query->where(
                        'active',
                        false
                    ),

                'scheduled'=>
                    $query
                        ->where(
                            'active',
                            true
                        )
                        ->where(
                            'published_at',
                            '>',
                            now()
                        )
                        ->whereNull(
                            'resolved_at'
                        ),

                'published'=>
                    $query
                        ->where(
                            'active',
                            true
                        )
                        ->where(
                            'published_at',
                            '<=',
                            now()
                        )
                        ->whereNull(
                            'resolved_at'
                        )
                        ->where(
                            function(
                                Builder $query
                            ){
                                $query
                                    ->whereNull(
                                        'expires_at'
                                    )
                                    ->orWhere(
                                        'expires_at',
                                        '>',
                                        now()
                                    );
                            }
                        ),

                'resolved'=>
                    $query
                        ->whereNotNull(
                            'resolved_at'
                        ),

                'expired'=>
                    $query
                        ->whereNull(
                            'resolved_at'
                        )
                        ->whereNotNull(
                            'expires_at'
                        )
                        ->where(
                            'expires_at',
                            '<=',
                            now()
                        ),

                default=>null,
            };
        }

        $paginator=
            $query->paginate(
                (int)(
                    $filters[
                        'per_page'
                    ]??25
                )
            );

        return [
            'data'=>
                $paginator
                    ->getCollection()
                    ->map(
                        fn(
                            PlatformNotification $notification
                        )=>
                            $this->serialize(
                                $notification
                            )
                    )
                    ->values()
                    ->all(),

            'meta'=>[
                'current_page'=>
                    $paginator
                        ->currentPage(),

                'last_page'=>
                    $paginator
                        ->lastPage(),

                'per_page'=>
                    $paginator
                        ->perPage(),

                'total'=>
                    $paginator
                        ->total(),
            ],
        ];
    }

    public function show(
        string $id
    ): array {
        return $this->serialize(
            PlatformNotification::query()
                ->with(
                    'tenants:id,nome'
                )
                ->findOrFail(
                    $id
                )
        );
    }

    public function store(
        User $user,
        array $data
    ): array {
        $tenantIds=
            $data[
                'tenant_ids'
            ]??[];

        unset(
            $data[
                'tenant_ids'
            ]
        );

        $this->prepare(
            $data
        );

        $notification=
            DB::transaction(
                function() use(
                    $user,
                    $data,
                    $tenantIds
                ){
                    $notification=
                        PlatformNotification::create([
                            ...$data,

                            'created_by_user_id'=>
                                $user->id,

                            'updated_by_user_id'=>
                                $user->id,
                        ]);

                    if(
                        $notification
                            ->target_scope===
                        'selected'
                    ){
                        $notification
                            ->tenants()
                            ->sync(
                                $tenantIds
                            );
                    }

                    return $notification;
                }
            );

        $this->syncPlatformNotification(
            $notification->fresh(
                'tenants'
            )
        );

        return $this->show(
            $notification->id
        );
    }

    public function update(
        User $user,
        string $id,
        array $data
    ): array {
        $notification=
            PlatformNotification::query()
                ->findOrFail(
                    $id
                );

        $tenantIds=
            $data[
                'tenant_ids'
            ]??null;

        unset(
            $data[
                'tenant_ids'
            ]
        );

        $this->prepare(
            $data,
            $notification
        );

        DB::transaction(
            function() use(
                $notification,
                $user,
                $data,
                $tenantIds
            ){
                $notification
                    ->fill(
                        $data
                    );

                $notification
                    ->updated_by_user_id=
                    $user->id;

                $notification->save();

                if(
                    $notification
                        ->target_scope===
                    'all'
                ){
                    $notification
                        ->tenants()
                        ->sync([]);
                }elseif(
                    $tenantIds!==null
                ){
                    $notification
                        ->tenants()
                        ->sync(
                            $tenantIds
                        );
                }
            }
        );

        $this->syncPlatformNotification(
            $notification->fresh(
                'tenants'
            )
        );

        return $this->show(
            $notification->id
        );
    }

    public function resolve(
        User $user,
        string $id
    ): array {
        $notification=
            PlatformNotification::query()
                ->findOrFail(
                    $id
                );

        if(
            !$notification
                ->resolved_at
        ){
            $notification
                ->resolved_at=
                now();

            $notification
                ->updated_by_user_id=
                $user->id;

            $notification->save();
        }

        $this->syncPlatformNotification(
            $notification->fresh(
                'tenants'
            )
        );

        return $this->show(
            $notification->id
        );
    }

    public function destroy(
        string $id
    ): void {
        $notification=
            PlatformNotification::query()
                ->findOrFail(
                    $id
                );

        if(
            Alert::query()
                ->where(
                    'source_type',
                    'platform_notification'
                )
                ->where(
                    'source_id',
                    $notification->id
                )
                ->exists()
        ){
            throw ValidationException::withMessages([
                'notification'=>
                    'Uma comunicação já distribuída não pode ser eliminada. Resolva-a para preservar o histórico.',
            ]);
        }

        $notification->delete();
    }

    public function syncPlatformNotification(
        PlatformNotification $notification
    ): void {
        $notification
            ->loadMissing(
                'tenants'
            );

        $targetTenantIds=
            $this->targetTenantIds(
                $notification
            );

        $live=
            $this->platformIsLive(
                $notification
            );

        if($live){
            foreach(
                $targetTenantIds
                as $tenantId
            ){
                $recipients=
                    $this->recipientIds(
                        $tenantId,
                        $notification
                            ->audiences??
                        []
                    );

                $category=
                    $this->categoryForType(
                        $notification->type
                    );

                $rule=
                    $this->ensureRule(
                        $tenantId,
                        'saas.platform.'.
                        str_replace(
                            '-',
                            '',
                            $notification->id
                        ),

                        $notification->title,
                        $category,
                        $notification->severity,

                        $notification
                            ->channels??
                        [
                            'in_app',
                        ]
                    );

                $this->alerts->raise(
                    $rule,
                    [
                        'source_type'=>
                            'platform_notification',

                        'source_id'=>
                            $notification->id,

                        'dedup_key'=>'primary',

                        'title'=>
                            $notification->title,

                        'message'=>
                            $notification->message,

                        'category'=>
                            $category,

                        'severity'=>
                            $notification
                                ->severity,

                        'action_url'=>
                            $notification
                                ->action_url,

                        'metadata'=>[
                            'platform_notification_id'=>
                                $notification->id,

                            'type'=>
                                $notification->type,

                            'audiences'=>
                                $notification
                                    ->audiences,
                        ],
                    ],
                    $recipients
                );
            }
        }

        $this->resolveSourceOutside(
            'platform_notification',
            $notification->id,
            $live
                ?$targetTenantIds
                :[]
        );

        DB::table(
            'platform_notifications'
        )
            ->where(
                'id',
                $notification->id
            )
            ->update([
                'synced_at'=>now(),
            ]);
    }

    public function syncHelpContent(
        HelpContent $content
    ): void {
        $content->loadMissing(
            'audiences'
        );

        $live=
            $content->active &&
            $content->published_at &&
            $content->published_at
                ->lte(now());

        $tenantIds=
            Tenant::query()
                ->where(
                    'ativo',
                    true
                )
                ->pluck(
                    'id'
                );

        if($live){
            $audiences=
                $content
                    ->audiences
                    ->pluck(
                        'audience'
                    )
                    ->values()
                    ->all();

            foreach(
                $tenantIds
                as $tenantId
            ){
                $recipients=
                    $this->recipientIds(
                        $tenantId,
                        $audiences
                    );

                $rule=
                    $this->ensureRule(
                        $tenantId,

                        'saas.help.'.
                        str_replace(
                            '-',
                            '',
                            $content->id
                        ),

                        'Central de Ajuda',
                        'training',
                        'low',
                        [
                            'in_app',
                            'email',
                        ]
                    );

                $this->alerts->raise(
                    $rule,
                    [
                        'source_type'=>
                            'help_content',

                        'source_id'=>
                            $content->id,

                        'dedup_key'=>'published',

                        'title'=>
                            $content->type===
                            'video'
                                ?'Novo treinamento disponível'
                                :'Novo artigo disponível',

                        'message'=>
                            $content->title,

                        'category'=>
                            'training',

                        'severity'=>'low',

                        'action_url'=>
                            "/ajuda/{$content->slug}",

                        'metadata'=>[
                            'content_id'=>
                                $content->id,

                            'content_type'=>
                                $content->type,

                            'slug'=>
                                $content->slug,
                        ],
                    ],
                    $recipients
                );
            }
        }

        $this->resolveSourceOutside(
            'help_content',
            $content->id,
            $live
                ?$tenantIds->all()
                :[]
        );

        DB::table(
            'help_contents'
        )
            ->where(
                'id',
                $content->id
            )
            ->update([
                'notification_synced_at'=>
                    now(),
            ]);
    }

    public function removeHelpContent(
        HelpContent $content
    ): void {
        $this->resolveSourceOutside(
            'help_content',
            $content->id,
            []
        );
    }

    public function notifyHelpdeskReply(
        HelpdeskTicket $ticket,
        string $messageId
    ): void {
        if(
            !$ticket->tenant_id
        ){
            return;
        }

        $recipients=
            $this->recipientIds(
                $ticket->tenant_id,
                [
                    'admin_empresa',
                ]
            );

        $rule=
            $this->ensureRule(
                $ticket->tenant_id,
                'saas.helpdesk.reply',
                'Respostas do Helpdesk',
                'helpdesk',
                'medium',
                [
                    'in_app',
                    'email',
                ]
            );

        $this->alerts->raise(
            $rule,
            [
                'source_type'=>
                    'helpdesk_message',

                'source_id'=>
                    $messageId,

                'dedup_key'=>
                    $messageId,

                'title'=>
                    'Nova resposta no Helpdesk',

                'message'=>
                    "{$ticket->number} · {$ticket->subject}",

                'category'=>
                    'helpdesk',

                'severity'=>'medium',

                'action_url'=>
                    "/helpdesk?ticket={$ticket->id}",

                'metadata'=>[
                    'ticket_id'=>
                        $ticket->id,

                    'ticket_number'=>
                        $ticket->number,
                ],
            ],
            $recipients
        );
    }

    public function syncDue(): array
    {
        $platformCount=0;
        $helpCount=0;

        $platform=
            PlatformNotification::query()
                ->where(
                    'active',
                    true
                )
                ->whereNull(
                    'resolved_at'
                )
                ->whereNotNull(
                    'published_at'
                )
                ->where(
                    function(
                        Builder $query
                    ){
                        $query
                            ->where(
                                function(
                                    Builder $query
                                ){
                                    $query
                                        ->where(
                                            'published_at',
                                            '<=',
                                            now()
                                        )
                                        ->where(
                                            function(
                                                Builder $query
                                            ){
                                                $query
                                                    ->whereNull(
                                                        'synced_at'
                                                    )
                                                    ->orWhereColumn(
                                                        'updated_at',
                                                        '>',
                                                        'synced_at'
                                                    )
                                                    ->orWhereColumn(
                                                        'synced_at',
                                                        '<',
                                                        'published_at'
                                                    );
                                            }
                                        );
                                }
                            )
                            ->orWhere(
                                function(
                                    Builder $query
                                ){
                                    $query
                                        ->whereNotNull(
                                            'expires_at'
                                        )
                                        ->where(
                                            'expires_at',
                                            '<=',
                                            now()
                                        )
                                        ->where(
                                            function(
                                                Builder $query
                                            ){
                                                $query
                                                    ->whereNull(
                                                        'synced_at'
                                                    )
                                                    ->orWhereColumn(
                                                        'synced_at',
                                                        '<',
                                                        'expires_at'
                                                    );
                                            }
                                        );
                                }
                            );
                    }
                )
                ->get();

        foreach(
            $platform
            as $notification
        ){
            $this->syncPlatformNotification(
                $notification
            );

            $platformCount++;
        }

        $contents=
            HelpContent::query()
                ->where(
                    'active',
                    true
                )
                ->whereNotNull(
                    'published_at'
                )
                ->where(
                    'published_at',
                    '<=',
                    now()
                )
                ->where(
                    function(
                        Builder $query
                    ){
                        $query
                            ->whereNull(
                                'notification_synced_at'
                            )
                            ->orWhereColumn(
                                'updated_at',
                                '>',
                                'notification_synced_at'
                            )
                            ->orWhereColumn(
                                'notification_synced_at',
                                '<',
                                'published_at'
                            );
                    }
                )
                ->get();

        foreach(
            $contents
            as $content
        ){
            $this->syncHelpContent(
                $content
            );

            $helpCount++;
        }

        return [
            'platform'=>$platformCount,
            'help_center'=>$helpCount,
        ];
    }

    private function prepare(
        array &$data,
        ?PlatformNotification $existing=null
    ): void {
        $active=
            $data['active']??
            $existing?->active??
            false;

        if(
            $active &&
            empty(
                $data[
                    'published_at'
                ]
            ) &&
            !$existing?->published_at
        ){
            $data['published_at']=
                now();
        }

        $channels=
            $data['channels']??
            $existing?->channels??
            [];

        $data['channels']=
            array_values(
                array_unique([
                    'in_app',
                    ...$channels,
                ])
            );

        if(
            isset(
                $data[
                    'audiences'
                ]
            )
        ){
            $data['audiences']=
                array_values(
                    array_unique(
                        $data[
                            'audiences'
                        ]
                    )
                );
        }
    }

    private function platformIsLive(
        PlatformNotification $notification
    ): bool {
        if(
            !$notification->active ||
            !$notification
                ->published_at ||
            $notification
                ->published_at
                ->gt(now()) ||
            $notification
                ->resolved_at
        ){
            return false;
        }

        if(
            $notification
                ->expires_at &&
            $notification
                ->expires_at
                ->lte(now())
        ){
            return false;
        }

        return true;
    }

    private function targetTenantIds(
        PlatformNotification $notification
    ): array {
        $query=
            Tenant::query()
                ->where(
                    'ativo',
                    true
                );

        if(
            $notification
                ->target_scope===
            'selected'
        ){
            $query->whereIn(
                'id',
                $notification
                    ->tenants
                    ->pluck(
                        'id'
                    )
            );
        }

        return $query
            ->pluck(
                'id'
            )
            ->values()
            ->all();
    }

    private function recipientIds(
        string $tenantId,
        array $audiences
    ): array {
        if(
            empty(
                $audiences
            )
        ){
            return [];
        }

        $activeUsers=
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
                fn(Builder $query)=>
                    $query->whereIn(
                        'codigo',
                        $audiences
                    )
            )
            ->whereHas(
                'user',
                fn(Builder $query)=>
                    $query->where(
                        'ativo',
                        true
                    )
            )
            ->pluck(
                'user_id'
            )
            ->unique()
            ->values()
            ->all();
    }

    private function ensureRule(
        string $tenantId,
        string $code,
        string $name,
        string $category,
        string $severity,
        array $channels
    ): AlertRule {
        $rule=
            AlertRule::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'code',
                    $code
                )
                ->first();

        if(!$rule){
            $rule=
                new AlertRule();

            $rule->tenant_id=
                $tenantId;

            $rule->code=
                $code;
        }

        $rule->name=$name;
        $rule->category=$category;
        $rule->severity=$severity;
        $rule->enabled=true;
        $rule->channels=
            array_values(
                array_unique(
                    $channels
                )
            );

        $rule->recipient_config=[
            'source'=>'notification_center',
        ];

        $rule->trigger_config=[
            'source'=>'system',
        ];

        $rule->repeat_config=null;

        $rule->save();

        return $rule;
    }

    private function resolveSourceOutside(
        string $sourceType,
        string $sourceId,
        array $keepTenantIds
    ): void {
        $query=
            Alert::query()
                ->where(
                    'source_type',
                    $sourceType
                )
                ->where(
                    'source_id',
                    $sourceId
                )
                ->where(
                    'status',
                    'open'
                );

        if(
            !empty(
                $keepTenantIds
            )
        ){
            $query->whereNotIn(
                'tenant_id',
                $keepTenantIds
            );
        }

        $alerts=
            $query->get([
                'tenant_id',
                'rule_code',
                'source_type',
                'source_id',
                'dedup_key',
            ]);

        foreach(
            $alerts
            as $alert
        ){
            $this->alerts
                ->resolveCondition(
                    $alert->tenant_id,
                    $alert->rule_code,
                    $alert->source_type,
                    $alert->source_id,
                    $alert->dedup_key,
                    'Notificação deixou de estar ativa.'
                );
        }
    }

    private function categoryForType(
        string $type
    ): string {
        return match($type){
            'news'=>'news',
            'platform_status'=>'platform',
            'maintenance'=>'platform',
            'account'=>'account',
            default=>'system',
        };
    }

    private function statusOf(
        PlatformNotification $notification
    ): string {
        if(
            $notification
                ->resolved_at
        ){
            return 'resolved';
        }

        if(
            $notification
                ->expires_at &&
            $notification
                ->expires_at
                ->lte(now())
        ){
            return 'expired';
        }

        if(
            !$notification->active
        ){
            return 'draft';
        }

        if(
            $notification
                ->published_at &&
            $notification
                ->published_at
                ->gt(now())
        ){
            return 'scheduled';
        }

        return 'published';
    }

    private function statusLabel(
        string $status
    ): string {
        return match($status){
            'published'=>'Publicado',
            'scheduled'=>'Agendado',
            'resolved'=>'Resolvido',
            'expired'=>'Expirado',
            default=>'Rascunho',
        };
    }

    private function serialize(
        PlatformNotification $notification
    ): array {
        $notification
            ->loadMissing(
                'tenants:id,nome'
            );

        $alerts=
            Alert::query()
                ->where(
                    'source_type',
                    'platform_notification'
                )
                ->where(
                    'source_id',
                    $notification->id
                );

        $recipients=
            AlertRecipient::query()
                ->whereHas(
                    'alert',
                    fn(Builder $query)=>
                        $query
                            ->where(
                                'source_type',
                                'platform_notification'
                            )
                            ->where(
                                'source_id',
                                $notification->id
                            )
                )
                ->count();

        $status=
            $this->statusOf(
                $notification
            );

        return [
            'id'=>$notification->id,
            'type'=>$notification->type,

            'type_label'=>
                self::TYPES[
                    $notification->type
                ]??
                $notification->type,

            'title'=>$notification->title,
            'message'=>$notification->message,

            'severity'=>
                $notification
                    ->severity,

            'severity_label'=>
                self::SEVERITIES[
                    $notification->severity
                ]??
                $notification->severity,

            'target_scope'=>
                $notification
                    ->target_scope,

            'audiences'=>
                $notification
                    ->audiences??
                [],

            'channels'=>
                $notification
                    ->channels??
                [
                    'in_app',
                ],

            'tenant_ids'=>
                $notification
                    ->tenants
                    ->pluck(
                        'id'
                    )
                    ->values()
                    ->all(),

            'tenants'=>
                $notification
                    ->tenants
                    ->map(fn(Tenant $tenant)=>[
                        'id'=>$tenant->id,
                        'name'=>$tenant->nome,
                    ])
                    ->values()
                    ->all(),

            'action_url'=>
                $notification
                    ->action_url,

            'active'=>
                $notification
                    ->active,

            'published_at'=>
                $notification
                    ->published_at
                    ?->toISOString(),

            'expires_at'=>
                $notification
                    ->expires_at
                    ?->toISOString(),

            'resolved_at'=>
                $notification
                    ->resolved_at
                    ?->toISOString(),

            'status'=>$status,

            'status_label'=>
                $this->statusLabel(
                    $status
                ),

            'tenants_reached'=>
                (clone $alerts)
                    ->distinct()
                    ->count(
                        'tenant_id'
                    ),

            'recipients'=>
                $recipients,

            'created_at'=>
                $notification
                    ->created_at
                    ?->toISOString(),

            'updated_at'=>
                $notification
                    ->updated_at
                    ?->toISOString(),
        ];
    }

    private function options(
        array $items
    ): array {
        return collect(
            $items
        )
            ->map(
                fn(
                    string $label,
                    string $value
                )=>[
                    'value'=>$value,
                    'label'=>$label,
                ]
            )
            ->values()
            ->all();
    }
}
