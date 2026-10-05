<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body'=>['nullable','string','max:50000'],
            'attachments'=>['nullable','array','max:5'],
            'attachments.*'=>[
                'file','mimes:jpg,jpeg,png,webp,pdf','max:20480',
            ],
        ];
    }
}
