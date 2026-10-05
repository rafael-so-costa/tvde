<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChatConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'=>['required',Rule::in(['direct','broadcast'])],
            'subject'=>['required','string','max:255'],
            'audience'=>['nullable',Rule::in([
                'all','managers','employees','drivers','owners','selected',
            ])],
            'recipient_ids'=>['nullable','array','max:5000'],
            'recipient_ids.*'=>['uuid','distinct'],
            'body'=>['nullable','string','max:50000'],
            'attachments'=>['nullable','array','max:5'],
            'attachments.*'=>[
                'file','mimes:jpg,jpeg,png,webp,pdf','max:20480',
            ],
            'tenant_id'=>['prohibited'],
            'source'=>['prohibited'],
            'created_by_user_id'=>['prohibited'],
            'reply_enabled'=>['prohibited'],
            'status'=>['prohibited'],
        ];
    }
}
