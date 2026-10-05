<?php

namespace App\Http\Requests\Ads;

use App\Models\AdCampaign;
use App\Models\AdZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBackofficeAdCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'advertiser_id' => ['required', 'uuid', 'exists:ad_advertisers,id'],
            'tenant_id' => ['nullable', 'uuid', 'exists:tenants,id'],
            'category_id' => ['nullable', 'uuid', 'exists:ad_categories,id'],

            'source' => ['required', Rule::in(AdCampaign::sources())],
            'kind' => ['required', Rule::in(AdCampaign::kinds())],

            'name' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],

            'pricing_model' => ['required', Rule::in(['fixed_period', 'cpm', 'cpc'])],
            'quoted_price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],

            'payment_required' => ['required', 'boolean'],
            'priority' => ['required', 'integer', 'min:1', 'max:100'],
            'weight' => ['required', 'integer', 'min:1', 'max:100'],

            'max_impressions' => ['nullable', 'integer', 'min:1'],
            'max_clicks' => ['nullable', 'integer', 'min:1'],
            'frequency_cap_daily' => ['nullable', 'integer', 'min:1', 'max:100'],

            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date', 'after:start_at'],

            'admin_notes' => ['nullable', 'string', 'max:10000'],
            'metadata' => ['nullable', 'array'],

            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => ['required', Rule::in(AdZone::channels())],

            'audiences' => ['required', 'array', 'min:1'],
            'audiences.*' => ['required', Rule::in(AdCampaign::audiences())],

            'zone_ids' => ['nullable', 'array'],
            'zone_ids.*' => ['uuid', 'exists:ad_zones,id'],

            'locations' => ['nullable', 'array'],
            'locations.*.country_code' => ['required', 'string', 'size:2'],
            'locations.*.district' => ['nullable', 'string', 'max:150'],
            'locations.*.municipality' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $source = $this->input('source');
                $kind = $this->input('kind');

                if (
                    ($source === AdCampaign::SOURCE_TENANT ||
                        $kind === AdCampaign::KIND_TENANT_INTERNAL) &&
                    ! $this->input('tenant_id')
                ) {
                    $validator->errors()->add(
                        'tenant_id',
                        'Campanhas de tenant devem estar associadas a uma organização.'
                    );
                }

                if (
                    $kind === AdCampaign::KIND_TENANT_INTERNAL &&
                    $this->boolean('payment_required')
                ) {
                    $validator->errors()->add(
                        'payment_required',
                        'A comunicação interna gratuita não pode exigir pagamento.'
                    );
                }

                if (
                    $kind === AdCampaign::KIND_TENANT_INTERNAL &&
                    (float) $this->input('quoted_price', 0) > 0
                ) {
                    $validator->errors()->add(
                        'quoted_price',
                        'A comunicação interna gratuita deve ter valor zero.'
                    );
                }
            },
        ];
    }
}
