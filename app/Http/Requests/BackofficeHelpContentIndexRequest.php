<?php

namespace App\Http\Requests;

use App\Services\HelpCenterService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BackofficeHelpContentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search'=>['nullable','string','max:150'],
            'category_id'=>['nullable','uuid','exists:help_categories,id'],
            'type'=>['nullable',Rule::in(HelpCenterService::typeCodes())],
            'feature_key'=>['nullable',Rule::in(HelpCenterService::featureCodes())],
            'audience'=>['nullable',Rule::in(HelpCenterService::audienceCodes())],
            'status'=>['nullable',Rule::in(['published','scheduled','draft'])],
            'featured'=>['nullable','boolean'],
            'page'=>['nullable','integer','min:1'],
            'per_page'=>['nullable','integer',Rule::in([10,25,50,100])],
        ];
    }
}
