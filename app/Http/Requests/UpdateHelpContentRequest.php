<?php

namespace App\Http\Requests;

use App\Services\HelpCenterService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHelpContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id'=>['sometimes','uuid','exists:help_categories,id'],
            'type'=>['sometimes',Rule::in(HelpCenterService::typeCodes())],
            'title'=>['sometimes','string','max:200'],
            'excerpt'=>['sometimes','nullable','string','max:500'],
            'body'=>['sometimes','nullable','string','max:100000'],
            'youtube_url'=>['sometimes','nullable','url','max:1000'],
            'feature_key'=>['sometimes','nullable',Rule::in(HelpCenterService::featureCodes())],
            'audiences'=>['sometimes','array','min:1'],
            'audiences.*'=>['required',Rule::in(HelpCenterService::audienceCodes())],
            'position'=>['sometimes','integer','min:0','max:65535'],
            'featured'=>['sometimes','boolean'],
            'active'=>['sometimes','boolean'],
            'published_at'=>['sometimes','nullable','date'],
        ];
    }
}
