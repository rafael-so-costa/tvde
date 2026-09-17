<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMotoristaRequest extends FormRequest
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
            'user_id' => ['prohibited'],
            'ativo' => ['prohibited'],
            'status_cadastro' => ['prohibited'],

            'nome_completo' => ['required', 'string', 'max:255'],

            'data_nascimento' => ['nullable', 'date'],
            'filhos' => ['nullable', 'integer', 'min:0'],

            'estado_civil' => [
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
                'nullable',
                Rule::in([
                    'passaporte',
                    'titulo_residencia',
                    'cartao_cidadao',
                ]),
            ],

            'numero_documento' => [
                'nullable',
                'string',
                'max:100',
            ],

            'documento_valid_until' => ['nullable', 'date'],

            'carta_numero' => [
                'nullable',
                'string',
                'max:100',
            ],

            'carta_valid_until' => ['nullable', 'date'],
            'registo_criminal_valid_until' => ['nullable', 'date'],

            'nif' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('motoristas', 'nif')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'telemovel' => [
                'nullable',
                'string',
                'max:20',
            ],

            'endereco' => ['nullable', 'string'],
            'endereco_rua' => ['nullable', 'string'],
            'endereco_numero' => ['nullable', 'string'],
            'endereco_complemento' => ['nullable', 'string'],
            'endereco_cidade' => ['nullable', 'string'],
            'endereco_cep' => ['nullable', 'string'],

            'iban' => [
                'nullable',
                'string',
                'max:50',
            ],

            'foto_perfil_url' => [
                'nullable',
                'string',
                'max:2048',
            ],

            'fotos_galeria' => ['sometimes', 'array'],
            'fotos_galeria.*' => ['string', 'max:2048'],

            'bolt_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'bolt_telemovel' => [
                'nullable',
                'string',
                'max:50',
            ],

            'uber_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'uber_telemovel' => [
                'nullable',
                'string',
                'max:50',
            ],

            'certificado_tvde' => [
                'nullable',
                'string',
                'max:255',
            ],

            'certificado_tvde_valid_until' => [
                'nullable',
                'date',
            ],

            'cartao_frota' => [
                'nullable',
                'string',
                'max:255',
            ],

            'contato_urgencia_nome' => [
                'nullable',
                'string',
                'max:255',
            ],

            'contato_urgencia_telemovel' => [
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
