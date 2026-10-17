<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSeoConfiguracaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'titulo'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'descricao'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'canonical_url'=>[
                'nullable',
                'url',
                'max:500',
            ],

            'robots'=>[
                'nullable',
                'string',
                'max:100',
            ],

            'og_title'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'og_description'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'og_image_path'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'favicon_path'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'social_image_path'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'twitter_card'=>[
                'nullable',
                Rule::in([
                    'summary',
                    'summary_large_image',
                ]),
            ],

            'schema_type'=>[
                'nullable',
                'string',
                'max:80',
            ],

            'configuracao'=>[
                'nullable',
                'array',
            ],
        ];
    }
}