<?php

namespace App\Http\Requests;

use App\Models\NifEnrichment;
use App\Models\TvdeImport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBackofficeTvdeOperatorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'search' => $this->filled('search')
                ? trim((string) $this->input('search'))
                : null,

            'district' => $this->filled('district')
                ? trim((string) $this->input('district'))
                : null,

            'municipality' => $this->filled('municipality')
                ? trim((string) $this->input('municipality'))
                : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'search' => [
                'nullable',
                'string',
                'max:150',
            ],

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
                    'active',
                    'inactive',
                ]),
            ],

            'customer' => [
                'nullable',
                Rule::in([
                    'yes',
                    'no',
                ]),
            ],

            'enrichment' => [
                'nullable',
                Rule::in([
                    'not_queried',
                    NifEnrichment::STATUS_PENDING,
                    NifEnrichment::STATUS_SUCCESS,
                    NifEnrichment::STATUS_NOT_FOUND,
                    NifEnrichment::STATUS_INVALID,
                    NifEnrichment::STATUS_ERROR,
                    'expired',
                ]),
            ],

            'district' => [
                'nullable',
                'string',
                'max:100',
            ],

            'municipality' => [
                'nullable',
                'string',
                'max:150',
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
