<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePerfilTemplateRequest extends FormRequest
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
            'ordem' => ['prohibited'],

            'nome' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('perfis_template', 'nome')
                    ->where(
                        fn ($query) => $query
                            ->where('tenant_id', $tenantId)
                    )
                    ->ignore(
                        $this->route('id')
                    ),
            ],

            'descricao' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('nome')) {
            $this->merge([
                'nome' => trim(
                    (string) $this->input('nome')
                ),
            ]);
        }
    }
}
