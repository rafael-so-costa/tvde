<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMultaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id'=>['required','uuid'],
            'motorista_id'=>['nullable','uuid'],
            'numero_notificacao'=>['nullable','string','max:100'],
            'data_multa'=>['required','date','before_or_equal:today'],
            'tipo'=>[
                'required',
                Rule::in([
                    'excesso_velocidade',
                    'estacionamento',
                    'avanco_sinal',
                    'outro',
                ]),
            ],
            'valor'=>['required','numeric','min:0.01','max:99999999.99'],
            'status'=>[
                'required',
                Rule::in([
                    'pendente',
                    'paga',
                    'contestada',
                ]),
            ],
            'localizacao'=>['nullable','string','max:255'],
            'descricao'=>['nullable','string','max:5000'],
        ];
    }
}
