<?php

namespace App\Http\Requests;

use App\Rules\PortugueseIban;
use App\Rules\PortugueseNif;
use App\Rules\InternationalPhone;
use App\Rules\PortuguesePostalCode;
use App\Services\TenantContext;
use App\Support\PortugueseDataNormalizer;
use App\Support\PhoneNormalizer;
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
                Rule::in([
                    'empresa',
                    'pessoa_fisica',
                ]),
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
                'max:9',
                new PortugueseNif,
                Rule::unique(
                    'proprietarios',
                    'nif'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'email' => [
                'nullable',
                'email',
                'max:190',
            ],

            'telemovel' => [
                'nullable',
                'string',
                'max:20',
                new InternationalPhone,
            ],

            'data_nascimento' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'filhos' => [
                'sometimes',
                'integer',
                'min:0',
            ],

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

            'documento_valid_until' => [
                'nullable',
                'date',
            ],

            'iban' => [
                'nullable',
                'string',
                'size:25',
                new PortugueseIban,
            ],

            'certidao_permanente' => [
                'nullable',
                'string',
                'max:100',
            ],

            'certidao_valid_until' => [
                'nullable',
                'date',
            ],

            'certificado_tvde' => [
                'nullable',
                'string',
                'max:100',
            ],

            'certificado_tvde_valid_until' => [
                'nullable',
                'date',
            ],

            'capital_social' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'nome_gerente' => [
                'nullable',
                'string',
                'max:255',
            ],

            'endereco' => [
                'nullable',
                'string',
            ],

            'endereco_rua' => [
                'nullable',
                'string',
            ],

            'endereco_numero' => [
                'nullable',
                'string',
            ],

            'endereco_complemento' => [
                'nullable',
                'string',
            ],

            'endereco_cidade' => [
                'nullable',
                'string',
            ],

            'endereco_cep' => [
                'nullable',
                'string',
                'max:8',
                new PortuguesePostalCode,
            ],

            'foto_perfil_url' => [
                'nullable',
                'string',
                'max:2048',
            ],

            'fotos_galeria' => [
                'sometimes',
                'array',
            ],

            'fotos_galeria.*' => [
                'string',
                'max:2048',
            ],

            'cartao_frota' => [
                'nullable',
                'string',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $data = [];

        if ($this->has('nif')) {
            $data['nif'] =
                PortugueseDataNormalizer::nif(
                    $this->input('nif')
                );
        }

        if ($this->has('email')) {
            $data['email'] =
                PortugueseDataNormalizer::email(
                    $this->input('email')
                );
        }

        if ($this->has('telemovel')) {
            $data['telemovel'] =
                PhoneNormalizer::toE164($this->input('telemovel')) ?? $this->input('telemovel');
        }

        if ($this->has('endereco_cep')) {
            $data['endereco_cep'] =
                PortugueseDataNormalizer::postalCode(
                    $this->input('endereco_cep')
                );
        }

        if ($this->has('iban')) {
            $data['iban'] =
                PortugueseDataNormalizer::iban(
                    $this->input('iban')
                );
        }

        if ($data !== []) {
            $this->merge($data);
        }
    }
}
