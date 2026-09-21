<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CorrectRegistoExpedienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data_hora'=>['required','date'],
            'observacoes_correcao'=>['nullable','string','max:2000'],
        ];
    }
}
