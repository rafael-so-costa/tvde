<?php

namespace App\Services;

use App\Models\Manutencao;
use App\Models\User;
use App\Models\Veiculo;
use App\Models\VeiculoDiagnostico;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Access\AuthorizationException;

class VeiculoDiagnosticoService
{
    public function __construct(
        private PermissionService $permissionService
    ) {}

    public function create(
        array $data,
        User $actor,
        string $tenantId
    ): VeiculoDiagnostico {
        if (!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )) {
            throw new AuthorizationException(
                'Sem permissão para configurar manutenção.'
            );
        }

        $veiculo = Veiculo::query()
            ->where('tenant_id', $tenantId)
            ->find($data['veiculo_id']);

        if (!$veiculo) {
            throw ValidationException::withMessages([
                'veiculo_id' =>
                'O veículo selecionado não pertence a esta organização.',
            ]);
        }

        $diagnostico = new VeiculoDiagnostico($data);

        $diagnostico->tenant_id = $tenantId;
        $diagnostico->created_by = $actor->id;
        $diagnostico->updated_by = $actor->id;
        $diagnostico->save();

        return $diagnostico;
    }

    /*
     * Entrada preparada para futuras integrações.
     * Não depende de User porque o autenticador da
     * integração será tratado na camada HTTP.
     */
    public function ingest(
        array $data,
        string $tenantId
    ): VeiculoDiagnostico {
        $veiculo = $this->resolveVeiculo(
            $data['veiculo_id'],
            $tenantId
        );

        return DB::transaction(function () use (
            $data,
            $tenantId,
            $veiculo
        ) {
            if (
                !blank(
                    $data['external_id']
                        ?? null
                )
            ) {
                $existente =
                    VeiculoDiagnostico::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'fonte',
                        $data['fonte']
                    )
                    ->where(
                        'external_id',
                        $data['external_id']
                    )
                    ->first();

                if ($existente) {
                    return $existente;
                }
            }

            $diagnostico =
                new VeiculoDiagnostico([
                    'veiculo_id' => $veiculo->id,
                    'fonte' => $data['fonte'],
                    'external_id' =>
                    $this->nullableTrim(
                        $data['external_id']
                            ?? null
                    ),
                    'codigo_dtc' =>
                    $this->nullableTrim(
                        $data['codigo_dtc']
                            ?? null
                    ),
                    'severidade' =>
                    $data['severidade']
                        ?? 'info',
                    'titulo' => trim(
                        $data['titulo']
                    ),
                    'descricao' =>
                    $this->nullableTrim(
                        $data['descricao']
                            ?? null
                    ),
                    'dados_brutos' =>
                    $data['dados_brutos']
                        ?? null,
                    'detectado_em' =>
                    $data['detectado_em']
                        ?? now(),
                ]);

            $diagnostico->tenant_id =
                $tenantId;

            $diagnostico->status = 'aberto';
            $diagnostico->created_by = null;
            $diagnostico->save();

            return $this->load(
                $diagnostico
            );
        });
    }

    public function vincularManutencao(
        string $diagnosticoId,
        Manutencao $manutencao,
        string $tenantId
    ): VeiculoDiagnostico {
        return DB::transaction(function () use (
            $diagnosticoId,
            $manutencao,
            $tenantId
        ) {
            $diagnostico =
                VeiculoDiagnostico::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereKey(
                    $diagnosticoId
                )
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $diagnostico->veiculo_id !==
                $manutencao->veiculo_id
            ) {
                throw ValidationException::withMessages([
                    'diagnostico' =>
                    'O diagnóstico pertence a outro veículo.',
                ]);
            }

            $diagnostico->manutencao_id =
                $manutencao->id;

            $diagnostico->gerou_manutencao_em =
                now();

            $diagnostico->save();

            return $this->load(
                $diagnostico
            );
        });
    }

    public function resolver(
    string $id,
    User $actor,
    string $tenantId
): VeiculoDiagnostico {
    $this->assertCanConfigure(
        $actor,
        $tenantId
    );

    return DB::transaction(function() use(
        $id,
        $actor,
        $tenantId
    ){
        $diagnostico=VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereKey($id)
            ->lockForUpdate()
            ->firstOrFail();

        if($diagnostico->status==='resolvido'){
            return $this->load(
                $diagnostico
            );
        }

        if($diagnostico->status==='ignorado'){
            throw ValidationException::withMessages([
                'status'=>
                    'Um diagnóstico ignorado não pode ser marcado como resolvido.',
            ]);
        }

        $diagnostico->status='resolvido';
        $diagnostico->resolvido_em=now();
        $diagnostico->updated_by=$actor->id;
        $diagnostico->save();

        return $this->load(
            $diagnostico
        );
    });
}

public function ignorar(
    string $id,
    User $actor,
    string $tenantId
): VeiculoDiagnostico {
    $this->assertCanConfigure(
        $actor,
        $tenantId
    );

    return DB::transaction(function() use(
        $id,
        $actor,
        $tenantId
    ){
        $diagnostico=VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereKey($id)
            ->lockForUpdate()
            ->firstOrFail();

        if($diagnostico->status==='ignorado'){
            return $this->load(
                $diagnostico
            );
        }

        if($diagnostico->status==='resolvido'){
            throw ValidationException::withMessages([
                'status'=>
                    'Um diagnóstico resolvido não pode ser marcado como ignorado.',
            ]);
        }

        $diagnostico->status='ignorado';
        $diagnostico->resolvido_em=null;
        $diagnostico->updated_by=$actor->id;
        $diagnostico->save();

        return $this->load(
            $diagnostico
        );
    });
}

    public function resolverDaManutencao(
        string $manutencaoId,
        string $tenantId
    ): void {
        VeiculoDiagnostico::query()
            ->where('tenant_id', $tenantId)
            ->where(
                'manutencao_id',
                $manutencaoId
            )
            ->where('status', 'aberto')
            ->update([
                'status' => 'resolvido',
                'resolvido_em' => now(),
                'updated_at' => now(),
            ]);
    }

    private function resolveVeiculo(
        string $id,
        string $tenantId
    ): Veiculo {
        $veiculo = Veiculo::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$veiculo) {
            throw ValidationException::withMessages([
                'veiculo_id' =>
                'O veículo selecionado não pertence a esta organização.',
            ]);
        }

        return $veiculo;
    }

    private function load(
        VeiculoDiagnostico $diagnostico
    ): VeiculoDiagnostico {
        return $diagnostico->load([
            'veiculo:id,matricula,marca,modelo,km_atual,disponibilidade',
            'manutencao:id,numero_ordem,status',
            'createdBy:id,name',
        ]);
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
        if (!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )) {
            abort(
                403,
                'Sem permissão suficiente para gerir diagnósticos.'
            );
        }
    }
}
