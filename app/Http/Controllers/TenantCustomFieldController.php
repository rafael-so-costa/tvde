<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTenantCustomFieldRequest;
use App\Http\Requests\UpdateTenantCustomFieldRequest;
use App\Models\TenantCustomField;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TenantCustomFieldController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ){}

    public function index(): JsonResponse
    {
        $fields=
            TenantCustomField::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->orderBy('entity')
                ->orderBy('sort_order')
                ->orderBy('label')
                ->get();

        return response()->json([
            'data'=>$fields,

            'options'=>[
                'entities'=>[
                    'empresa'=>'Empresas',
                    'proprietario'=>'Proprietários',
                    'motorista'=>'Motoristas',
                    'veiculo'=>'Veículos',
                ],

                'types'=>[
                    'text'=>'Texto',
                    'textarea'=>'Texto longo',
                    'number'=>'Número',
                    'date'=>'Data',
                    'boolean'=>'Sim/Não',
                    'select'=>'Lista de opções',
                ],
            ],
        ]);
    }

    public function store(
        StoreTenantCustomFieldRequest $request
    ): JsonResponse {
        $tenantId=$this->tenantId();
        $data=$request->validated();

        $data['key']=$this->key(
            $data['key'] ??
            $data['label']
        );

        $this->assertUnique(
            $tenantId,
            $data['entity'],
            $data['key']
        );

        $this->assertValidOptions(
            $data['type'],
            $data['options'] ?? null
        );

        $count=
            TenantCustomField::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->count();

        if($count>=200){
            throw ValidationException::withMessages([
                'label'=>
                    'A frota atingiu o limite de 200 campos personalizados.',
            ]);
        }

        $field=
            TenantCustomField::create([
                'tenant_id'=>$tenantId,
                'entity'=>$data['entity'],
                'key'=>$data['key'],
                'label'=>$data['label'],
                'type'=>$data['type'],
                'required'=>$data['required'] ?? false,
                'active'=>$data['active'] ?? true,
                'options'=>$this->options(
                    $data['type'],
                    $data['options'] ?? null
                ),
                'placeholder'=>$data['placeholder'] ?? null,
                'help_text'=>$data['help_text'] ?? null,
                'default_value'=>$data['default_value'] ?? null,
                'sort_order'=>$data['sort_order'] ?? 0,
            ]);

        return response()->json([
            'message'=>
                'Campo personalizado criado.',
            'data'=>$field,
        ],201);
    }

    public function update(
        UpdateTenantCustomFieldRequest $request,
        string $id
    ): JsonResponse {
        $field=$this->field($id);
        $data=$request->validated();

        $entity=
            $data['entity'] ??
            $field->entity;

        $key=array_key_exists(
            'key',
            $data
        )
            ?$this->key(
                $data['key'] ??
                $field->label
            )
            :$field->key;

        $type=
            $data['type'] ??
            $field->type;

        $options=array_key_exists(
            'options',
            $data
        )
            ?$data['options']
            :$field->options;

        $this->assertUnique(
            $field->tenant_id,
            $entity,
            $key,
            $field->id
        );

        $this->assertValidOptions(
            $type,
            $options
        );

        $data['entity']=$entity;
        $data['key']=$key;
        $data['type']=$type;
        $data['options']=$this->options(
            $type,
            $options
        );

        $field->update($data);

        return response()->json([
            'message'=>
                'Campo personalizado atualizado.',
            'data'=>$field->fresh(),
        ]);
    }

    public function destroy(
        string $id
    ): JsonResponse {
        $field=$this->field($id);
        $field->delete();

        return response()->json([
            'message'=>
                'Campo personalizado removido.',
        ]);
    }

    private function field(
        string $id
    ): TenantCustomField {
        return TenantCustomField::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->whereKey($id)
            ->firstOrFail();
    }

    private function tenantId(): string
    {
        return $this
            ->tenantContext
            ->requireId();
    }

    private function key(
        string $value
    ): string {
        $key=Str::of($value)
            ->ascii()
            ->lower()
            ->replaceMatches(
                '/[^a-z0-9]+/',
                '_'
            )
            ->trim('_')
            ->substr(0,80)
            ->toString();

        if($key===''){
            throw ValidationException::withMessages([
                'key'=>
                    'Não foi possível gerar uma chave válida para o campo.',
            ]);
        }

        return $key;
    }

    private function assertUnique(
        string $tenantId,
        string $entity,
        string $key,
        ?string $ignoreId=null
    ): void {
        $query=
            TenantCustomField::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'entity',
                    $entity
                )
                ->where(
                    'key',
                    $key
                );

        if($ignoreId){
            $query->where(
                'id',
                '!=',
                $ignoreId
            );
        }

        if($query->exists()){
            throw ValidationException::withMessages([
                'key'=>
                    'Já existe um campo com esta chave para esta entidade.',
            ]);
        }
    }

    private function assertValidOptions(
        string $type,
        ?array $options
    ): void {
        if(
            $type==='select' &&
            empty($options)
        ){
            throw ValidationException::withMessages([
                'options'=>
                    'Informe pelo menos uma opção para campos do tipo lista.',
            ]);
        }
    }

    private function options(
        string $type,
        ?array $options
    ): ?array {
        if($type!=='select'){
            return null;
        }

        return collect($options ?? [])
            ->map(
                fn($value)=>
                    trim((string)$value)
            )
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
