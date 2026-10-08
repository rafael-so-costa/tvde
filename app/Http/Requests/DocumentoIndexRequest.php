<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DocumentoIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q'=>['nullable','string','max:200'],
            'codigo'=>['nullable','string','max:32'],
            'origem'=>['nullable',Rule::in(['gerado','anexado'])],
            'categoria'=>['nullable','string','max:80'],
            'tipo'=>['nullable','string','max:100'],
            'status'=>['nullable','string','max:40'],
            'tenant_id'=>['nullable','uuid'],
            'empresa_id'=>['nullable','uuid'],
            'motorista_id'=>['nullable','uuid'],
            'proprietario_id'=>['nullable','uuid'],
            'veiculo_id'=>['nullable','uuid'],
            'data_inicio'=>['nullable','date'],
            'data_fim'=>['nullable','date','after_or_equal:data_inicio'],
            'per_page'=>['nullable','integer','min:10','max:100'],
        ];
    }
}
