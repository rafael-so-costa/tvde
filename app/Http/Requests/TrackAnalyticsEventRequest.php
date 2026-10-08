<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrackAnalyticsEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'evento'=>['required','string','max:80'],
            'page_url'=>['nullable','string','max:2000'],
            'route_name'=>['nullable','string','max:150'],
            'content_post_id'=>['nullable','uuid'],
            'entity_type'=>['nullable','string','max:80'],
            'entity_id'=>['nullable','uuid'],
            'active_seconds'=>['nullable','integer','min:0','max:86400'],
            'scroll_percent'=>['nullable','integer','min:0','max:100'],
            'screen_width'=>['nullable','integer','min:1','max:20000'],
            'screen_height'=>['nullable','integer','min:1','max:20000'],
            'language'=>['nullable','string','max:30'],
            'metadados'=>['nullable','array','max:50'],
        ];
    }
}
