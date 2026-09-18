<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class PreviewTemplateImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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
}
