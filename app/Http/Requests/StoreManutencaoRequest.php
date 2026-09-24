<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManutencaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id' => ['required', 'uuid'],
            'motorista_id' => ['nullable', 'uuid'],
            'fornecedor_id' => [
                'nullable',
                'uuid',
            ],
            'plano_id' => ['nullable', 'uuid'],
            'checklist_record_id' => ['nullable', 'uuid'],
            'sinistro_id' => ['nullable', 'uuid'],
            'diagnostico_id' => ['nullable', 'uuid'],

            'origem' => [
                'required',
                Rule::in([
                    'preventiva',
                    'avaria',
                    'checklist',
                    'sinistro',
                    'diagnostico',
                    'manual',
                ]),
            ],

            'tipo_servico' => [
                'required',
                'string',
                'max:150',
            ],

            'prioridade' => [
                'required',
                Rule::in([
                    'baixa',
                    'normal',
                    'alta',
                    'critica',
                ]),
            ],

            'problema_reportado' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'km' => [
                'nullable',
                'integer',
                'min:0',
                'max:999999999',
            ],

            'data_solicitacao' => [
                'nullable',
                'date',
            ],

            'data_agendada' => [
                'nullable',
                'date',
            ],

            'aprovacao_obrigatoria' => [
                'required',
                'boolean',
            ],

            'indisponibiliza_veiculo' => [
                'required',
                'boolean',
            ],

            'valor_orcamento' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'proxima_revisao_km' => [
                'nullable',
                'integer',
                'min:0',
                'max:999999999',
            ],

            'proxima_revisao_data' => [
                'nullable',
                'date',
            ],

            'observacoes' => [
                'nullable',
                'string',
                'max:20000',
            ],

            'itens' => [
                'nullable',
                'array',
                'max:500',
            ],

            'itens.*.peca_id' => [
                'nullable',
                'uuid',
            ],

            'itens.*.tipo' => [
                'required',
                Rule::in([
                    'peca',
                    'mao_obra',
                    'outro',
                ]),
            ],

            'itens.*.descricao' => [
                'nullable',
                'string',
                'max:500',
            ],

            'itens.*.quantidade' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:999999999',
            ],

            'itens.*.unidade' => [
                'nullable',
                'string',
                'max:30',
            ],

            'itens.*.valor_unitario' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.9999',
            ],

            'itens.*.consome_estoque' => [
                'nullable',
                'boolean',
            ],

            'itens.*.garantia_meses' => [
                'nullable',
                'integer',
                'min:1',
                'max:600',
            ],

            'itens.*.garantia_km' => [
                'nullable',
                'integer',
                'min:1',
                'max:999999999',
            ],

            'tenant_id' => ['prohibited'],
            'proprietario_id' => ['prohibited'],
            'numero_ordem' => ['prohibited'],
            'status' => ['prohibited'],
            'data_entrada' => ['prohibited'],
            'data_conclusao' => ['prohibited'],
            'custo_pecas' => ['prohibited'],
            'custo_mao_obra' => ['prohibited'],
            'custo_outros' => ['prohibited'],
            'custo_total' => ['prohibited'],
            'created_by' => ['prohibited'],
            'updated_by' => ['prohibited'],
        ];
    }
}
