<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMotoristaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->requireId();
        $id = $this->route('id');

        return [
            'tenant_id' => ['prohibited'],
            'user_id' => ['prohibited'],
            'ativo' => ['prohibited'],
            'status_cadastro' => ['prohibited'],

            'nome_completo' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'data_nascimento' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'filhos' => [
                'sometimes',
                'nullable',
                'integer',
                'min:0',
            ],

            'estado_civil' => [
                'sometimes',
                'nullable',
                Rule::in([
                    'solteiro',
                    'casado',
                    'divorciado',
                    'viuvo',
                    'uniao_facto',
                ]),
            ],

            'tipo_documento' => [
                'sometimes',
                'nullable',
                Rule::in([
                    'passaporte',
                    'titulo_residencia',
                    'cartao_cidadao',
                ]),
            ],

            'numero_documento' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'documento_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'carta_numero' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'carta_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'registo_criminal_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'nif' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
                Rule::unique('motoristas', 'nif')
                    ->ignore($id)
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:255',
            ],

            'telemovel' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
            ],

            'endereco' => ['sometimes', 'nullable', 'string'],
            'endereco_rua' => ['sometimes', 'nullable', 'string'],
            'endereco_numero' => ['sometimes', 'nullable', 'string'],
            'endereco_complemento' => ['sometimes', 'nullable', 'string'],
            'endereco_cidade' => ['sometimes', 'nullable', 'string'],
            'endereco_cep' => ['sometimes', 'nullable', 'string'],

            'iban' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'foto_perfil_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:2048',
            ],

            'fotos_galeria' => ['sometimes', 'array'],
            'fotos_galeria.*' => ['string', 'max:2048'],

            'bolt_email' => [
                'sometimes',
                'nullable',
                'email',
                'max:255',
            ],

            'bolt_telemovel' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'uber_email' => [
                'sometimes',
                'nullable',
                'email',
                'max:255',
            ],

            'uber_telemovel' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'certificado_tvde' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'certificado_tvde_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'cartao_frota' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'contato_urgencia_nome' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'contato_urgencia_telemovel' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'documentos_upload' => ['sometimes', 'array'],

            'documentos_upload.*.url' => [
                'required',
                'string',
                'max:2048',
            ],

            'documentos_upload.*.tipo' => [
                'required',
                'string',
                'max:255',
            ],

            'documentos_upload.*.nome_arquivo' => [
                'required',
                'string',
                'max:255',
            ],

            'documentos_upload.*.data_validade' => [
                'nullable',
                'date',
            ],
        ];
    }
}
