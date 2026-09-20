<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActivateAluguerRequest extends FormRequest
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
            'checklist_devolucao_id' => ['prohibited'],
            'rascunho_passo' => ['prohibited'],
            'rascunho_dados' => ['prohibited'],

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
                'required',
                'uuid',
                Rule::exists('motoristas', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'veiculo_id' => [
                'required',
                'uuid',
                Rule::exists('veiculos', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'proprietario_id' => [
                'nullable',
                'uuid',
                Rule::exists('proprietarios', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'contrato_aluguer_id' => [
                'required',
                'uuid',
                Rule::exists('contratos', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                            ->where('tipo', 'aluguer')
                    ),
            ],

            'contrato_prestacao_id' => [
                'required',
                'uuid',
                Rule::exists('contratos', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                            ->where('tipo', 'prestacao_servico')
                    ),
            ],

            'checklist_entrega_id' => [
                'required',
                'uuid',
                Rule::exists('checklist_records', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                            ->where('tipo', 'entrega')
                            ->where('estado', 'finalizado')
                    ),
            ],

            'data_inicio' => [
                'nullable',
                'date',
            ],

            'data_fim' => [
                'nullable',
                'date',
            ],

            'observacoes' => [
                'nullable',
                'string',
            ],
        ];
    }
}
