<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVeiculoRequest extends FormRequest
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
            'ativo' => ['prohibited'],
            'status_cadastro' => ['prohibited'],

            'matricula' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('veiculos', 'matricula')
                    ->ignore($id)
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'proprietario_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('proprietarios', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'data_matricula' => [
                'sometimes',
                'nullable',
                'date',
            ],
            'marca' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],
            'modelo' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],
            'chassi' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],
            'cilindrada' => [
                'sometimes',
                'nullable',
                'integer',
                'min:0',
            ],
            'potencia' => [
                'sometimes',
                'nullable',
                'integer',
                'min:0',
            ],
            'combustivel' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],
            'lugares' => [
                'sometimes',
                'nullable',
                'integer',
                'min:1',
                'max:99',
            ],
            'portas' => [
                'sometimes',
                'nullable',
                'integer',
                'min:1',
                'max:20',
            ],
            'cor' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'carta_verde' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],
            'carta_verde_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'inspecao_tvde' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],
            'inspecao_tvde_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'uber_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],
            'bolt_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],
            'extintor_valid_until' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'foto_principal_url' => [
                'sometimes',
                'nullable',
                'string',
                'max:2048',
            ],

            'fotos_galeria' => ['sometimes', 'array'],
            'fotos_galeria.*' => ['string', 'max:2048'],

            'valor_caucao' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'valor_aluguel' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'via_verde' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('matricula')) {
            $this->merge([
                'matricula' => mb_strtoupper(
                    trim((string) $this->input('matricula'))
                ),
            ]);
        }
    }
}
