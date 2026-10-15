<?php

namespace App\Http\Requests;

use App\Rules\PortugueseNif;
use App\Services\TenantContext;
use App\Support\PortugueseDataNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReciboVerdeRequest extends FormRequest
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
            'empresa_id' => ['prohibited'],
            'ano' => ['prohibited'],
            'mes' => ['prohibited'],
            'status' => ['prohibited'],
            'arquivo_path' => ['prohibited'],
            'arquivo_nome' => ['prohibited'],
            'arquivo_mime' => ['prohibited'],
            'arquivo_tamanho' => ['prohibited'],
            'hash_arquivo' => ['prohibited'],
            'avisos_validacao' => ['prohibited'],
            'observacoes_empresa' => ['prohibited'],
            'created_by' => ['prohibited'],
            'validado_por' => ['prohibited'],
            'validado_em' => ['prohibited'],
            'rejeitado_por' => ['prohibited'],
            'rejeitado_em' => ['prohibited'],

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

            'numero_documento' => [
                'required',
                'string',
                'max:150',
            ],

            'data_emissao' => [
                'required',
                'date',
            ],

            'nif_emitente' => [
                'required',
                'string',
                'size:9',
                new PortugueseNif,
            ],

            'nome_emitente' => [
                'nullable',
                'string',
                'max:255',
            ],

            'nif_adquirente' => [
                'required',
                'string',
                'size:9',
                new PortugueseNif,
            ],

            'nome_adquirente' => [
                'nullable',
                'string',
                'max:255',
            ],

            'valor_base' => [
                'required',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'valor_iva' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'retencao_irs' => [
                'nullable',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'valor_total' => [
                'required',
                'numeric',
                'min:0',
                'max:9999999999999.99',
            ],

            'arquivo' => [
                'required',
                'file',
                'mimes:pdf',
                'max:20480',
            ],

            'dados_extraidos' => [
                'nullable',
                'array',
            ],

            'dados_extraidos.texto' => [
                'nullable',
                'string',
                'max:50000',
            ],

            'dados_extraidos.metodo' => [
                'nullable',
                'string',
                'max:50',
            ],

            'dados_extraidos.confianca' => [
                'nullable',
                'array',
            ],

            'dados_extraidos.confianca.*' => [
                'nullable',
                'numeric',
                'between:0,1',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'numero_documento.required' => 'O número do documento é obrigatório.',

            'data_emissao.required' => 'A data de emissão é obrigatória.',

            'data_emissao.date' => 'Informe uma data de emissão válida.',

            'nif_emitente.required' => 'O NIF do emitente é obrigatório.',

            'nif_adquirente.required' => 'O NIF do adquirente é obrigatório.',

            'valor_base.required' => 'O valor base é obrigatório.',

            'valor_base.numeric' => 'Informe um valor base válido.',

            'valor_base.min' => 'O valor base não pode ser negativo.',

            'valor_iva.numeric' => 'Informe um valor de IVA válido.',

            'valor_iva.min' => 'O IVA não pode ser negativo.',

            'retencao_irs.numeric' => 'Informe uma retenção de IRS válida.',

            'retencao_irs.min' => 'A retenção de IRS não pode ser negativa.',

            'valor_total.required' => 'O valor total é obrigatório.',

            'valor_total.numeric' => 'Informe um valor total válido.',

            'valor_total.min' => 'O valor total não pode ser negativo.',

            'arquivo.required' => 'Selecione o PDF do recibo verde.',

            'arquivo.mimes' => 'O recibo verde deve ser enviado em PDF.',

            'arquivo.max' => 'O ficheiro não pode ultrapassar 20 MB.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('nif_emitente')) {
            $merge['nif_emitente'] =
                PortugueseDataNormalizer::nif(
                    $this->input(
                        'nif_emitente'
                    )
                );
        }

        if ($this->has('nif_adquirente')) {
            $merge['nif_adquirente'] =
                PortugueseDataNormalizer::nif(
                    $this->input(
                        'nif_adquirente'
                    )
                );
        }

        if ($this->has('numero_documento')) {
            $value = preg_replace(
                '/\s+/u',
                ' ',
                trim(
                    (string) $this->input(
                        'numero_documento'
                    )
                )
            );

            $merge['numero_documento'] =
                $value === ''
                    ? null
                    : $value;
        }

        if ($this->has('nome_emitente')) {
            $value = trim(
                (string) $this->input(
                    'nome_emitente'
                )
            );

            $merge['nome_emitente'] =
                $value === ''
                    ? null
                    : $value;
        }

        if ($this->has('nome_adquirente')) {
            $value = trim(
                (string) $this->input(
                    'nome_adquirente'
                )
            );

            $merge['nome_adquirente'] =
                $value === ''
                    ? null
                    : $value;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }
}
