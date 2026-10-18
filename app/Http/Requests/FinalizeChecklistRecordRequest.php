<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;

class FinalizeChecklistRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assinatura_empresa'=>
                $this->signatureRules(),

            'assinatura_motorista'=>
                $this->signatureRules(),

            'signatario_empresa_nome'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'signatario_motorista_nome'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'assinatura_empresa_path'=>[
                'prohibited',
            ],

            'assinatura_motorista_path'=>[
                'prohibited',
            ],

            'tenant_id'=>[
                'prohibited',
            ],

            'estado'=>[
                'prohibited',
            ],

            'finalizado_em'=>[
                'prohibited',
            ],

            'realizado_por'=>[
                'prohibited',
            ],

            'pdf_url'=>[
                'prohibited',
            ],

            'hash_documento'=>[
                'prohibited',
            ],
        ];
    }

    private function signatureRules(): array
    {
        return [
            'required',
            'string',
            'max:1500000',

            function(
                string $attribute,
                mixed $value,
                Closure $fail
            ):void{
                if(!is_string($value)){
                    return;
                }

                $prefix=
                    'data:image/png;base64,';

                if(
                    !str_starts_with(
                        $value,
                        $prefix
                    )
                ){
                    $fail(
                        'A assinatura deve ser uma imagem PNG válida.'
                    );

                    return;
                }

                $binary=
                    base64_decode(
                        substr(
                            $value,
                            strlen($prefix)
                        ),
                        true
                    );

                if(
                    $binary===false ||
                    !str_starts_with(
                        $binary,
                        "\x89PNG\r\n\x1a\n"
                    )
                ){
                    $fail(
                        'A assinatura deve ser uma imagem PNG válida.'
                    );

                    return;
                }

                if(
                    strlen($binary)>
                    1024*1024
                ){
                    $fail(
                        'A assinatura não pode exceder 1 MB.'
                    );
                }
            },
        ];
    }
}