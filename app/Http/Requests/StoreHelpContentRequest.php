<?php

namespace App\Http\Requests;

use App\Services\HelpCenterService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHelpContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id'=>['required','uuid','exists:help_categories,id'],
            'type'=>['required',Rule::in(HelpCenterService::typeCodes())],
            'title'=>['required','string','max:200'],
            'excerpt'=>['nullable','string','max:500'],
            'body'=>['nullable','string','max:100000'],
            'youtube_url'=>['nullable','url','max:1000'],
            'feature_key'=>['nullable',Rule::in(HelpCenterService::featureCodes())],
            'audiences'=>['required','array','min:1'],
            'audiences.*'=>['required',Rule::in(HelpCenterService::audienceCodes())],
            'position'=>['nullable','integer','min:0','max:65535'],
            'featured'=>['required','boolean'],
            'active'=>['required','boolean'],
            'published_at'=>['nullable','date'],
        ];
    }
}
