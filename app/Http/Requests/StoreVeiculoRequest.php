<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVeiculoRequest extends FormRequest
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
            'ativo' => ['prohibited'],
            'status_cadastro' => ['prohibited'],

            'matricula' => [
                'required',
                'string',
                'max:20',
                Rule::unique('veiculos', 'matricula')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'proprietario_id' => [
                'nullable',
                'uuid',
                Rule::exists('proprietarios', 'id')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'data_matricula' => ['nullable', 'date'],
            'marca' => ['required', 'string', 'max:100'],
            'modelo' => ['required', 'string', 'max:100'],
            'chassi' => ['nullable', 'string', 'max:100'],
            'cilindrada' => ['nullable', 'integer', 'min:0'],
            'potencia' => ['nullable', 'integer', 'min:0'],
            'combustivel' => ['nullable', 'string', 'max:50'],
            'lugares' => ['nullable', 'integer', 'min:1', 'max:99'],
            'portas' => ['nullable', 'integer', 'min:1', 'max:20'],
            'cor' => ['nullable', 'string', 'max:50'],

            'carta_verde' => ['nullable', 'string', 'max:100'],
            'carta_verde_valid_until' => ['nullable', 'date'],

            'inspecao_tvde' => ['nullable', 'string', 'max:100'],
            'inspecao_tvde_valid_until' => ['nullable', 'date'],

            'uber_valid_until' => ['nullable', 'date'],
            'bolt_valid_until' => ['nullable', 'date'],
            'extintor_valid_until' => ['nullable', 'date'],

            'foto_principal_url' => [
                'nullable',
                'string',
                'max:2048',
            ],

            'fotos_galeria' => ['sometimes', 'array'],
            'fotos_galeria.*' => ['string', 'max:2048'],

            'valor_caucao' => ['nullable', 'numeric', 'min:0'],
            'valor_aluguel' => ['nullable', 'numeric', 'min:0'],

            'via_verde' => ['nullable', 'string'],
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
