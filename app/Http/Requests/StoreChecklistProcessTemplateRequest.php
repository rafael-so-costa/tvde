<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChecklistProcessTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(
            TenantContext::class
        )->requireId();

        return [
            'tenant_id' => [
                'prohibited',
            ],

            'versao' => [
                'prohibited',
            ],

            'codigo' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique(
                    'checklist_process_templates',
                    'codigo'
                )->where(
                    fn($query) =>
                    $query->where(
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

            'descricao' => [
                'nullable',
                'string',
            ],

            'ativo' => [
                'sometimes',
                'boolean',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.codigo' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
                'distinct',
            ],

            'items.*.ordem' => [
                'required',
                'integer',
                'min:0',
            ],

            'items.*.titulo' => [
                'required',
                'string',
                'max:255',
            ],

            'items.*.descricao' => [
                'nullable',
                'string',
            ],

            'items.*.tipo' => [
                'required',
                Rule::in([
                    'tarefa',
                    'preenchimento',
                    'assinatura',
                    'upload',
                    'aprovacao',
                    'gerar_documento',
                    'checklist_veiculo',
                    'validacao',
                ]),
            ],

            'items.*.obrigatorio' => [
                'required',
                'boolean',
            ],

            'items.*.configuracao' => [
                'sometimes',
                'array',
            ],
            'items.*.configuracao.placeholder' => [
                'nullable',
                'string',
                Rule::in([
                    'ASSINATURA_MOTORISTA',
                    'ASSINATURA_PROPRIETARIO',
                    'ASSINATURA_EMPRESA',
                    'ASSINATURA_TESTEMUNHA',
                ]),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $data = $this->all();

        if (
            array_key_exists(
                'codigo',
                $data
            )
        ) {
            $data['codigo'] =
                strtolower(
                    trim(
                        (string)
                        $data['codigo']
                    )
                );
        }

        if (
            array_key_exists(
                'nome',
                $data
            )
        ) {
            $data['nome'] =
                trim(
                    (string)
                    $data['nome']
                );
        }

        if (
            isset($data['items']) &&
            is_array(
                $data['items']
            )
        ) {
            foreach (
                $data['items']
                as $index => $item
            ) {
                if (
                    isset(
                        $item['codigo']
                    )
                ) {
                    $data['items'][$index]['codigo'] =
                        strtolower(
                            trim(
                                (string)
                                $item['codigo']
                            )
                        );
                }

                if (
                    isset(
                        $item['titulo']
                    )
                ) {
                    $data['items'][$index]['titulo'] =
                        trim(
                            (string)
                            $item['titulo']
                        );
                }
            }
        }

        $this->replace(
            $data
        );
    }

    public function withValidator(
        $validator
    ): void {
        $validator->after(
            function (
                $validator
            ): void {
                foreach (
                    (array)
                    $this->input(
                        'items',
                        []
                    )
                    as $index =>
                    $item
                ) {
                    if (
                        ($item['tipo'] ?? null) !==
                        'assinatura'
                    ) {
                        continue;
                    }

                    $placeholder =
                        data_get(
                            $item,
                            'configuracao.placeholder'
                        );

                    if (
                        blank(
                            $placeholder
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.configuracao.placeholder",
                                'Etapas de assinatura precisam indicar o placeholder da assinatura.'
                            );
                    }
                }
            }
        );
    }
}
