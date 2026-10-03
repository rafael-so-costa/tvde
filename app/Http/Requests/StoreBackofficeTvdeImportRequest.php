<?php

namespace App\Http\Requests;

use App\Models\TvdeImport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBackofficeTvdeImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source' => [
                'required',
                Rule::in([
                    TvdeImport::SOURCE_IMT,
                    TvdeImport::SOURCE_RAM,
                ]),
            ],

            'file' => [
                'required',
                'file',
                'mimes:pdf',
                'max:102400',
            ],

            'confirm_full_snapshot' => [
                'required',
                'accepted',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimes' => 'Selecione um ficheiro PDF válido.',
            'file.max' => 'O PDF não pode exceder 100 MB.',
            'confirm_full_snapshot.accepted' => 'Confirme que o PDF corresponde a uma listagem oficial completa.',
        ];
    }
}
