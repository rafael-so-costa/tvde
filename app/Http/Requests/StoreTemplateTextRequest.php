<?php

namespace App\Http\Requests;

use App\Services\TemplateSourceCatalog;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTemplateTextRequest extends FormRequest
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

            'arquivo_url' => [
                'prohibited',
            ],

            'tipo_arquivo' => [
                'prohibited',
            ],

            'nome' => [
                'required',
                'string',
                'max:255',
            ],

            'perfil_id' => [
                'nullable',
                'uuid',

                Rule::exists(
                    'perfis_template',
                    'id'
                )->where(
                    fn($query) =>
                        $query->where(
                            'tenant_id',
                            $tenantId
                        )
                ),
            ],

            'conteudo' => [
                'required',
                'string',
                'min:10',
                'max:250000',
            ],

            'campos_mapeados' => [
                'sometimes',
                'array',
            ],

            'campos_mapeados.*' => [
                'array:tipo,origem,campo',
            ],

            'campos_mapeados.*.tipo' => [
                'sometimes',
                'required',

                Rule::in([
                    'automatico',
                    'manual',
                    'calculado',
                    'assinatura',
                ]),
            ],

            'campos_mapeados.*.origem' => [
                'sometimes',
                'nullable',

                Rule::in([
                    'empresa',
                    'motorista',
                    'proprietario',
                    'veiculo',
                    'contrato',
                    'assinatura',
                ]),
            ],

            'campos_mapeados.*.campo' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9_.]+$/',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $data = $this->all();

        if (
            array_key_exists(
                'nome',
                $data
            )
        ) {
            $data['nome'] = trim(
                (string)$data[
                    'nome'
                ]
            );
        }

        if (
            array_key_exists(
                'conteudo',
                $data
            )
        ) {
            $data['conteudo'] = trim(
                str_replace(
                    [
                        "\r\n",
                        "\r",
                    ],
                    "\n",
                    (string)$data[
                        'conteudo'
                    ]
                )
            );
        }

        if (
            isset(
                $data[
                    'campos_mapeados'
                ]
            ) &&
            is_array(
                $data[
                    'campos_mapeados'
                ]
            )
        ) {
            $normalized = [];

            foreach (
                $data[
                    'campos_mapeados'
                ] as
                $field => $mapping
            ) {
                $field =
                    mb_strtoupper(
                        trim(
                            (string)$field
                        )
                    );

                if (
                    !is_array(
                        $mapping
                    )
                ) {
                    $normalized[
                        $field
                    ] = $mapping;

                    continue;
                }

                if (
                    isset(
                        $mapping[
                            'tipo'
                        ]
                    )
                ) {
                    $mapping[
                        'tipo'
                    ] = strtolower(
                        trim(
                            (string)$mapping[
                                'tipo'
                            ]
                        )
                    );
                }

                if (
                    array_key_exists(
                        'origem',
                        $mapping
                    ) &&
                    $mapping[
                        'origem'
                    ] !== null
                ) {
                    $mapping[
                        'origem'
                    ] = strtolower(
                        trim(
                            (string)$mapping[
                                'origem'
                            ]
                        )
                    );

                    if (
                        $mapping[
                            'origem'
                        ] === ''
                    ) {
                        $mapping[
                            'origem'
                        ] = null;
                    }
                }

                if (
                    array_key_exists(
                        'campo',
                        $mapping
                    ) &&
                    $mapping[
                        'campo'
                    ] !== null
                ) {
                    $mapping[
                        'campo'
                    ] = strtolower(
                        trim(
                            (string)$mapping[
                                'campo'
                            ]
                        )
                    );

                    if (
                        $mapping[
                            'campo'
                        ] === ''
                    ) {
                        $mapping[
                            'campo'
                        ] = null;
                    }
                }

                $normalized[
                    $field
                ] = $mapping;
            }

            $data[
                'campos_mapeados'
            ] = $normalized;
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
                $catalog =
                    app(
                        TemplateSourceCatalog::class
                    );

                foreach (
                    (array)$this->input(
                        'campos_mapeados',
                        []
                    ) as
                    $field => $mapping
                ) {
                    if (
                        !is_array(
                            $mapping
                        )
                    ) {
                        continue;
                    }

                    $type =
                        $mapping[
                            'tipo'
                        ] ?? null;

                    $origin =
                        $mapping[
                            'origem'
                        ] ?? null;

                    $source =
                        $mapping[
                            'campo'
                        ] ?? null;

                    if (
                        $type ===
                        'manual'
                    ) {
                        if (
                            $origin !==
                                null ||
                            $source !==
                                null
                        ) {
                            $validator
                                ->errors()
                                ->add(
                                    "campos_mapeados.{$field}",
                                    'Campos manuais não devem possuir origem automática.'
                                );
                        }

                        continue;
                    }

                    if (
                        blank(
                            $origin
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "campos_mapeados.{$field}.origem",
                                'Selecione a origem do campo.'
                            );

                        continue;
                    }

                    if (
                        blank(
                            $source
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "campos_mapeados.{$field}.campo",
                                'Selecione o campo de origem.'
                            );

                        continue;
                    }

                    if (
                        !$catalog
                            ->allowed(
                                $origin,
                                $source
                            )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "campos_mapeados.{$field}.campo",
                                'O campo de origem selecionado não é permitido.'
                            );
                    }

                    if (
                        $type ===
                            'assinatura' &&
                        $origin !==
                            'assinatura'
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "campos_mapeados.{$field}.origem",
                                'Campos de assinatura devem utilizar a origem Assinatura.'
                            );
                    }

                    if (
                        $origin ===
                            'assinatura' &&
                        $type !==
                            'assinatura'
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "campos_mapeados.{$field}.tipo",
                                'A origem Assinatura só pode ser usada em campos do tipo assinatura.'
                            );
                    }
                }
            }
        );
    }
}
