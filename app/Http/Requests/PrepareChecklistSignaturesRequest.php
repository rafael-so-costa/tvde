<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PrepareChecklistSignaturesRequest extends FormRequest
{
    public function authorize():bool
    {
        return true;
    }

    public function rules():array
    {
        return [
            'empresa'=>[
                'required',
                'array',
            ],

            'empresa.modo'=>[
                'required',
                Rule::in([
                    'presencial',
                    'remota',
                ]),
            ],

            'empresa.nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'empresa.email'=>[
                'nullable',
                'email',
                'max:190',
                'required_if:empresa.modo,remota',
            ],

            'empresa.assinatura'=>
                $this->signatureRules(
                    'empresa.modo'
                ),

            'motorista'=>[
                'required',
                'array',
            ],

            'motorista.modo'=>[
                'required',
                Rule::in([
                    'presencial',
                    'remota',
                ]),
            ],

            'motorista.nome'=>[
                'required',
                'string',
                'max:255',
            ],

            'motorista.email'=>[
                'nullable',
                'email',
                'max:190',
                'required_if:motorista.modo,remota',
            ],

            'motorista.assinatura'=>
                $this->signatureRules(
                    'motorista.modo'
                ),
        ];
    }

    private function signatureRules(
        string $modeField
    ):array{
        return[
            'nullable',
            'string',
            'max:1500000',

            function(
                string $attribute,
                mixed $value,
                Closure $fail
            ) use(
                $modeField
            ):void{
                if(
                    data_get(
                        $this->all(),
                        $modeField
                    )!=='presencial'
                ){
                    return;
                }

                if(
                    !is_string($value) ||
                    $value===''
                ){
                    $fail(
                        'A assinatura presencial é obrigatória.'
                    );

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