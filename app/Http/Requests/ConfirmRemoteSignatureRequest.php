<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmRemoteSignatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_otp' => [
                'required',
                'string',
                'regex:/^\d{6}$/',
            ],
            'aceite' => [
                'required',
                'accepted',
            ],
            'assinatura' => [
                'required',
                'string',
                'max:1500000',
                function (
                    string $attribute,
                    mixed $value,
                    Closure $fail
                ): void {
                    if (!is_string($value)) {
                        return;
                    }

                    $prefix =
                        'data:image/png;base64,';

                    if (
                        !str_starts_with(
                            $value,
                            $prefix
                        )
                    ) {
                        $fail(
                            'A assinatura deve ser uma imagem PNG válida.'
                        );

                        return;
                    }

                    $binary = base64_decode(
                        substr(
                            $value,
                            strlen($prefix)
                        ),
                        true
                    );

                    if (
                        $binary === false ||
                        !str_starts_with(
                            $binary,
                            "\x89PNG\r\n\x1a\n"
                        )
                    ) {
                        $fail(
                            'A assinatura deve ser uma imagem PNG válida.'
                        );

                        return;
                    }

                    if (
                        strlen($binary) >
                        1024 * 1024
                    ) {
                        $fail(
                            'A assinatura não pode exceder 1 MB.'
                        );
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo_otp.regex' =>
                'O código OTP deve possuir 6 dígitos.',
            'aceite.accepted' =>
                'É necessário aceitar os termos antes de assinar.',
        ];
    }
}
