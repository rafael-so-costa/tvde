<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveCompraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'itens'=>[
                'required',
                'array',
                'min:1',
                'max:500',
            ],

            'itens.*.item_id'=>[
                'required',
                'uuid',
            ],

            'itens.*.quantidade'=>[
                'required',
                'numeric',
                'gt:0',
                'max:999999999',
            ],
        ];
    }
}
