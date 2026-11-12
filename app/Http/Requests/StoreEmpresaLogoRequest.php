<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmpresaLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'logo' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:4096',
                'dimensions:min_width=80,min_height=80,max_width=5000,max_height=5000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'logo.required' => 'Selecione um logótipo.',
            'logo.image' => 'O ficheiro deve ser uma imagem válida.',
            'logo.mimes' => 'Utilize JPG, PNG ou WebP.',
            'logo.max' => 'O logótipo não pode exceder 4 MB.',
            'logo.dimensions' => 'A imagem deve ter entre 80x80 e 5000x5000 píxeis.',
        ];
    }
}