<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHelpCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'=>['required','string','max:120',Rule::unique('help_categories','name')],
            'description'=>['nullable','string','max:500'],
            'position'=>['nullable','integer','min:0','max:65535'],
            'active'=>['required','boolean'],
        ];
    }
}
