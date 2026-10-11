<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTemplateContratoRequest extends FormRequest
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
            'modelo_documento_saas_id' => [
                'prohibited',
            ],

            'modelo_documento_saas_versao_id' => [
                'prohibited',
            ],

            'modelo_documento_saas_versao' => [
                'prohibited',
            ],

            'perfil_id' => [
                'nullable',
                'uuid',
                Rule::exists('perfis_template', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'checklist_process_template_id' => [
                'nullable',
                'uuid',
                Rule::exists(
                    'checklist_process_templates',
                    'id'
                )->where(
                    fn($query) =>
                    $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'ativo',
                            true
                        )
                ),
            ],

            'nome' => [
                'required',
                'string',
                'max:255',
            ],

            'arquivo_url' => ['prohibited'],

            'tipo_arquivo' => [
                'sometimes',
                'required',
                'string',
                'max:50',
            ],

            'conteudo_original' => [
                'nullable',
                'string',
            ],

            'campos_detectados' => [
                'sometimes',
                'array',
            ],

            'campos_detectados.*.id' => [
                'required',
                'string',
                'max:255',
            ],

            'campos_detectados.*.name' => [
                'required',
                'string',
                'max:255',
            ],

            'campos_detectados.*.label' => [
                'required',
                'string',
                'max:255',
            ],

            'campos_detectados.*.type' => [
                'required',
                Rule::in([
                    'text',
                    'number',
                    'date',
                    'currency',
                    'cpf_cnpj',
                    'email',
                    'phone',
                ]),
            ],

            'campos_detectados.*.required' => [
                'required',
                'boolean',
            ],

            'campos_detectados.*.value' => [
                'nullable',
                'string',
            ],

            'campos_detectados.*.placeholder' => [
                'nullable',
                'string',
                'max:255',
            ],

            'campos_detectados.*.validation' => [
                'nullable',
                'string',
                'max:255',
            ],

            'campos_mapeados' => [
                'sometimes',
                'array',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('nome')) {
            $this->merge([
                'nome' => trim(
                    (string) $this->input('nome')
                ),
            ]);
        }
    }
}
