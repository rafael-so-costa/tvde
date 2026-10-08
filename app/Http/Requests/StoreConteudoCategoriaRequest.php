<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreConteudoCategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome'=>['required','string','max:150'],
            'slug'=>['nullable','string','max:150'],
            'descricao'=>['nullable','string','max:1000'],
            'ativo'=>['sometimes','boolean'],
            'ordem'=>['sometimes','integer','min:0'],
        ];
    }
}
