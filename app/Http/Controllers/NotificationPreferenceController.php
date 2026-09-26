<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpsertNotificationPreferenceRequest;
use App\Models\AlertDelivery;
use App\Models\NotificationPreference;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationPreferenceController extends Controller
{
    private const CATEGORIES=[
        'document',
        'contract',
        'rental',
        'claim',
        'maintenance',
        'diagnostic',
        'inventory',
        'purchase',
    ];

    public function __construct(
        private TenantContext $tenantContext
    ){}

    public function index(
        Request $request
    ): JsonResponse {
        $tenantId=
            $this->tenantId();

        $userId=
            $request->user()->id;

        $preferences=
            NotificationPreference::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $userId
                )
                ->orderBy('channel')
                ->orderBy('category')
                ->get();

        $emailPreferences=
            $preferences
                ->where(
                    'channel',
                    'email'
                )
                ->values();

        $wildcard=
            $emailPreferences
                ->firstWhere(
                    'category',
                    '*'
                );

        $effective=
            collect(
                self::CATEGORIES
            )
                ->map(
                    function(
                        string $category
                    ) use(
                        $emailPreferences,
                        $wildcard
                    ){
                        $specific=
                            $emailPreferences
                                ->firstWhere(
                                    'category',
                                    $category
                                );

                        $source=
                            $specific
                                ? 'category'
                                : (
                                    $wildcard
                                        ? 'global'
                                        : 'default'
                                );

                        $preference=
                            $specific
                            ?? $wildcard;

                        return [
                            'category'=>$category,
                            'channel'=>'email',
                            'enabled'=>
                                $preference
                                    ?->enabled
                                ?? false,

                            'minimum_severity'=>
                                $preference
                                    ?->minimum_severity
                                ?? 'low',

                            'delivery_mode'=>
                                $preference
                                    ?->delivery_mode
                                ?? 'immediate',

                            'quiet_hours_start'=>
                                $preference
                                    ?->quiet_hours_start,

                            'quiet_hours_end'=>
                                $preference
                                    ?->quiet_hours_end,

                            'timezone'=>
                                $preference
                                    ?->timezone
                                ?? config(
                                    'app.timezone',
                                    'Europe/Lisbon'
                                ),

                            'source'=>$source,
                        ];
                    }
                )
                ->values();

        return response()->json([
            'data'=>$preferences,
            'effective_email'=>
                $effective,
            'options'=>[
                'categories'=>[
                    '*',
                    ...self::CATEGORIES,
                ],
                'channels'=>[
                    'in_app',
                    'email',
                ],
                'minimum_severities'=>[
                    'low',
                    'medium',
                    'high',
                    'critical',
                ],
                'delivery_modes'=>[
                    'immediate',
                    'daily_digest',
                ],
            ],
        ]);
    }

    public function upsertEmail(
        UpsertNotificationPreferenceRequest $request
    ): JsonResponse {
        $tenantId=
            $this->tenantId();

        $userId=
            $request->user()->id;

        $data=
            $request->validated();

        $preference=
            NotificationPreference::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $userId
                )
                ->where(
                    'category',
                    $data['category']
                )
                ->where(
                    'channel',
                    'email'
                )
                ->first();

        $created=
            !$preference;

        if(!$preference){
            $preference=
                new NotificationPreference();

            $preference->tenant_id=
                $tenantId;

            $preference->user_id=
                $userId;

            $preference->category=
                $data['category'];

            $preference->channel=
                'email';
        }

        $preference->enabled=
            (bool)$data['enabled'];

        $preference
            ->minimum_severity=
            $data[
                'minimum_severity'
            ];

        $preference
            ->delivery_mode=
            $data[
                'delivery_mode'
            ];

        $preference
            ->quiet_hours_start=
            $data[
                'quiet_hours_start'
            ] ?? null;

        $preference
            ->quiet_hours_end=
            $data[
                'quiet_hours_end'
            ] ?? null;

        $preference->timezone=
            $data['timezone']
            ?? config(
                'app.timezone',
                'Europe/Lisbon'
            );

        $preference->save();

        return response()->json([
            'message'=>
                'Preferência de notificação atualizada.',
            'data'=>$preference,
        ],$created ? 201 : 200);
    }

    public function destroyEmail(
        Request $request
    ): JsonResponse {
        $validated=
            $request->validate([
                'category'=>[
                    'required',
                    Rule::in([
                        '*',
                        ...self::CATEGORIES,
                    ]),
                ],
            ]);

        $deleted=
            NotificationPreference::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->where(
                    'user_id',
                    $request->user()->id
                )
                ->where(
                    'category',
                    $validated[
                        'category'
                    ]
                )
                ->where(
                    'channel',
                    'email'
                )
                ->delete();

        return response()->json([
            'message'=>
                'Preferência de email removida.',
            'deleted'=>
                $deleted>0,
        ]);
    }

    public function deliveries(
        Request $request
    ): JsonResponse {
        $validated=
            $request->validate([
                'channel'=>[
                    'nullable',
                    Rule::in([
                        'in_app',
                        'email',
                    ]),
                ],

                'status'=>[
                    'nullable',
                    Rule::in([
                        'queued',
                        'processing',
                        'sent',
                        'delivered',
                        'failed',
                        'cancelled',
                    ]),
                ],

                'page'=>[
                    'nullable',
                    'integer',
                    'min:1',
                ],

                'per_page'=>[
                    'nullable',
                    'integer',
                    'min:1',
                    'max:100',
                ],
            ]);

        $query=
            AlertDelivery::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->whereHas(
                    'recipient',
                    fn($query)=>
                        $query->where(
                            'user_id',
                            $request
                                ->user()
                                ->id
                        )
                )
                ->with([
                    'recipient:id,alert_id,user_id,active',
                    'recipient.alert:id,rule_code,category,severity,title,message,due_at,action_url,status,triggered_at,resolved_at',
                ])
                ->orderByDesc(
                    'created_at'
                );

        if(
            !empty(
                $validated[
                    'channel'
                ]
            )
        ){
            $query->where(
                'channel',
                $validated[
                    'channel'
                ]
            );
        }

        if(
            !empty(
                $validated[
                    'status'
                ]
            )
        ){
            $query->where(
                'status',
                $validated[
                    'status'
                ]
            );
        }

        return response()->json(
            $query->paginate(
                (int)(
                    $validated[
                        'per_page'
                    ]
                    ?? 20
                )
            )
        );
    }

    private function tenantId(): string
    {
        if(
            !$this
                ->tenantContext
                ->hasTenant()
        ){
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this
            ->tenantContext
            ->requireId();
    }
}
