<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class ImportTemplateContratoRequest extends FormRequest
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
            'modelo_documento_saas_id' => [
                'prohibited',
            ],

            'modelo_documento_saas_versao_id' => [
                'prohibited',
            ],

            'modelo_documento_saas_versao' => [
                'prohibited',
            ],
            'arquivo_url' => ['prohibited'],
            'tipo_arquivo' => ['prohibited'],
            'conteudo_original' => ['prohibited'],
            'campos_detectados' => ['prohibited'],
            'campos_mapeados' => ['prohibited'],

            'nome' => [
                'required',
                'string',
                'max:255',
            ],

            'perfil_id' => [
                'nullable',
                'uuid',
                Rule::exists('perfis_template', 'id')
                    ->where(
                        fn($query) => $query
                            ->where('tenant_id', $tenantId)
                    ),
            ],

            'arquivo' => [
                'required',
                'file',
                'max:10240',
                function (
                    string $attribute,
                    mixed $value,
                    Closure $fail
                ): void {
                    if (!$value instanceof UploadedFile) {
                        return;
                    }

                    $extension = strtolower(
                        $value->getClientOriginalExtension()
                    );

                    if (
                        !in_array(
                            $extension,
                            ['pdf', 'docx', 'txt'],
                            true
                        )
                    ) {
                        $fail(
                            'Formato não suportado. Use PDF, DOCX ou TXT.'
                        );
                    }
                },
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
