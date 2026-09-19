<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FinalizeAluguerReturnRequest extends FormRequest
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
            'data_finalizacao' => ['prohibited'],

            'devolucao_multa_atraso' => ['prohibited'],
            'devolucao_penalizacoes_checklist' => ['prohibited'],
            'devolucao_total_pagar' => ['prohibited'],
            'devolucao_assinatura_motorista_url' => ['prohibited'],
            'devolucao_assinatura_empresa_url' => ['prohibited'],
            'devolucao_pdf_url' => ['prohibited'],

            'checklist_devolucao_id' => [
                'required',
                'uuid',
                Rule::exists('checklist_records', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                            ->where('tipo', 'recolha')
                            ->where('estado', 'finalizado')
                    ),
            ],

            'contrato_prestacao_id' => [
                'nullable',
                'uuid',
                Rule::exists('contratos', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                            ->where('tipo', 'prestacao_servico')
                    ),
            ],

            'devolucao_tipo' => [
                'required',
                Rule::in([
                    'no_prazo',
                    'atraso',
                ]),
            ],

            'devolucao_dias_atraso' => [
                Rule::requiredIf(
                    fn () => $this->input('devolucao_tipo') === 'atraso'
                ),
                'nullable',
                'integer',
                'min:0',
            ],

            'devolucao_valor_dia' => [
                Rule::requiredIf(
                    fn () => $this->input('devolucao_tipo') === 'atraso'
                ),
                'nullable',
                'numeric',
                'min:0',
            ],

            'devolucao_multas_adicionais' => [
                'sometimes',
                'array',
                'max:50',
            ],

            'devolucao_multas_adicionais.*.nome' => [
                'required',
                'string',
                'max:255',
            ],

            'devolucao_multas_adicionais.*.valor' => [
                'required',
                'numeric',
                'min:0',
            ],

            'devolucao_declaracao_aceite' => [
                'required',
                'accepted',
            ],

            'assinatura_motorista' =>
                $this->signatureRules(),

            'assinatura_empresa' =>
                $this->signatureRules(),

            'devolucao_observacoes' => [
                'nullable',
                'string',
                'max:10000',
            ],
        ];
    }

    private function signatureRules(): array
    {
        return [
            'required',
            'string',
            'max:1500000',

            function (
                string $attribute,
                mixed $value,
                Closure $fail
            ): void {
                if (!is_string($value)) {
                    return;
                }

                $prefix = 'data:image/png;base64,';

                if (!str_starts_with($value, $prefix)) {
                    $fail(
                        'A assinatura deve ser uma imagem PNG válida.'
                    );

                    return;
                }

                $binary = base64_decode(
                    substr(
                        $value,
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
                    $fail(
                        'A assinatura deve ser uma imagem PNG válida.'
                    );

                    return;
                }

                if (strlen($binary) > 1024 * 1024) {
                    $fail(
                        'A assinatura não pode exceder 1 MB.'
                    );
                }
            },
        ];
    }
}
