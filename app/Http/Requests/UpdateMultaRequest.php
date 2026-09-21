<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMultaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'veiculo_id'=>['sometimes','required','uuid'],
            'motorista_id'=>['sometimes','nullable','uuid'],
            'numero_notificacao'=>['sometimes','nullable','string','max:100'],
            'data_multa'=>['sometimes','required','date','before_or_equal:today'],
            'tipo'=>[
                'sometimes',
                'required',
                Rule::in([
                    'excesso_velocidade',
                    'estacionamento',
                    'avanco_sinal',
                    'outro',
                ]),
            ],
            'valor'=>['sometimes','required','numeric','min:0.01','max:99999999.99'],
            'status'=>[
                'sometimes',
                'required',
                Rule::in([
                    'pendente',
                    'paga',
                    'contestada',
                ]),
            ],
            'localizacao'=>['sometimes','nullable','string','max:255'],
            'descricao'=>['sometimes','nullable','string','max:5000'],
        ];
    }
}
