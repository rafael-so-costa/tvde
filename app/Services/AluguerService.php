<?php

namespace App\Services;

use App\Models\Aluguer;
use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class AluguerService
{

    public function __construct(
        private ChecklistProcessService $checklistProcessService
    ) {}
    public function activate(
        string $id,
        string $tenantId,
        array $data
    ): Aluguer {
        return DB::transaction(
            function () use (
                $id,
                $tenantId,
                $data
            ) {
                $aluguer = $this->findLocked(
                    $id,
                    $tenantId
                );

                if ($aluguer->status !== 'rascunho') {
                    throw ValidationException::withMessages([
                        'status' =>
                        'Apenas alugueres em rascunho podem ser ativados.',
                    ]);
                }

                $aluguer->fill($data);

                $contratoAluguer =
                    $this->contrato(
                        $tenantId,
                        $aluguer->contrato_aluguer_id,
                        'aluguer'
                    );

                $contratoPrestacao =
                    $this->contrato(
                        $tenantId,
                        $aluguer->contrato_prestacao_id,
                        'prestacao_servico'
                    );

                if (
                    !$aluguer->proprietario_id &&
                    $contratoAluguer->proprietario_id
                ) {
                    $aluguer->proprietario_id =
                        $contratoAluguer->proprietario_id;
                }

                if (
                    !$aluguer->data_inicio &&
                    $contratoAluguer->data_inicio
                ) {
                    $aluguer->data_inicio =
                        $contratoAluguer->data_inicio;
                }

                if (
                    !$aluguer->data_fim &&
                    $contratoAluguer->data_fim
                ) {
                    $aluguer->data_fim =
                        $contratoAluguer->data_fim;
                }

                $this->validarContratoEntidades(
                    $contratoAluguer,
                    $aluguer,
                    'contrato_aluguer_id'
                );

                $this->assertContratoPronto(
                    $tenantId,
                    $contratoAluguer,
                    'contrato_aluguer_id',
                    'aluguer'
                );

                $this->assertContratoPronto(
                    $tenantId,
                    $contratoPrestacao,
                    'contrato_prestacao_id',
                    'prestação de serviços'
                );

                $this->validarContratoEntidades(
                    $contratoPrestacao,
                    $aluguer,
                    'contrato_prestacao_id',
                    false
                );

                if (
                    !$aluguer
                        ->checklist_entrega_id
                ) {
                    throw ValidationException::withMessages([
                        'checklist_entrega_id' =>
                        'O checklist de entrega finalizado é obrigatório para ativar o aluguer.',
                    ]);
                }

                $checklist =
                    ChecklistRecord::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'tipo',
                        'entrega'
                    )
                    ->where(
                        'estado',
                        'finalizado'
                    )
                    ->lockForUpdate()
                    ->findOrFail(
                        $aluguer
                            ->checklist_entrega_id
                    );

                if (
                    $checklist->motorista_id !==
                    $aluguer->motorista_id
                ) {
                    throw ValidationException::withMessages([
                        'checklist_entrega_id' =>
                        'O checklist de entrega pertence a outro motorista.',
                    ]);
                }

                if (
                    $checklist->veiculo_id !==
                    $aluguer->veiculo_id
                ) {
                    throw ValidationException::withMessages([
                        'checklist_entrega_id' =>
                        'O checklist de entrega pertence a outro veículo.',
                    ]);
                }

                $this->validarCronologia(
                    $aluguer
                );

                $aluguer->status =
                    'ativo';

                $aluguer->rascunho_passo =
                    4;

                $aluguer->save();

                return $this->carregar(
                    $aluguer
                );
            }
        );
    }

    public function finalize(
        string $id,
        string $tenantId
    ): Aluguer {
        return DB::transaction(
            function () use (
                $id,
                $tenantId
            ) {
                $aluguer =
                    $this->findLocked(
                        $id,
                        $tenantId
                    );

                $this->assertAtivo(
                    $aluguer
                );

                $this->encerrarContrato(
                    $tenantId,
                    $aluguer->contrato_aluguer_id,
                    ['assinado']
                );

                $this->encerrarContrato(
                    $tenantId,
                    $aluguer->contrato_prestacao_id,
                    ['assinado']
                );

                $this->libertarVeiculo(
                    $aluguer
                );

                $aluguer->status =
                    'finalizado';

                $aluguer->data_finalizacao =
                    now();

                $aluguer->data_fim =
                    $aluguer->data_fim
                    ?: today();

                $aluguer->save();

                return $this->carregar(
                    $aluguer
                );
            }
        );
    }

    public function finalizeReturn(
        string $id,
        string $tenantId,
        array $data
    ): Aluguer {
        $signatureMotorista =
            $this->decodeSignature(
                $data['assinatura_motorista']
            );

        $signatureEmpresa =
            $this->decodeSignature(
                $data['assinatura_empresa']
            );

        $storedPaths = [];

        try {
            return DB::transaction(
                function () use (
                    $id,
                    $tenantId,
                    $data,
                    $signatureMotorista,
                    $signatureEmpresa,
                    &$storedPaths
                ) {
                    $aluguer =
                        $this->findLocked(
                            $id,
                            $tenantId
                        );

                    $this->assertAtivo(
                        $aluguer
                    );

                    $recolha =
                        ChecklistRecord::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'tipo',
                            'recolha'
                        )
                        ->where(
                            'estado',
                            'finalizado'
                        )
                        ->lockForUpdate()
                        ->findOrFail(
                            $data['checklist_devolucao_id']
                        );

                    if (
                        $recolha->motorista_id !==
                        $aluguer->motorista_id
                    ) {
                        throw ValidationException::withMessages([
                            'checklist_devolucao_id' =>
                            'A recolha pertence a outro motorista.',
                        ]);
                    }

                    if (
                        $recolha->veiculo_id !==
                        $aluguer->veiculo_id
                    ) {
                        throw ValidationException::withMessages([
                            'checklist_devolucao_id' =>
                            'A recolha pertence a outro veículo.',
                        ]);
                    }

                    if (
                        $aluguer->checklist_entrega_id &&
                        $recolha->entrega_vinculada_id !==
                        $aluguer->checklist_entrega_id
                    ) {
                        throw ValidationException::withMessages([
                            'checklist_devolucao_id' =>
                            'A recolha não corresponde ao checklist de entrega deste aluguer.',
                        ]);
                    }

                    if (
                        !$aluguer->checklist_entrega_id &&
                        $recolha->entrega_vinculada_id
                    ) {
                        $aluguer->checklist_entrega_id =
                            $recolha->entrega_vinculada_id;
                    }

                    $contratoPrestacaoId =
                        $data['contrato_prestacao_id'] ??
                        $aluguer->contrato_prestacao_id;

                    if (!$contratoPrestacaoId) {
                        throw ValidationException::withMessages([
                            'contrato_prestacao_id' =>
                            'Selecione o contrato de prestação de serviço.',
                        ]);
                    }

                    $contratoPrestacao =
                        $this->contrato(
                            $tenantId,
                            $contratoPrestacaoId,
                            'prestacao_servico'
                        );

                    $this->validarContratoEntidades(
                        $contratoPrestacao,
                        $aluguer,
                        'contrato_prestacao_id',
                        false
                    );

                    $tipo =
                        $data['devolucao_tipo'];

                    $diasAtraso =
                        $tipo === 'atraso'
                        ? (int) (
                            $data['devolucao_dias_atraso'] ?? 0
                        )
                        : 0;

                    $valorDia =
                        $tipo === 'atraso'
                        ? (float) (
                            $data['devolucao_valor_dia'] ?? 0
                        )
                        : 0;

                    if (
                        $tipo === 'atraso' &&
                        (
                            $diasAtraso <= 0 ||
                            $valorDia <= 0
                        )
                    ) {
                        throw ValidationException::withMessages([
                            'devolucao_dias_atraso' =>
                            'Informe os dias de atraso e um valor por dia superior a zero.',
                        ]);
                    }

                    $multaAtraso =
                        round(
                            $diasAtraso *
                                $valorDia,
                            2
                        );

                    $multas =
                        array_values(
                            $data['devolucao_multas_adicionais'] ?? []
                        );

                    $totalMultas =
                        round(
                            array_reduce(
                                $multas,
                                fn(
                                    float $total,
                                    array $multa
                                ) =>
                                $total +
                                    (float)
                                    $multa['valor'],
                                0.0
                            ),
                            2
                        );

                    $penalizacoesChecklist =
                        round(
                            (float)
                            $recolha
                                ->penalizacao_total,
                            2
                        );

                    $total =
                        round(
                            $multaAtraso +
                                $totalMultas +
                                $penalizacoesChecklist,
                            2
                        );

                    $basePath =
                        'rental-return-signatures/' .
                        $tenantId .
                        '/' .
                        $aluguer->id;

                    $motoristaPath =
                        $basePath .
                        '/motorista.png';

                    $empresaPath =
                        $basePath .
                        '/empresa.png';

                    if (
                        !Storage::disk('local')
                            ->put(
                                $motoristaPath,
                                $signatureMotorista
                            )
                    ) {
                        throw new RuntimeException(
                            'Não foi possível guardar a assinatura do motorista.'
                        );
                    }

                    $storedPaths[] =
                        $motoristaPath;

                    if (
                        !Storage::disk('local')
                            ->put(
                                $empresaPath,
                                $signatureEmpresa
                            )
                    ) {
                        throw new RuntimeException(
                            'Não foi possível guardar a assinatura da empresa.'
                        );
                    }

                    $storedPaths[] =
                        $empresaPath;

                    $this->encerrarContrato(
                        $tenantId,
                        $aluguer->contrato_aluguer_id,
                        [
                            'assinado',
                            'enviado',
                        ]
                    );

                    $this->encerrarContrato(
                        $tenantId,
                        $contratoPrestacaoId,
                        [
                            'assinado',
                            'enviado',
                        ]
                    );

                    $this->libertarVeiculo(
                        $aluguer
                    );

                    $aluguer->status =
                        'finalizado';

                    $aluguer->data_finalizacao =
                        now();

                    $aluguer->data_fim =
                        $aluguer->data_fim
                        ?: today();

                    $aluguer->checklist_devolucao_id =
                        $recolha->id;

                    $aluguer->contrato_prestacao_id =
                        $contratoPrestacaoId;

                    $aluguer->devolucao_tipo =
                        $tipo;

                    $aluguer->devolucao_dias_atraso =
                        $diasAtraso;

                    $aluguer->devolucao_valor_dia =
                        $valorDia;

                    $aluguer->devolucao_multa_atraso =
                        $multaAtraso;

                    $aluguer->devolucao_multas_adicionais =
                        $multas;

                    $aluguer->devolucao_penalizacoes_checklist =
                        $penalizacoesChecklist;

                    $aluguer->devolucao_total_pagar =
                        $total;

                    $aluguer->devolucao_declaracao_aceite =
                        true;

                    $aluguer->devolucao_assinatura_motorista_url =
                        $motoristaPath;

                    $aluguer->devolucao_assinatura_empresa_url =
                        $empresaPath;

                    $aluguer->devolucao_pdf_url =
                        null;

                    $aluguer->devolucao_observacoes =
                        $data['devolucao_observacoes'] ?? null;

                    $aluguer->save();

                    return $this->carregar(
                        $aluguer
                    );
                }
            );
        } catch (Throwable $exception) {
            foreach (
                $storedPaths as $path
            ) {
                Storage::disk('local')
                    ->delete($path);
            }

            throw $exception;
        }
    }

    private function findLocked(
        string $id,
        string $tenantId
    ): Aluguer {
        return Aluguer::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereKey($id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function assertAtivo(
        Aluguer $aluguer
    ): void {
        if ($aluguer->status !== 'ativo') {
            throw ValidationException::withMessages([
                'status' =>
                'Apenas alugueres ativos podem ser finalizados.',
            ]);
        }
    }

    private function contrato(
        string $tenantId,
        ?string $id,
        string $tipo
    ): Contrato {
        if (!$id) {
            throw ValidationException::withMessages([
                'contrato' =>
                'Contrato obrigatório.',
            ]);
        }

        $contrato =
            Contrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'tipo',
                $tipo
            )
            ->whereKey($id)
            ->lockForUpdate()
            ->first();

        if (!$contrato) {
            throw ValidationException::withMessages([
                'contrato' =>
                'Contrato inválido para esta organização.',
            ]);
        }

        return $contrato;
    }

    private function validarContratoEntidades(
        Contrato $contrato,
        Aluguer $aluguer,
        string $campo,
        bool $validarVeiculo = true
    ): void {
        if (
            $contrato->motorista_id &&
            $contrato->motorista_id !==
            $aluguer->motorista_id
        ) {
            throw ValidationException::withMessages([
                $campo =>
                'O contrato pertence a outro motorista.',
            ]);
        }

        if (
            $validarVeiculo &&
            $contrato->veiculo_id &&
            $contrato->veiculo_id !==
            $aluguer->veiculo_id
        ) {
            throw ValidationException::withMessages([
                $campo =>
                'O contrato pertence a outro veículo.',
            ]);
        }

        if (
            $contrato->proprietario_id &&
            $aluguer->proprietario_id &&
            $contrato->proprietario_id !==
            $aluguer->proprietario_id
        ) {
            throw ValidationException::withMessages([
                $campo =>
                'O contrato pertence a outro proprietário.',
            ]);
        }
    }

    private function validarCronologia(
        Aluguer $aluguer
    ): void {
        if (
            !$aluguer->data_inicio ||
            !$aluguer->data_fim
        ) {
            return;
        }

        if (
            $aluguer->data_fim->lt(
                $aluguer->data_inicio
            )
        ) {
            throw ValidationException::withMessages([
                'data_fim' =>
                'A data de fim deve ser igual ou posterior à data de início.',
            ]);
        }
    }

    private function encerrarContrato(
        string $tenantId,
        ?string $id,
        array $statuses
    ): void {
        if (!$id) {
            return;
        }

        $contrato =
            Contrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereKey($id)
            ->lockForUpdate()
            ->first();

        if (
            !$contrato ||
            !in_array(
                $contrato->status,
                $statuses,
                true
            )
        ) {
            return;
        }

        $contrato->status =
            'encerrado';

        $contrato->bloqueado =
            true;

        $contrato->data_fim =
            $contrato->data_fim
            ?: today();

        $contrato->save();
    }

    private function libertarVeiculo(
        Aluguer $aluguer
    ): void {
        ContratoAtivoVeiculo::query()
            ->where(
                'tenant_id',
                $aluguer->tenant_id
            )
            ->where(
                'ativo',
                true
            )
            ->where(
                function ($query) use (
                    $aluguer
                ) {
                    $query->where(
                        'contrato_id',
                        $aluguer->contrato_aluguer_id
                    )
                        ->orWhere(
                            function ($query) use (
                                $aluguer
                            ) {
                                $query
                                    ->where(
                                        'motorista_id',
                                        $aluguer->motorista_id
                                    )
                                    ->where(
                                        'veiculo_id',
                                        $aluguer->veiculo_id
                                    );
                            }
                        );
                }
            )
            ->update([
                'ativo' => false,
                'data_fim' => now(),
            ]);
    }

    private function decodeSignature(
        string $dataUrl
    ): string {
        $prefix =
            'data:image/png;base64,';

        $binary =
            base64_decode(
                substr(
                    $dataUrl,
                    strlen($prefix)
                ),
                true
            );

        if (
            $binary === false ||
            !str_starts_with(
                $binary,
                "\x89PNG\r\n\x1a\n"
            )
        ) {
            throw ValidationException::withMessages([
                'assinatura' =>
                'Assinatura PNG inválida.',
            ]);
        }

        return $binary;
    }

    private function assertContratoPronto(
        string $tenantId,
        Contrato $contrato,
        string $field,
        string $nome
    ): void {
        if (
            $contrato->status !==
            'assinado'
        ) {
            throw ValidationException::withMessages([
                $field =>
                "O contrato de {$nome} precisa estar assinado antes da ativação.",
            ]);
        }

        if (
            !$this
                ->checklistProcessService
                ->isComplete(
                    $tenantId,
                    ChecklistProcessService::ENTITY_CONTRATO,
                    $contrato->id
                )
        ) {
            throw ValidationException::withMessages([
                $field =>
                "O checklist de processo do contrato de {$nome} ainda não está concluído.",
            ]);
        }
    }

    private function carregar(
        Aluguer $aluguer
    ): Aluguer {
        return $aluguer->load([
            'motorista:id,nome_completo',
            'veiculo:id,matricula,marca,modelo',
            'proprietario:id,tipo,nome_completo,nome_empresa',
            'contratoAluguer:id,tipo,status,motorista_id,veiculo_id,proprietario_id,data_inicio,data_fim',
            'contratoPrestacao:id,tipo,status,motorista_id,veiculo_id,proprietario_id,data_inicio,data_fim',
            'checklistEntrega:id,tipo,estado,motorista_id,veiculo_id,data_operacao,quilometragem,penalizacao_total',
            'checklistDevolucao:id,tipo,estado,motorista_id,veiculo_id,entrega_vinculada_id,data_operacao,quilometragem,penalizacao_total',
        ]);
    }
}
