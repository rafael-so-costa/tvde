<?php

namespace App\Http\Requests;

use App\Rules\PortugueseNif;
use App\Rules\PortuguesePhone;
use App\Services\TenantContext;
use App\Support\PortugueseDataNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFuncionarioRequest extends FormRequest
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
            'numero_funcionario' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique(
                    'funcionarios',
                    'numero_funcionario'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'nome' => [
                'required',
                'string',
                'max:255',
            ],

            'nif' => [
                'nullable',
                'string',
                'max:9',
                new PortugueseNif,
                Rule::unique(
                    'funcionarios',
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
                Rule::unique(
                    'funcionarios',
                    'email'
                )->where(
                    fn ($query) => $query
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'telefone' => [
                'nullable',
                'string',
                'max:20',
                new PortuguesePhone,
            ],

            'data_nascimento' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'cargo' => [
                'nullable',
                'string',
                'max:150',
            ],

            'departamento' => [
                'nullable',
                'string',
                'max:150',
            ],

            'data_admissao' => [
                'nullable',
                'date',
            ],

            'observacoes' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'id' => ['prohibited'],
            'tenant_id' => ['prohibited'],
            'user_id' => ['prohibited'],
            'estado' => ['prohibited'],
            'data_saida' => ['prohibited'],
            'created_by' => ['prohibited'],
            'updated_by' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'O nome do funcionário é obrigatório.',

            'email.email' => 'Informe um endereço de e-mail válido.',

            'data_nascimento.date' => 'Informe uma data de nascimento válida.',

            'data_nascimento.before_or_equal' => 'A data de nascimento não pode ser futura.',

            'data_admissao.date' => 'Informe uma data de admissão válida.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('nif')) {
            $merge['nif'] =
                PortugueseDataNormalizer::nif(
                    $this->input('nif')
                );
        }

        if ($this->has('email')) {
            $merge['email'] =
                PortugueseDataNormalizer::email(
                    $this->input('email')
                );
        }

        if ($this->has('telefone')) {
            $merge['telefone'] =
                PortugueseDataNormalizer::phone(
                    $this->input('telefone')
                );
        }

        if ($this->has('numero_funcionario')) {
            $value = trim(
                (string) $this->input(
                    'numero_funcionario'
                )
            );

            $merge['numero_funcionario'] =
                $value === ''
                    ? null
                    : $value;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }
}
