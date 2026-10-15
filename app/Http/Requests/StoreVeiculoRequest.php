<?php

namespace App\Http\Requests;

use App\Rules\PortugueseRegistrationPlate;
use App\Rules\Vin;
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
                new PortugueseRegistrationPlate,
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

            'data_matricula' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'marca' => [
                'required',
                'string',
                'max:100',
            ],

            'modelo' => [
                'required',
                'string',
                'max:100',
            ],

            'chassi' => [
                'nullable',
                'string',
                'size:17',
                new Vin,
                Rule::unique('veiculos', 'chassi')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'cilindrada' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'potencia' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'combustivel' => [
                'nullable',
                'string',
                'max:50',
            ],

            'lugares' => [
                'nullable',
                'integer',
                'min:1',
                'max:99',
            ],

            'portas' => [
                'nullable',
                'integer',
                'min:1',
                'max:20',
            ],

            'cor' => [
                'nullable',
                'string',
                'max:50',
            ],

            'carta_verde' => [
                'nullable',
                'string',
                'max:100',
            ],

            'carta_verde_valid_until' => [
                'nullable',
                'date',
            ],

            'inspecao_tvde' => [
                'nullable',
                'string',
                'max:100',
            ],

            'inspecao_tvde_valid_until' => [
                'nullable',
                'date',
            ],

            'uber_valid_until' => [
                'nullable',
                'date',
            ],

            'bolt_valid_until' => [
                'nullable',
                'date',
            ],

            'extintor_valid_until' => [
                'nullable',
                'date',
            ],

            'foto_principal_url' => [
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
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_aluguel' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'via_verde' => [
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
