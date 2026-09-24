<?php

namespace App\Services;

use App\Models\Manutencao;
use App\Models\ManutencaoGarantia;
use App\Models\ManutencaoItem;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Access\AuthorizationException;

class ManutencaoGarantiaService
{

    public function __construct(
        private PermissionService $permissionService
    ) {}


    public function criarParaItem(


        Manutencao $manutencao,
        ManutencaoItem $item,
        User $actor,
        string $tenantId
    ): ?ManutencaoGarantia {

        $this->assertCanConfigure(
            $actor,
            $tenantId
        );
        if (
            !$item->garantia_meses &&
            !$item->garantia_km
        ) {
            return null;
        }

        return DB::transaction(function () use (
            $manutencao,
            $item,
            $actor,
            $tenantId
        ) {
            $existente = ManutencaoGarantia::query()
                ->where('tenant_id', $tenantId)
                ->where(
                    'manutencao_item_id',
                    $item->id
                )
                ->first();

            if ($existente) {
                return $existente;
            }

            $inicio = $manutencao->data_conclusao
                ? CarbonImmutable::parse(
                    $manutencao->data_conclusao
                )
                : now()->toImmutable();

            $garantia =
                new ManutencaoGarantia([
                    'manutencao_item_id' =>
                    $item->id,
                    'peca_id' => $item->peca_id,
                    'fornecedor_id' =>
                    $manutencao->fornecedor_id,
                    'descricao' =>
                    'Garantia - ' . $item->descricao,
                    'data_inicio' =>
                    $inicio->toDateString(),
                    'data_fim' =>
                    $item->garantia_meses
                        ? $inicio
                        ->addMonthsNoOverflow(
                            (int)$item
                                ->garantia_meses
                        )
                        ->toDateString()
                        : null,
                    'km_limite' =>
                    $item->garantia_km &&
                        $manutencao->km !== null
                        ? (int)$manutencao->km +
                        (int)$item
                            ->garantia_km
                        : null,
                    'status' => 'ativa',
                ]);

            $garantia->tenant_id = $tenantId;

            $garantia->manutencao_id =
                $manutencao->id;

            $garantia->created_by =
                $actor->id;

            $garantia->updated_by =
                $actor->id;

            $garantia->save();

            return $garantia;
        });
    }

    public function garantiasAtivasParaPeca(
        string $pecaId,
        string $tenantId,
        ?int $kmAtual = null
    ) {
        $garantias = ManutencaoGarantia::query()
            ->where('tenant_id', $tenantId)
            ->where('peca_id', $pecaId)
            ->where('status', 'ativa')
            ->with([
                'manutencao:id,veiculo_id,numero_ordem,km,data_conclusao',
                'fornecedor:id,nome',
            ])
            ->get();

        foreach ($garantias as $garantia) {
            if ($this->estaExpirada(
                $garantia,
                $kmAtual
            )) {
                $garantia->status = 'expirada';
                $garantia->updated_at = now();
                $garantia->save();
            }
        }

        return $garantias
            ->where('status', 'ativa')
            ->values();
    }

    public function utilizar(
        string $id,
        User $actor,
        string $tenantId,
        ?string $observacoes = null
    ): ManutencaoGarantia {

        $this->assertCanConfigure(
            $actor,
            $tenantId
        );
        return DB::transaction(function () use (
            $id,
            $actor,
            $tenantId,
            $observacoes
        ) {
            $garantia = ManutencaoGarantia::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($garantia->status !== 'ativa') {
                throw ValidationException::withMessages([
                    'garantia' =>
                    'A garantia não está ativa.',
                ]);
            }

            $garantia->status = 'utilizada';
            $garantia->utilizada_em = now();

            if (!blank($observacoes)) {
                $garantia->observacoes =
                    trim($observacoes);
            }

            $garantia->updated_by = $actor->id;
            $garantia->save();

            return $garantia;
        });
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
            throw new AuthorizationException(
                'Sem permissão para configurar manutenção.'
            );
        }
    }

    private function estaExpirada(
        ManutencaoGarantia $garantia,
        ?int $kmAtual
    ): bool {
        if (
            $garantia->data_fim &&
            CarbonImmutable::parse(
                $garantia->data_fim
            )->endOfDay()->lt(now())
        ) {
            return true;
        }

        return
            $garantia->km_limite !== null &&
            $kmAtual !== null &&
            $kmAtual > $garantia->km_limite;
    }
}
