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

class UpdateProprietarioRequest extends FormRequest
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

            'tipo' => [
                'sometimes',
                Rule::in([
                    'empresa',
                    'pessoa_fisica',
                ]),
            ],

            'nome_completo' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'nome_empresa' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'nif' => [
                'sometimes',
                'nullable',
                'string',
                'max:9',
                new PortugueseNif,
                Rule::unique(
                    'proprietarios',
                    'nif'
                )
                    ->ignore($id)
                    ->where(
                        fn ($query) => $query
                            ->where(
                                'tenant_id',
                                $tenantId
                            )
                    ),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:190',
            ],

            'telemovel' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
                new InternationalPhone,
            ],

            'data_nascimento' => [
                'sometimes',
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

            'iban' => [
                'sometimes',
                'nullable',
                'string',
                'size:25',
                new PortugueseIban,
            ],

            'certidao_permanente' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'certidao_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'certificado_tvde' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'certificado_tvde_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'capital_social' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'nome_gerente' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'endereco' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'endereco_rua' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'endereco_numero' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'endereco_complemento' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'endereco_cidade' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'endereco_cep' => [
                'sometimes',
                'nullable',
                'string',
                'max:8',
                new PortuguesePostalCode,
            ],

            'foto_perfil_url' => [
                'sometimes',
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
                'sometimes',
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
