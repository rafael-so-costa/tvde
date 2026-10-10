<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PreviewTemplateTextRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'conteudo' => [
                'required',
                'string',
                'min:10',
                'max:250000',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (
            $this->has(
                'conteudo'
            )
        ) {
            $this->merge([
                'conteudo' =>
                    trim(
                        str_replace(
                            [
                                "\r\n",
                                "\r",
                            ],
                            "\n",
                            (string)$this->input(
                                'conteudo'
                            )
                        )
                    ),
            ]);
        }
    }
}
