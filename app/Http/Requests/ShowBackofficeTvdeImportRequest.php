<?php

namespace App\Http\Requests;

use App\Models\TvdeImportChange;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShowBackofficeTvdeImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'change_type' => [
                'nullable',
                Rule::in([
                    TvdeImportChange::TYPE_CREATED,
                    TvdeImportChange::TYPE_UPDATED,
                    TvdeImportChange::TYPE_REMOVED,
                    TvdeImportChange::TYPE_RESTORED,
                ]),
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:10',
                'max:100',
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ];
    }
}
