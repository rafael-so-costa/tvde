<?php

namespace App\Services;

use App\Models\TipoContrato;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TipoContratoService
{
    public function __construct(
        private TipoContratoReadinessService $readiness
    ) {}

    public function create(
        array $data,
        string $tenantId,
        User $actor
    ): TipoContrato {
        return DB::transaction(function() use(
            $data,
            $tenantId,
            $actor
        ){
            $tipo=new TipoContrato($data);

            $tipo->tenant_id=$tenantId;
            $tipo->created_by=$actor->id;
            $tipo->updated_by=$actor->id;

            $this->readiness->assertCanActivate($tipo);

            $tipo->save();

            return $this->load($tipo);
        });
    }

    public function update(
        string $id,
        array $data,
        string $tenantId,
        User $actor
    ): TipoContrato {
        return DB::transaction(function() use(
            $id,
            $data,
            $tenantId,
            $actor
        ){
            $tipo=TipoContrato::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $tipo->fill($data);
            $tipo->updated_by=$actor->id;

            $this->readiness->assertCanActivate($tipo);

            $tipo->save();

            return $this->load($tipo);
        });
    }

    public function archive(
        string $id,
        string $tenantId,
        User $actor
    ): TipoContrato {
        return DB::transaction(function() use(
            $id,
            $tenantId,
            $actor
        ){
            $tipo=TipoContrato::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if(!$tipo->ativo){
                throw ValidationException::withMessages([
                    'tipo_contrato'=>'Este tipo de contrato já está inativo.',
                ]);
            }

            $tipo->ativo=false;
            $tipo->mostrar_menu=false;
            $tipo->updated_by=$actor->id;
            $tipo->save();

            return $this->load($tipo);
        });
    }

    private function load(
        TipoContrato $tipo
    ): TipoContrato {
        return $tipo->load([
            'template:id,tenant_id,nome,tipo_arquivo,ativo',
            'checklistProcessTemplate.items',
            'criador:id,name',
            'atualizador:id,name',
        ]);
    }
}
