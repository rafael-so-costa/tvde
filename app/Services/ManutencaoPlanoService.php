<?php

namespace App\Services;

use App\Models\Manutencao;
use App\Models\ManutencaoPlano;
use App\Models\ManutencaoPlanoVeiculo;
use App\Models\User;
use App\Models\Veiculo;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManutencaoPlanoService
{
    public function __construct(
        private PermissionService $permissionService
    ){}

    public function create(
        array $data,
        User $actor,
        string $tenantId
    ): ManutencaoPlano {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $this->assertIntervalo($data);

        return DB::transaction(function() use(
            $data,
            $actor,
            $tenantId
        ){
            $plano=new ManutencaoPlano([
                'nome'=>trim($data['nome']),
                'tipo_servico'=>trim(
                    $data['tipo_servico']
                ),
                'descricao'=>$this->nullableTrim(
                    $data['descricao'] ?? null
                ),
                'intervalo_km'=>
                    $data['intervalo_km'] ?? null,
                'intervalo_meses'=>
                    $data['intervalo_meses'] ?? null,
                'alerta_antecedencia_km'=>
                    $data['alerta_antecedencia_km'] ?? 0,
                'alerta_antecedencia_dias'=>
                    $data['alerta_antecedencia_dias'] ?? 0,
                'ativo'=>$data['ativo'] ?? true,
            ]);

            $plano->tenant_id=$tenantId;
            $plano->created_by=$actor->id;
            $plano->updated_by=$actor->id;
            $plano->save();

            return $plano;
        });
    }

    public function update(
        string $id,
        array $data,
        User $actor,
        string $tenantId
    ): ManutencaoPlano {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $id,
            $data,
            $actor,
            $tenantId
        ){
            $plano=ManutencaoPlano::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $efetivo=[
                'intervalo_km'=>
                    array_key_exists(
                        'intervalo_km',
                        $data
                    )
                        ? $data['intervalo_km']
                        : $plano->intervalo_km,
                'intervalo_meses'=>
                    array_key_exists(
                        'intervalo_meses',
                        $data
                    )
                        ? $data['intervalo_meses']
                        : $plano->intervalo_meses,
            ];

            $this->assertIntervalo(
                $efetivo
            );

            foreach([
                'nome',
                'tipo_servico',
                'descricao',
                'intervalo_km',
                'intervalo_meses',
                'alerta_antecedencia_km',
                'alerta_antecedencia_dias',
                'ativo',
            ] as $field){
                if(!array_key_exists(
                    $field,
                    $data
                )){
                    continue;
                }

                if($field==='ativo'){
                    $plano->{$field}=
                        (bool)$data[$field];

                    continue;
                }

                if(in_array(
                    $field,
                    [
                        'nome',
                        'tipo_servico',
                    ],
                    true
                )){
                    $plano->{$field}=
                        trim($data[$field]);

                    continue;
                }

                if($field==='descricao'){
                    $plano->{$field}=
                        $this->nullableTrim(
                            $data[$field]
                        );

                    continue;
                }

                $plano->{$field}=
                    $data[$field];
            }

            $plano->updated_by=$actor->id;
            $plano->save();

            /*
             * Se o intervalo mudou, recalculamos todos
             * os veículos associados.
             */
            foreach(
                $plano->veiculos()
                    ->lockForUpdate()
                    ->get()
                as $vinculo
            ){
                $this->calcularProxima(
                    $plano,
                    $vinculo
                );

                $vinculo->updated_by=
                    $actor->id;

                $vinculo->save();
            }

            return $plano->load(
                'veiculos.veiculo:id,matricula,marca,modelo,km_atual'
            );
        });
    }

    public function associarVeiculo(
        string $planoId,
        string $veiculoId,
        array $data,
        User $actor,
        string $tenantId
    ): ManutencaoPlanoVeiculo {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $planoId,
            $veiculoId,
            $data,
            $actor,
            $tenantId
        ){
            $plano=$this->resolvePlano(
                $planoId,
                $tenantId
            );

            $veiculo=$this->resolveVeiculo(
                $veiculoId,
                $tenantId
            );

            $vinculo=ManutencaoPlanoVeiculo::query()
                ->where('tenant_id',$tenantId)
                ->where('plano_id',$plano->id)
                ->where('veiculo_id',$veiculo->id)
                ->lockForUpdate()
                ->first();

            if(!$vinculo){
                $vinculo=
                    new ManutencaoPlanoVeiculo([
                        'plano_id'=>$plano->id,
                        'veiculo_id'=>$veiculo->id,
                    ]);

                $vinculo->tenant_id=$tenantId;
                $vinculo->created_by=$actor->id;
            }

            $vinculo->ultimo_km=
                array_key_exists(
                    'ultimo_km',
                    $data
                )
                    ? $data['ultimo_km']
                    : (
                        $vinculo->ultimo_km
                        ?? $veiculo->km_atual
                    );

            $vinculo->ultima_data=
                array_key_exists(
                    'ultima_data',
                    $data
                )
                    ? $data['ultima_data']
                    : $vinculo->ultima_data;

            $vinculo->ativo=
                $data['ativo'] ?? true;

            $this->calcularProxima(
                $plano,
                $vinculo
            );

            $vinculo->updated_by=$actor->id;
            $vinculo->save();

            return $vinculo->load([
                'plano',
                'veiculo:id,matricula,marca,modelo,km_atual',
            ]);
        });
    }

    public function sincronizarConclusao(
        Manutencao $manutencao,
        User $actor,
        string $tenantId
    ): ?ManutencaoPlanoVeiculo {
        if(!$manutencao->plano_id){
            return null;
        }

        return DB::transaction(function() use(
            $manutencao,
            $actor,
            $tenantId
        ){
            $plano=$this->resolvePlano(
                $manutencao->plano_id,
                $tenantId
            );

            $vinculo=ManutencaoPlanoVeiculo::query()
                ->where('tenant_id',$tenantId)
                ->where('plano_id',$plano->id)
                ->where(
                    'veiculo_id',
                    $manutencao->veiculo_id
                )
                ->lockForUpdate()
                ->first();

            if(!$vinculo){
                $vinculo=
                    new ManutencaoPlanoVeiculo([
                        'plano_id'=>$plano->id,
                        'veiculo_id'=>
                            $manutencao->veiculo_id,
                    ]);

                $vinculo->tenant_id=$tenantId;
                $vinculo->created_by=$actor->id;
            }

            if($manutencao->km!==null){
                $vinculo->ultimo_km=
                    $manutencao->km;
            }

            $vinculo->ultima_data=
                $manutencao->data_conclusao
                    ? $manutencao
                        ->data_conclusao
                        ->toDateString()
                    : now()->toDateString();

            $vinculo->ativo=true;

            $this->calcularProxima(
                $plano,
                $vinculo
            );

            $vinculo->updated_by=$actor->id;
            $vinculo->save();

            /*
             * Mantemos também o snapshot diretamente
             * na ordem concluída.
             */
            $manutencao->proxima_revisao_km=
                $vinculo->proximo_km;

            $manutencao->proxima_revisao_data=
                $vinculo->proxima_data;

            $manutencao->save();

            return $vinculo;
        });
    }

    public function situacao(
        ManutencaoPlanoVeiculo $vinculo,
        ?int $kmAtual=null
    ): string {
        $plano=$vinculo->relationLoaded('plano')
            ? $vinculo->plano
            : $vinculo->plano()->first();

        if(!$plano || !$vinculo->ativo){
            return 'inativo';
        }

        $vencidoKm=
            $vinculo->proximo_km!==null &&
            $kmAtual!==null &&
            $kmAtual >= $vinculo->proximo_km;

        $vencidoData=
            $vinculo->proxima_data!==null &&
            CarbonImmutable::parse(
                $vinculo->proxima_data
            )->startOfDay()->lte(
                today()
            );

        if($vencidoKm || $vencidoData){
            return 'vencida';
        }

        $proximoKm=
            $vinculo->proximo_km!==null &&
            $kmAtual!==null &&
            $kmAtual+
                (int)$plano->alerta_antecedencia_km
                >=
                $vinculo->proximo_km;

        $proximaData=
            $vinculo->proxima_data!==null &&
            CarbonImmutable::parse(
                $vinculo->proxima_data
            )->startOfDay()->lte(
                today()->addDays(
                    (int)$plano
                        ->alerta_antecedencia_dias
                )
            );

        return ($proximoKm || $proximaData)
            ? 'proxima'
            : 'ok';
    }

    public function delete(
        string $id,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $plano=$this->resolvePlano(
            $id,
            $tenantId
        );

        if($plano->manutencoes()->exists()){
            throw ValidationException::withMessages([
                'plano'=>
                    'O plano já possui histórico de manutenção. Desative-o em vez de eliminá-lo.',
            ]);
        }

        $plano->delete();
    }

    private function calcularProxima(
        ManutencaoPlano $plano,
        ManutencaoPlanoVeiculo $vinculo
    ): void {
        $vinculo->proximo_km=
            $plano->intervalo_km!==null &&
            $vinculo->ultimo_km!==null
                ? (int)$vinculo->ultimo_km+
                    (int)$plano->intervalo_km
                : null;

        $vinculo->proxima_data=
            $plano->intervalo_meses!==null &&
            $vinculo->ultima_data!==null
                ? CarbonImmutable::parse(
                    $vinculo->ultima_data
                )
                    ->addMonthsNoOverflow(
                        (int)$plano->intervalo_meses
                    )
                    ->toDateString()
                : null;
    }

    private function assertIntervalo(
        array $data
    ): void {
        $km=$data['intervalo_km']
            ?? null;

        $meses=$data['intervalo_meses']
            ?? null;

        if(
            ($km===null || (int)$km<=0) &&
            ($meses===null || (int)$meses<=0)
        ){
            throw ValidationException::withMessages([
                'intervalo_km'=>
                    'Informe pelo menos um intervalo válido por quilometragem ou por meses.',
            ]);
        }
    }

    private function resolvePlano(
        string $id,
        string $tenantId
    ): ManutencaoPlano {
        $plano=ManutencaoPlano::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$plano){
            throw ValidationException::withMessages([
                'plano_id'=>
                    'O plano selecionado não pertence a esta organização.',
            ]);
        }

        return $plano;
    }

    private function resolveVeiculo(
        string $id,
        string $tenantId
    ): Veiculo {
        $veiculo=Veiculo::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$veiculo){
            throw ValidationException::withMessages([
                'veiculo_id'=>
                    'O veículo selecionado não pertence a esta organização.',
            ]);
        }

        return $veiculo;
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if(!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )){
            abort(
                403,
                'Sem permissão suficiente para gerir planos de manutenção.'
            );
        }
    }
}
