<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAluguerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)
            ->requireId();

        return [
            'tenant_id' => ['prohibited'],
            'status' => ['prohibited'],
            'created_by' => ['prohibited'],
            'data_finalizacao' => ['prohibited'],

            'devolucao_tipo' => ['prohibited'],
            'devolucao_dias_atraso' => ['prohibited'],
            'devolucao_valor_dia' => ['prohibited'],
            'devolucao_multa_atraso' => ['prohibited'],
            'devolucao_multas_adicionais' => ['prohibited'],
            'devolucao_penalizacoes_checklist' => ['prohibited'],
            'devolucao_total_pagar' => ['prohibited'],
            'devolucao_declaracao_aceite' => ['prohibited'],
            'devolucao_assinatura_motorista_url' => ['prohibited'],
            'devolucao_assinatura_empresa_url' => ['prohibited'],
            'devolucao_pdf_url' => ['prohibited'],
            'devolucao_observacoes' => ['prohibited'],

            'motorista_id' => [
                'nullable',
                'uuid',
                Rule::exists(
                    'motoristas',
                    'id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'veiculo_id' => [
                'nullable',
                'uuid',
                Rule::exists(
                    'veiculos',
                    'id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'proprietario_id' => [
                'nullable',
                'uuid',
                Rule::exists(
                    'proprietarios',
                    'id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'contrato_aluguer_id' => [
                'nullable',
                'uuid',

                Rule::exists(
                    'contratos',
                    'id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'tipo',
                            'aluguer'
                        )
                ),

                Rule::unique(
                    'alugueres',
                    'contrato_aluguer_id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'contrato_prestacao_id' => [
                'nullable',
                'uuid',

                Rule::exists(
                    'contratos',
                    'id'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'tipo',
                            'prestacao_servico'
                        )
                ),
            ],

            'checklist_entrega_id' => [
                'nullable',
                'uuid',

                Rule::exists(
                    'checklist_records',
                    'id'
                )->where(
                    fn ($query) => $query
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
                ),
            ],

            'checklist_devolucao_id' => [
                'prohibited',
            ],

            'data_inicio' => [
                'nullable',
                'date',
            ],

            'data_fim' => [
                'nullable',
                'date',
            ],

            'rascunho_passo' => [
                'sometimes',
                'integer',
                'between:1,4',
            ],

            'rascunho_dados' => [
                'sometimes',
                'array',
            ],

            'observacoes' => [
                'nullable',
                'string',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'contrato_aluguer_id.unique' => 'Este contrato de aluguer já possui um processo operacional.',

            'data_inicio.date' => 'Informe uma data de início válida.',

            'data_fim.date' => 'Informe uma data de fim válida.',

            'rascunho_passo.between' => 'A etapa do processo deve estar entre 1 e 4.',
        ];
    }

    public function withValidator(
        Validator $validator
    ): void {
        $validator->after(
            function (
                Validator $validator
            ): void {
                if (
                    $validator
                        ->errors()
                        ->hasAny([
                            'data_inicio',
                            'data_fim',
                        ])
                ) {
                    return;
                }

                $inicio =
                    $this->input(
                        'data_inicio'
                    );

                $fim =
                    $this->input(
                        'data_fim'
                    );

                if (
                    ! $inicio ||
                    ! $fim
                ) {
                    return;
                }

                if (
                    Carbon::parse(
                        $fim
                    )->lt(
                        Carbon::parse(
                            $inicio
                        )
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'data_fim',
                            'A data de fim deve ser igual ou posterior à data de início.'
                        );
                }
            }
        );
    }
}
