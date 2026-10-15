<?php

namespace App\Http\Requests;

use App\Rules\PortugueseIban;
use App\Rules\PortugueseNif;
use App\Rules\PortuguesePhone;
use App\Rules\PortuguesePostalCode;
use App\Services\TenantContext;
use App\Support\PortugueseDataNormalizer;
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

            'nome_completo' => [
                'required',
                'string',
                'max:255',
            ],

            'data_nascimento' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'filhos' => [
                'nullable',
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

            'carta_numero' => [
                'nullable',
                'string',
                'max:100',
            ],

            'carta_valid_until' => [
                'nullable',
                'date',
            ],

            'registo_criminal_valid_until' => [
                'nullable',
                'date',
            ],

            'nif' => [
                'nullable',
                'string',
                'max:9',
                new PortugueseNif,
                Rule::unique(
                    'motoristas',
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
                'max:255',
            ],

            'telemovel' => [
                'nullable',
                'string',
                'max:20',
                new PortuguesePhone,
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

            'iban' => [
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
                'nullable',
                'email',
                'max:255',
            ],

            'bolt_telemovel' => [
                'nullable',
                'string',
                'max:20',
                new PortuguesePhone,
            ],

            'uber_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'uber_telemovel' => [
                'nullable',
                'string',
                'max:20',
                new PortuguesePhone,
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
                'max:20',
                new PortuguesePhone,
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

        foreach (
            [
                'nif',
            ] as $field
        ) {
            if ($this->has($field)) {
                $data[$field] =
                    PortugueseDataNormalizer::nif(
                        $this->input($field)
                    );
            }
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
                    PortugueseDataNormalizer::phone(
                        $this->input($field)
                    );
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
