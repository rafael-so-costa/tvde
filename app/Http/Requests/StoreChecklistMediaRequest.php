<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreChecklistMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id'=>['prohibited'],
            'checklist_record_id'=>['prohibited'],
            'tipo'=>['prohibited'],
            'arquivo_nome'=>['prohibited'],
            'arquivo_path'=>['prohibited'],
            'arquivo_mime'=>['prohibited'],
            'arquivo_tamanho'=>['prohibited'],
            'hash_arquivo'=>['prohibited'],
            'uploaded_by'=>['prohibited'],

            'arquivo'=>[
                'required',
                'file',
                'max:102400',
            ],

            'contexto'=>[
                'nullable',
                'string',
                'max:60',
            ],

            'titulo'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'capturado_em'=>[
                'nullable',
                'date',
            ],

            'metadados'=>[
                'nullable',
                'array',
            ],

            'metadados.parte_id'=>[
                'nullable',
                'string',
                'max:100',
            ],

            'metadados.parte_nome'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'metadados.vista'=>[
                'nullable',
                'string',
                'max:100',
            ],

            'metadados.dano_tipo'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ];
    }
}