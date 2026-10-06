<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHelpCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'=>[
                'sometimes','string','max:120',
                Rule::unique('help_categories','name')->ignore($this->route('id')),
            ],
            'description'=>['sometimes','nullable','string','max:500'],
            'position'=>['sometimes','integer','min:0','max:65535'],
            'active'=>['sometimes','boolean'],
        ];
    }
}
