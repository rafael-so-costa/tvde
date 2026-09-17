<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAluguerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->requireId();

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
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('motoristas', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'veiculo_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('veiculos', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'proprietario_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('proprietarios', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'contrato_aluguer_id' => [
                'sometimes',
                'nullable',
                'uuid',
            ],

            'contrato_prestacao_id' => [
                'sometimes',
                'nullable',
                'uuid',
            ],

            'checklist_entrega_id' => [
                'sometimes',
                'nullable',
                'uuid',
            ],

            'checklist_devolucao_id' => ['prohibited'],

            'data_inicio' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'data_fim' => [
                'sometimes',
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
                'sometimes',
                'nullable',
                'string',
            ],
        ];
    }
}
