<?php

namespace App\Services;

use App\Models\Aluguer;
use App\Models\AuditLog;
use App\Models\ChecklistRecord;
use App\Models\Compra;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Declaracao;
use App\Models\Empresa;
use App\Models\Fornecedor;
use App\Models\Funcionario;
use App\Models\Manutencao;
use App\Models\ManutencaoAprovacao;
use App\Models\ManutencaoDocumento;
use App\Models\ManutencaoGarantia;
use App\Models\ManutencaoPlano;
use App\Models\Motorista;
use App\Models\Multa;
use App\Models\MultaDocumento;
use App\Models\Peca;
use App\Models\Proprietario;
use App\Models\ReciboVerde;
use App\Models\RegistoCriminal;
use App\Models\RegistoExpediente;
use App\Models\Sinistro;
use App\Models\SinistroDocumento;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantCustomField;
use App\Models\TenantUser;
use App\Models\UserPermission;
use App\Models\UserRole;
use App\Models\Veiculo;
use App\Models\VeiculoDiagnostico;
use BackedEnum;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use JsonSerializable;
use Stringable;
use UnitEnum;

class AuditService
{
    private static ?bool $tableReady=null;

    private const IGNORED_FIELDS=[
        'id',
        'tenant_id',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    private const SENSITIVE_FRAGMENTS=[
        'password',
        'senha',
        'secret',
        'token',
        'api_key',
        'authorization',
        'cookie',
    ];

    public static function moduleLabels(): array
    {
        return [
            'configuracoes'=>'Configurações',
            'empresas'=>'Empresas',
            'proprietarios'=>'Proprietários',
            'motoristas'=>'Motoristas',
            'funcionarios'=>'Funcionários',
            'veiculos'=>'Veículos',
            'alugueres'=>'Alugueres',
            'contratos'=>'Contratos',
            'declaracoes'=>'Declarações',
            'templates'=>'Templates',
            'checklist'=>'Checklists',
            'multas'=>'Multas',
            'sinistros'=>'Sinistros',
            'manutencao'=>'Manutenção',
            'expediente'=>'Expediente',
            'recibos_verdes'=>'Recibos verdes',
            'registos_criminais'=>'Registos criminais',
        ];
    }

    public static function actionLabels(): array
    {
        return [
            'created'=>'Criação',
            'updated'=>'Alteração',
            'deleted'=>'Eliminação',
        ];
    }

    public function capture(
        Model $model,
        string $action
    ): void {
        if($model instanceof AuditLog){
            return;
        }

        $module=$this->moduleFor(
            $model
        );

        if(!$module){
            return;
        }

        if(!$this->tableReady()){
            return;
        }

        $tenantId=$this->tenantIdFor(
            $model
        );

        if(!$tenantId){
            return;
        }

        [
            $oldValues,
            $newValues,
        ]=$this->valuesFor(
            $model,
            $action
        );

        if(
            $action==='updated' &&
            empty($oldValues) &&
            empty($newValues)
        ){
            return;
        }

        $actor=Auth::user();

        $request=
            app()->bound('request')
                ?request()
                :null;

        $hasWebRequest=
            $request &&
            $request->route()!==null;

        $subjectLabel=
            $this->subjectLabel(
                $model
            );

        AuditLog::query()->create([
            'tenant_id'=>$tenantId,

            'actor_user_id'=>
                $actor?->id,

            'module'=>$module,
            'action'=>$action,

            'source'=>
                $hasWebRequest
                    ?'web'
                    :'system',

            'auditable_type'=>
                $model::class,

            'auditable_id'=>
                (string)$model->getKey(),

            'subject_label'=>
                $subjectLabel,

            'description'=>
                $this->description(
                    $action,
                    $subjectLabel
                ),

            'old_values'=>$oldValues,
            'new_values'=>$newValues,

            'actor_name'=>
                $actor?->name,

            'actor_email'=>
                $actor?->email,

            'ip_address'=>
                $hasWebRequest
                    ?$request->ip()
                    :null,

            'request_method'=>
                $hasWebRequest
                    ?$request->method()
                    :null,

            'request_path'=>
                $hasWebRequest
                    ?Str::limit(
                        $request->path(),
                        1000,
                        ''
                    )
                    :null,

            'user_agent'=>
                $hasWebRequest
                    ?Str::limit(
                        (string)$request
                            ->userAgent(),
                        1000,
                        ''
                    )
                    :null,
        ]);
    }

    public function paginate(
        string $tenantId,
        array $filters
    ): array {
        $query=
            $this->filteredQuery(
                $tenantId,
                $filters
            );

        $kpiFilters=$filters;

        unset(
            $kpiFilters['action'],
            $kpiFilters['page'],
            $kpiFilters['per_page']
        );

        $kpiQuery=
            $this->filteredQuery(
                $tenantId,
                $kpiFilters
            );

        $kpis=[
            'total'=>
                (clone $kpiQuery)
                    ->count(),

            'created'=>
                (clone $kpiQuery)
                    ->where(
                        'action',
                        'created'
                    )
                    ->count(),

            'updated'=>
                (clone $kpiQuery)
                    ->where(
                        'action',
                        'updated'
                    )
                    ->count(),

            'deleted'=>
                (clone $kpiQuery)
                    ->where(
                        'action',
                        'deleted'
                    )
                    ->count(),
        ];

        $perPage=
            (int)(
                $filters[
                    'per_page'
                ] ?? 25
            );

        $paginator=
            $query
                ->orderByDesc(
                    'created_at'
                )
                ->paginate(
                    $perPage
                );

        $rows=
            $paginator
                ->getCollection()
                ->map(
                    fn(AuditLog $log)=>
                        $this->summary(
                            $log
                        )
                )
                ->values()
                ->all();

        return [
            'data'=>$rows,

            'kpis'=>$kpis,

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

                'from'=>
                    $paginator
                        ->firstItem(),

                'to'=>
                    $paginator
                        ->lastItem(),
            ],

            'filters'=>[
                'modules'=>
                    collect(
                        self::moduleLabels()
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
                        ->all(),

                'actions'=>
                    collect(
                        self::actionLabels()
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
                        ->all(),

                'sources'=>[
                    [
                        'value'=>'web',
                        'label'=>'Utilizador',
                    ],
                    [
                        'value'=>'system',
                        'label'=>'Sistema',
                    ],
                ],

                'users'=>
                    $this->users(
                        $tenantId
                    ),
            ],
        ];
    }

    public function detail(
        string $tenantId,
        string $id
    ): array {
        $log=
            AuditLog::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereKey(
                    $id
                )
                ->firstOrFail();

        return [
            ...$this->summary(
                $log
            ),

            'old_values'=>
                $log->old_values??
                [],

            'new_values'=>
                $log->new_values??
                [],

            'request'=>[
                'method'=>
                    $log
                        ->request_method,

                'path'=>
                    $log
                        ->request_path,

                'ip'=>
                    $log
                        ->ip_address,

                'user_agent'=>
                    $log
                        ->user_agent,
            ],
        ];
    }

    private function filteredQuery(
        string $tenantId,
        array $filters
    ): Builder {
        $query=
            AuditLog::query()
                ->where(
                    'tenant_id',
                    $tenantId
                );

        if(
            !empty(
                $filters['inicio']
            )
        ){
            $query->where(
                'created_at',
                '>=',
                CarbonImmutable::parse(
                    $filters['inicio']
                )
                    ->startOfDay()
            );
        }

        if(
            !empty(
                $filters['fim']
            )
        ){
            $query->where(
                'created_at',
                '<=',
                CarbonImmutable::parse(
                    $filters['fim']
                )
                    ->endOfDay()
            );
        }

        foreach([
            'module',
            'action',
            'source',
        ] as $field){
            if(
                !empty(
                    $filters[$field]
                )
            ){
                $query->where(
                    $field,
                    $filters[$field]
                );
            }
        }

        if(
            !empty(
                $filters[
                    'user_id'
                ]
            )
        ){
            $query->where(
                'actor_user_id',
                $filters[
                    'user_id'
                ]
            );
        }

        if(
            !empty(
                $filters['search']
            )
        ){
            $search=
                trim(
                    $filters['search']
                );

            $query->where(
                function(
                    Builder $query
                ) use(
                    $search
                ){
                    $like=
                        "%{$search}%";

                    $query
                        ->where(
                            'subject_label',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'description',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'actor_name',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'actor_email',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'auditable_id',
                            'like',
                            $like
                        )
                        ->orWhere(
                            'ip_address',
                            'like',
                            $like
                        );
                }
            );
        }

        return $query;
    }

    private function users(
        string $tenantId
    ): array {
        return AuditLog::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereNotNull(
                'actor_user_id'
            )
            ->orderBy(
                'actor_name'
            )
            ->get([
                'actor_user_id',
                'actor_name',
                'actor_email',
            ])
            ->unique(
                'actor_user_id'
            )
            ->map(
                fn(AuditLog $log)=>[
                    'id'=>
                        $log
                            ->actor_user_id,

                    'name'=>
                        $log
                            ->actor_name,

                    'email'=>
                        $log
                            ->actor_email,
                ]
            )
            ->values()
            ->all();
    }

    private function summary(
        AuditLog $log
    ): array {
        $old=
            $log->old_values??
            [];

        $new=
            $log->new_values??
            [];

        $keys=
            array_unique([
                ...array_keys(
                    $old
                ),
                ...array_keys(
                    $new
                ),
            ]);

        return [
            'id'=>$log->id,

            'module'=>$log
                ->module,

            'module_label'=>
                self::moduleLabels()[
                    $log->module
                ] ??
                $log->module,

            'action'=>$log
                ->action,

            'action_label'=>
                self::actionLabels()[
                    $log->action
                ] ??
                $log->action,

            'source'=>$log
                ->source,

            'subject_type'=>
                class_basename(
                    $log
                        ->auditable_type
                ),

            'subject_id'=>
                $log
                    ->auditable_id,

            'subject_label'=>
                $log
                    ->subject_label,

            'description'=>
                $log
                    ->description,

            'changes_count'=>
                count(
                    $keys
                ),

            'actor'=>
                $log
                    ->actor_user_id
                    ?[
                        'id'=>
                            $log
                                ->actor_user_id,

                        'name'=>
                            $log
                                ->actor_name,

                        'email'=>
                            $log
                                ->actor_email,
                    ]
                    :null,

            'ip_address'=>
                $log
                    ->ip_address,

            'created_at'=>
                $log
                    ->created_at
                    ?->toISOString(),
        ];
    }

    private function moduleFor(
        Model $model
    ): ?string {
        return match(
            $model::class
        ){
            Tenant::class,
            TenantCustomField::class
                =>'configuracoes',

            Empresa::class
                =>'empresas',

            Proprietario::class
                =>'proprietarios',

            Motorista::class
                =>'motoristas',

            Funcionario::class,
            TenantUser::class,
            UserPermission::class,
            UserRole::class
                =>'funcionarios',

            Veiculo::class
                =>'veiculos',

            Aluguer::class
                =>'alugueres',

            Contrato::class,
            ContratoAtivoVeiculo::class
                =>'contratos',

            Declaracao::class
                =>'declaracoes',

            TemplateContrato::class
                =>'templates',

            ChecklistRecord::class
                =>'checklist',

            Multa::class,
            MultaDocumento::class
                =>'multas',

            Sinistro::class,
            SinistroDocumento::class
                =>'sinistros',

            Manutencao::class,
            ManutencaoDocumento::class,
            ManutencaoAprovacao::class,
            ManutencaoGarantia::class,
            ManutencaoPlano::class,
            Fornecedor::class,
            Peca::class,
            Compra::class,
            VeiculoDiagnostico::class
                =>'manutencao',

            RegistoExpediente::class
                =>'expediente',

            ReciboVerde::class
                =>'recibos_verdes',

            RegistoCriminal::class
                =>'registos_criminais',

            default=>null,
        };
    }

    private function tenantIdFor(
        Model $model
    ): ?string {
        if(
            $model instanceof Tenant
        ){
            return (string)
                $model->getKey();
        }

        $attributes=
            $model->getAttributes();

        if(
            !array_key_exists(
                'tenant_id',
                $attributes
            )
        ){
            return null;
        }

        $tenantId=
            $model->getAttribute(
                'tenant_id'
            );

        return $tenantId
            ?(string)$tenantId
            :null;
    }

    private function valuesFor(
        Model $model,
        string $action
    ): array {
        if(
            $action==='created'
        ){
            $keys=
                array_keys(
                    $model
                        ->getAttributes()
                );

            return [
                null,
                $this->attributes(
                    $model,
                    $keys,
                    false
                ),
            ];
        }

        if(
            $action==='deleted'
        ){
            $keys=
                array_keys(
                    $model
                        ->getAttributes()
                );

            return [
                $this->attributes(
                    $model,
                    $keys,
                    true
                ),
                null,
            ];
        }

        $keys=
            array_keys(
                $model
                    ->getChanges()
            );

        $old=[];
        $new=[];

        foreach(
            $keys
            as $key
        ){
            if(
                $this->ignoreField(
                    $key
                )
            ){
                continue;
            }

            $old[$key]=
                $this->sanitize(
                    $key,
                    $model
                        ->getRawOriginal(
                            $key
                        )
                );

            $new[$key]=
                $this->sanitize(
                    $key,
                    $model
                        ->getAttribute(
                            $key
                        )
                );
        }

        return [
            $old?:null,
            $new?:null,
        ];
    }

    private function attributes(
        Model $model,
        array $keys,
        bool $original
    ): ?array {
        $values=[];

        foreach(
            $keys
            as $key
        ){
            if(
                $this->ignoreField(
                    $key
                )
            ){
                continue;
            }

            $value=
                $original
                    ?$model
                        ->getRawOriginal(
                            $key
                        )
                    :$model
                        ->getAttribute(
                            $key
                        );

            $values[$key]=
                $this->sanitize(
                    $key,
                    $value
                );
        }

        return $values?:null;
    }

    private function ignoreField(
        string $field
    ): bool {
        return in_array(
            $field,
            self::IGNORED_FIELDS,
            true
        );
    }

    private function sanitize(
        string $key,
        mixed $value,
        int $depth=0
    ): mixed {
        $lower=
            Str::lower(
                $key
            );

        foreach(
            self::SENSITIVE_FRAGMENTS
            as $fragment
        ){
            if(
                str_contains(
                    $lower,
                    $fragment
                )
            ){
                return '[PROTEGIDO]';
            }
        }

        if(
            $depth>=5
        ){
            return '[LIMITE]';
        }

        if(
            $value===null ||
            is_bool($value) ||
            is_int($value) ||
            is_float($value)
        ){
            return $value;
        }

        if(
            $value instanceof DateTimeInterface
        ){
            return $value->format(
                DATE_ATOM
            );
        }

        if(
            $value instanceof BackedEnum
        ){
            return $value->value;
        }

        if(
            $value instanceof UnitEnum
        ){
            return $value->name;
        }

        if(
            $value instanceof Collection
        ){
            $value=
                $value->all();
        }

        if(
            $value instanceof JsonSerializable
        ){
            $value=
                $value->jsonSerialize();
        }

        if(
            is_array(
                $value
            )
        ){
            $result=[];

            foreach(
                array_slice(
                    $value,
                    0,
                    50,
                    true
                )
                as $nestedKey=>$nestedValue
            ){
                $result[
                    (string)$nestedKey
                ]=$this->sanitize(
                    (string)$nestedKey,
                    $nestedValue,
                    $depth+1
                );
            }

            if(
                count($value)>50
            ){
                $result[
                    '__truncated'
                ]=true;
            }

            return $result;
        }

        if(
            $value instanceof Stringable
        ){
            $value=
                (string)$value;
        }

        if(
            is_string(
                $value
            )
        ){
            $trimmed=
                ltrim(
                    $value
                );

            if(
                str_starts_with(
                    $trimmed,
                    '{'
                ) ||
                str_starts_with(
                    $trimmed,
                    '['
                )
            ){
                $decoded=
                    json_decode(
                        $value,
                        true
                    );

                if(
                    json_last_error()===
                    JSON_ERROR_NONE
                ){
                    return $this->sanitize(
                        $key,
                        $decoded,
                        $depth+1
                    );
                }
            }

            return Str::limit(
                $value,
                2000,
                '…'
            );
        }

        if(
            is_scalar(
                $value
            )
        ){
            return $value;
        }

        return sprintf(
            '[%s]',
            get_debug_type(
                $value
            )
        );
    }

    private function subjectLabel(
        Model $model
    ): string {
        foreach([
            'matricula',
            'nome_empresa',
            'nome_completo',
            'nome',
            'titulo',
            'assunto',
            'numero_contrato',
            'numero_processo',
            'numero_auto',
            'referencia',
            'nome_original',
            'codigo',
            'nif',
            'email',
        ] as $field){
            $value=
                $model->getAttribute(
                    $field
                );

            if(
                is_scalar(
                    $value
                ) &&
                trim(
                    (string)$value
                )!==''
            ){
                return Str::limit(
                    (string)$value,
                    180,
                    '…'
                );
            }
        }

        return sprintf(
            '%s %s',
            class_basename(
                $model
            ),
            Str::limit(
                (string)$model->getKey(),
                12,
                ''
            )
        );
    }

    private function description(
        string $action,
        string $subject
    ): string {
        $verb=
            match(
                $action
            ){
                'created'=>'Criou',
                'updated'=>'Atualizou',
                'deleted'=>'Eliminou',
                default=>'Alterou',
            };

        return "{$verb} {$subject}";
    }

    private function tableReady(): bool
    {
        if(
            self::$tableReady!==null
        ){
            return self::$tableReady;
        }

        return self::$tableReady=
            Schema::hasTable(
                'audit_logs'
            );
    }
}
