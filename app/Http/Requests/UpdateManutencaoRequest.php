<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateManutencaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id'=>[
                'sometimes',
                'required',
                'uuid',
            ],

            'motorista_id'=>[
                'sometimes',
                'nullable',
                'uuid',
            ],

            'plano_id'=>[
                'sometimes',
                'nullable',
                'uuid',
            ],

            'fornecedor_id'=>[
                'sometimes',
                'nullable',
                'uuid',
            ],

            'tipo_servico'=>[
                'sometimes',
                'required',
                'string',
                'max:150',
            ],

            'prioridade'=>[
                'sometimes',
                'required',
                Rule::in([
                    'baixa',
                    'normal',
                    'alta',
                    'critica',
                ]),
            ],

            'problema_reportado'=>[
                'sometimes',
                'nullable',
                'string',
                'max:10000',
            ],

            'km'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:0',
                'max:999999999',
            ],

            'data_solicitacao'=>[
                'sometimes',
                'required',
                'date',
            ],

            'data_agendada'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'aprovacao_obrigatoria'=>[
                'sometimes',
                'required',
                'boolean',
            ],

            'indisponibiliza_veiculo'=>[
                'sometimes',
                'required',
                'boolean',
            ],

            'valor_orcamento'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'proxima_revisao_km'=>[
                'sometimes',
                'nullable',
                'integer',
                'min:0',
                'max:999999999',
            ],

            'proxima_revisao_data'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'observacoes'=>[
                'sometimes',
                'nullable',
                'string',
                'max:20000',
            ],

            /*
             * A origem e respetivos vínculos não são
             * reescritos depois da criação.
             */
            'origem'=>['prohibited'],
            'checklist_record_id'=>['prohibited'],
            'sinistro_id'=>['prohibited'],
            'diagnostico_id'=>['prohibited'],

            'itens'=>['prohibited'],
            'tenant_id'=>['prohibited'],
            'proprietario_id'=>['prohibited'],
            'numero_ordem'=>['prohibited'],
            'status'=>['prohibited'],
            'data_entrada'=>['prohibited'],
            'data_conclusao'=>['prohibited'],
            'custo_pecas'=>['prohibited'],
            'custo_mao_obra'=>['prohibited'],
            'custo_outros'=>['prohibited'],
            'custo_total'=>['prohibited'],
            'created_by'=>['prohibited'],
            'updated_by'=>['prohibited'],
        ];
    }
}
