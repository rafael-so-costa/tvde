<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProprietarioRequest extends FormRequest
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

            'tipo' => [
                'required',
                Rule::in(['empresa', 'pessoa_fisica']),
            ],

            'nome_completo' => [
                'nullable',
                'string',
                'max:255',
                'required_if:tipo,pessoa_fisica',
            ],

            'nome_empresa' => [
                'nullable',
                'string',
                'max:255',
                'required_if:tipo,empresa',
            ],

            'nif' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('proprietarios', 'nif')
                    ->where(fn ($query) => $query->where('tenant_id', $tenantId)),
            ],

            'email' => ['nullable', 'email', 'max:190'],
            'telemovel' => ['nullable', 'string', 'max:50'],

            'data_nascimento' => ['nullable', 'date'],
            'filhos' => ['sometimes', 'integer', 'min:0'],

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

            'numero_documento' => ['nullable', 'string', 'max:100'],
            'documento_valid_until' => ['nullable', 'date'],

            'iban' => ['nullable', 'string', 'max:50'],

            'certidao_permanente' => ['nullable', 'string', 'max:100'],
            'certidao_valid_until' => ['nullable', 'date'],

            'certificado_tvde' => ['nullable', 'string', 'max:100'],
            'certificado_tvde_valid_until' => ['nullable', 'date'],

            'capital_social' => ['nullable', 'numeric', 'min:0'],
            'nome_gerente' => ['nullable', 'string', 'max:255'],

            'endereco' => ['nullable', 'string'],
            'endereco_rua' => ['nullable', 'string'],
            'endereco_numero' => ['nullable', 'string'],
            'endereco_complemento' => ['nullable', 'string'],
            'endereco_cidade' => ['nullable', 'string'],
            'endereco_cep' => ['nullable', 'string'],

            'foto_perfil_url' => ['nullable', 'string', 'max:2048'],

            'fotos_galeria' => ['sometimes', 'array'],
            'fotos_galeria.*' => ['string', 'max:2048'],

            'cartao_frota' => ['nullable', 'string'],
        ];
    }
}
