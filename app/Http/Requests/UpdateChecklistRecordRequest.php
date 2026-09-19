<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChecklistRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(
            TenantContext::class
        )->requireId();

        return [
            'tenant_id' => ['prohibited'],
            'tipo' => ['prohibited'],
            'entrega_vinculada_id' => ['prohibited'],
            'estado' => ['prohibited'],
            'finalizado_em' => ['prohibited'],
            'realizado_por' => ['prohibited'],
            'motorista_nome_snapshot' => ['prohibited'],
            'matricula_snapshot' => ['prohibited'],
            'modelo_snapshot' => ['prohibited'],
            'assinatura_empresa_path' => ['prohibited'],
            'assinatura_motorista_path' => ['prohibited'],

            'motorista_id' => [
                'sometimes',
                'required',
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
                'sometimes',
                'required',
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

            'data_operacao' => [
                'sometimes',
                'required',
                'date',
            ],

            'hora_operacao' => [
                'sometimes',
                'nullable',
                'date_format:H:i',
            ],

            'quilometragem' => [
                'sometimes',
                'required',
                'integer',
                'min:0',
            ],

            'nivel_combustivel' => [
                'sometimes',
                'required',
                Rule::in([
                    '1/4',
                    '1/2',
                    '3/4',
                    'cheio',
                ]),
            ],

            'penalizacao_total' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'itens' => [
                'sometimes',
                'array',
            ],

            'itens.*' => [
                'boolean',
            ],

            'campos_especiais' => [
                'sometimes',
                'array',
            ],

            'campos_especiais.*' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'danos' => [
                'sometimes',
                'array',
            ],

            'danos.*.part' => [
                'required',
                'string',
                'max:255',
            ],

            'danos.*.types' => [
                'sometimes',
                'array',
            ],

            'danos.*.types.*' => [
                Rule::in([
                    'amassado',
                    'riscado',
                    'quebrado',
                ]),
            ],

            'danos.*.status' => [
                'nullable',
                Rule::in([
                    'ok',
                    'riscado',
                    'amassado',
                    'quebrado',
                ]),
            ],

            'danos.*.value' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'itens_faltantes' => [
                'sometimes',
                'array',
            ],

            'itens_faltantes.*' => [
                'boolean',
            ],

            'novos_danos' => [
                'sometimes',
                'array',
            ],

            'novos_danos.*.part' => [
                'required',
                'string',
                'max:255',
            ],

            'novos_danos.*.types' => [
                'sometimes',
                'array',
            ],

            'novos_danos.*.types.*' => [
                Rule::in([
                    'amassado',
                    'riscado',
                    'quebrado',
                ]),
            ],

            'novos_danos.*.status' => [
                'nullable',
                Rule::in([
                    'ok',
                    'riscado',
                    'amassado',
                    'quebrado',
                ]),
            ],

            'novos_danos.*.value' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'media' => [
                'sometimes',
                'array',
            ],

            'metadados_seguranca' => [
                'sometimes',
                'nullable',
                'array',
            ],

            'observacoes' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ];
    }
}
