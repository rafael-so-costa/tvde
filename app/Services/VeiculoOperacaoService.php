<?php

namespace App\Services;

use App\Models\Manutencao;
use App\Models\Veiculo;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VeiculoOperacaoService
{
    private const ORIGENS_KM=[
        'manual',
        'checklist',
        'manutencao',
        'telemetria',
        'obd',
        'tesla',
        'geotab',
    ];

    public function atualizarKmSeMaior(
        string $veiculoId,
        ?int $km,
        string $tenantId,
        string $origem
    ): Veiculo {
        if(!in_array($origem,self::ORIGENS_KM,true)){
            throw ValidationException::withMessages([
                'km_origem'=>'Origem da quilometragem inválida.',
            ]);
        }

        return DB::transaction(function() use(
            $veiculoId,
            $km,
            $tenantId,
            $origem
        ){
            $veiculo=Veiculo::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($veiculoId)
                ->lockForUpdate()
                ->firstOrFail();

            if($km===null){
                return $veiculo;
            }

            if($km<0){
                throw ValidationException::withMessages([
                    'km'=>'A quilometragem não pode ser negativa.',
                ]);
            }

            if(
                $veiculo->km_atual===null ||
                $km>$veiculo->km_atual
            ){
                $veiculo->km_atual=$km;
                $veiculo->km_atualizado_em=now();
                $veiculo->km_origem=$origem;
                $veiculo->save();
            }

            return $veiculo->refresh();
        });
    }

    public function indisponibilizarPorManutencao(
        string $veiculoId,
        string $tenantId,
        ?string $motivo=null
    ): Veiculo {
        return DB::transaction(function() use(
            $veiculoId,
            $tenantId,
            $motivo
        ){
            $veiculo=Veiculo::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($veiculoId)
                ->lockForUpdate()
                ->firstOrFail();

            /*
             * Uma indisponibilidade manual é mais forte
             * que a indisponibilidade derivada de manutenção.
             */
            if($veiculo->disponibilidade==='indisponivel'){
                return $veiculo;
            }

            $veiculo->disponibilidade='manutencao';

            $veiculo->indisponibilidade_motivo=
                blank($motivo)
                    ? 'Veículo em manutenção.'
                    : trim($motivo);

            $veiculo->save();

            return $veiculo->refresh();
        });
    }

    public function recalcularDisponibilidade(
        string $veiculoId,
        string $tenantId
    ): Veiculo {
        return DB::transaction(function() use(
            $veiculoId,
            $tenantId
        ){
            $veiculo=Veiculo::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($veiculoId)
                ->lockForUpdate()
                ->firstOrFail();

            /*
             * Não alteramos uma indisponibilidade manual.
             */
            if($veiculo->disponibilidade==='indisponivel'){
                return $veiculo;
            }

            $temManutencaoAtiva=Manutencao::query()
                ->where('tenant_id',$tenantId)
                ->where('veiculo_id',$veiculo->id)
                ->where('indisponibiliza_veiculo',true)
                ->whereIn('status',[
                    'em_andamento',
                    'aguardando_pecas',
                ])
                ->exists();

            if($temManutencaoAtiva){
                $veiculo->disponibilidade='manutencao';
                $veiculo->indisponibilidade_motivo=
                    'Veículo em manutenção.';
            }else{
                $veiculo->disponibilidade='disponivel';
                $veiculo->indisponibilidade_motivo=null;
            }

            $veiculo->save();

            return $veiculo->refresh();
        });
    }

    public function indisponibilizarManual(
        string $veiculoId,
        string $tenantId,
        string $motivo
    ): Veiculo {
        if(blank($motivo)){
            throw ValidationException::withMessages([
                'motivo'=>
                    'Informe o motivo da indisponibilidade.',
            ]);
        }

        return DB::transaction(function() use(
            $veiculoId,
            $tenantId,
            $motivo
        ){
            $veiculo=Veiculo::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($veiculoId)
                ->lockForUpdate()
                ->firstOrFail();

            $veiculo->disponibilidade='indisponivel';
            $veiculo->indisponibilidade_motivo=
                trim($motivo);

            $veiculo->save();

            return $veiculo->refresh();
        });
    }

    public function disponibilizarManual(
        string $veiculoId,
        string $tenantId
    ): Veiculo {
        $veiculo=Veiculo::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($veiculoId);

        /*
         * Remove primeiro a indisponibilidade manual.
         * Depois verifica se existe manutenção que ainda
         * exige indisponibilidade.
         */
        DB::transaction(function() use($veiculo,$tenantId){
            $locked=Veiculo::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($veiculo->id)
                ->lockForUpdate()
                ->firstOrFail();

            $locked->disponibilidade='disponivel';
            $locked->indisponibilidade_motivo=null;
            $locked->save();
        });

        return $this->recalcularDisponibilidade(
            $veiculo->id,
            $tenantId
        );
    }
}
