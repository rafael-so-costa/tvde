<?php

namespace App\Http\Requests;

use App\Rules\PortugueseRegistrationPlate;
use App\Rules\Vin;
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
                new PortugueseRegistrationPlate,
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
                'before_or_equal:today',
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
                'size:17',
                new Vin,
                Rule::unique('veiculos', 'chassi')
                    ->ignore($id)
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
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

            'fotos_galeria' => [
                'sometimes',
                'array',
            ],

            'fotos_galeria.*' => [
                'string',
                'max:2048',
            ],

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
        $merge = [];

        if ($this->has('matricula')) {
            $merge['matricula'] = $this->normalizarMatricula(
                $this->input('matricula')
            );
        }

        if ($this->has('chassi')) {
            $merge['chassi'] = $this->normalizarVin(
                $this->input('chassi')
            );
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    private function normalizarMatricula(mixed $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $compact = preg_replace(
            '/[^A-Z0-9]/',
            '',
            mb_strtoupper($value)
        );

        if (strlen($compact) !== 6) {
            return mb_strtoupper($value);
        }

        return substr($compact, 0, 2)
            .'-'
            .substr($compact, 2, 2)
            .'-'
            .substr($compact, 4, 2);
    }

    private function normalizarVin(mixed $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        return preg_replace(
            '/[\s-]+/',
            '',
            mb_strtoupper($value)
        );
    }
}
