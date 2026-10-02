<?php

namespace App\Http\Requests;

use App\Models\TvdeImport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBackofficeTvdeImportsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source' => [
                'nullable',
                Rule::in([
                    TvdeImport::SOURCE_IMT,
                    TvdeImport::SOURCE_RAM,
                ]),
            ],

            'status' => [
                'nullable',
                Rule::in([
                    TvdeImport::STATUS_PROCESSING,
                    TvdeImport::STATUS_COMPLETED,
                    TvdeImport::STATUS_FAILED,
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
