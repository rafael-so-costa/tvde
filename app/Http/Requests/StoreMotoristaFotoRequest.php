<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMotoristaFotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'foto' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
                'dimensions:min_width=200,min_height=200,max_width=6000,max_height=6000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'foto.required' => 'Selecione uma fotografia do motorista.',

            'foto.image' => 'A fotografia deve ser uma imagem válida.',

            'foto.mimes' => 'A fotografia deve estar em JPG, PNG ou WebP.',

            'foto.max' => 'A fotografia não pode exceder 5 MB.',

            'foto.dimensions' => 'A fotografia deve ter entre 200x200 e 6000x6000 píxeis.',
        ];
    }
}
