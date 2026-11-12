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
                'before_or_equal:today',
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
                'max:9',
                new PortugueseNif,
                Rule::unique(
                    'motoristas',
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
                'max:255',
            ],

            'telemovel' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
                new InternationalPhone,
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

            'iban' => [
                'sometimes',
                'nullable',
                'string',
                'size:25',
                new PortugueseIban,
            ],

            'foto_perfil_url' => ['prohibited'],

            'fotos_galeria' => [
                'sometimes',
                'array',
            ],

            'fotos_galeria.*' => [
                'string',
                'max:2048',
            ],

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
                'max:20',
                new InternationalPhone,
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
                'max:20',
                new InternationalPhone,
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
                'max:20',
                new InternationalPhone,
            ],

            'documentos_upload' => [
                'sometimes',
                'array',
            ],

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

    protected function prepareForValidation(): void
    {
        $data = [];

        if ($this->has('nif')) {
            $data['nif'] =
                PortugueseDataNormalizer::nif(
                    $this->input('nif')
                );
        }

        foreach (
            [
                'email',
                'bolt_email',
                'uber_email',
            ] as $field
        ) {
            if ($this->has($field)) {
                $data[$field] =
                    PortugueseDataNormalizer::email(
                        $this->input($field)
                    );
            }
        }

        foreach (
            [
                'telemovel',
                'bolt_telemovel',
                'uber_telemovel',
                'contato_urgencia_telemovel',
            ] as $field
        ) {
            if ($this->has($field)) {
                $data[$field] =
                    PhoneNormalizer::toE164($this->input($field)) ?? $this->input($field);
            }
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
