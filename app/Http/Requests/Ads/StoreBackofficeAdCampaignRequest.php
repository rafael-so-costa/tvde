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

            'pricing_model' => [
                'required',
                Rule::in([
                    'fixed_period',
                    'cpm',
                    'cpc',
                ]),
            ],

            'quoted_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'currency' => [
                'required',
                'string',
                'size:3',
            ],

            'payment_required' => [
                'required',
                'boolean',
            ],

            'priority' => [
                'required',
                'integer',
                'min:1',
                'max:100',
            ],

            'weight' => [
                'required',
                'integer',
                'min:1',
                'max:100',
            ],

            'max_impressions' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'max_clicks' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'frequency_cap_daily' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],

            'start_at' => [
                'nullable',
                'date',
            ],

            'end_at' => [
                'nullable',
                'date',
                'after:start_at',
            ],

            'admin_notes' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'metadata' => [
                'nullable',
                'array',
            ],

            'channels' => [
                'required',
                'array',
                'min:1',
            ],

            'channels.*' => [
                'required',
                Rule::in(
                    AdZone::channels()
                ),
            ],

            'audiences' => [
                'required',
                'array',
                'min:1',
            ],

            'audiences.*' => [
                'required',
                Rule::in(
                    AdCampaign::audiences()
                ),
            ],

            'zone_ids' => [
                'nullable',
                'array',
            ],

            'zone_ids.*' => [
                'uuid',
                'exists:ad_zones,id',
            ],

            'locations' => [
                'nullable',
                'array',
            ],

            'locations.*.country_code' => [
                'required',
                'string',
                'size:2',
            ],

            'locations.*.district' => [
                'nullable',
                'string',
                'max:150',
            ],

            'locations.*.municipality' => [
                'nullable',
                'string',
                'max:150',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'advertiser_id.required' => 'Selecione o anunciante da campanha.',
            'advertiser_id.uuid' => 'O anunciante selecionado não é válido.',
            'advertiser_id.exists' => 'O anunciante selecionado já não existe ou não está disponível.',

            'tenant_id.uuid' => 'A organização selecionada não é válida.',
            'tenant_id.exists' => 'A organização selecionada já não existe ou não está disponível.',

            'category_id.uuid' => 'A categoria selecionada não é válida.',
            'category_id.exists' => 'A categoria selecionada já não existe ou não está disponível.',

            'source.required' => 'Selecione a origem da campanha.',
            'source.in' => 'A origem selecionada não é válida.',

            'kind.required' => 'Selecione o tipo de campanha.',
            'kind.in' => 'O tipo de campanha selecionado não é válido.',

            'name.required' => 'Preencha o nome interno da campanha.',
            'name.string' => 'O nome interno da campanha não é válido.',
            'name.max' => 'O nome interno não pode ter mais de 255 caracteres.',

            'title.required' => 'Preencha o título da campanha.',
            'title.string' => 'O título da campanha não é válido.',
            'title.max' => 'O título não pode ter mais de 255 caracteres.',

            'description.string' => 'A descrição da campanha não é válida.',
            'description.max' => 'A descrição não pode ter mais de 10.000 caracteres.',

            'pricing_model.required' => 'Selecione o modelo de preço.',
            'pricing_model.in' => 'O modelo de preço selecionado não é válido.',

            'quoted_price.required' => 'Informe o valor da campanha.',
            'quoted_price.numeric' => 'O preço da campanha deve ser um número.',
            'quoted_price.min' => 'O preço da campanha não pode ser negativo.',

            'currency.required' => 'Informe a moeda da campanha.',
            'currency.size' => 'A moeda deve utilizar um código de três letras, por exemplo EUR.',

            'payment_required.required' => 'Informe se a campanha exige pagamento.',
            'payment_required.boolean' => 'A configuração de pagamento não é válida.',

            'priority.required' => 'Informe a prioridade da campanha.',
            'priority.integer' => 'A prioridade deve ser um número inteiro.',
            'priority.min' => 'A prioridade mínima é 1.',
            'priority.max' => 'A prioridade máxima é 100.',

            'weight.required' => 'Informe o peso de distribuição da campanha.',
            'weight.integer' => 'O peso deve ser um número inteiro.',
            'weight.min' => 'O peso mínimo é 1.',
            'weight.max' => 'O peso máximo é 100.',

            'max_impressions.integer' => 'O limite de impressões deve ser um número inteiro.',
            'max_impressions.min' => 'O limite de impressões deve ser superior a zero.',

            'max_clicks.integer' => 'O limite de cliques deve ser um número inteiro.',
            'max_clicks.min' => 'O limite de cliques deve ser superior a zero.',

            'frequency_cap_daily.integer' => 'O limite diário por utilizador deve ser um número inteiro.',
            'frequency_cap_daily.min' => 'O limite diário por utilizador deve ser pelo menos 1.',
            'frequency_cap_daily.max' => 'O limite diário por utilizador não pode ultrapassar 100.',

            'start_at.date' => 'A data de início não é válida.',
            'end_at.date' => 'A data de fim não é válida.',
            'end_at.after' => 'A data de fim deve ser posterior à data de início.',

            'admin_notes.string' => 'As notas administrativas não são válidas.',
            'admin_notes.max' => 'As notas administrativas não podem ter mais de 10.000 caracteres.',

            'metadata.array' => 'Os metadados enviados não são válidos.',

            'channels.required' => 'Selecione pelo menos um canal de distribuição.',
            'channels.array' => 'Os canais selecionados não são válidos.',
            'channels.min' => 'Selecione pelo menos um canal de distribuição.',
            'channels.*.required' => 'Um dos canais selecionados não é válido.',
            'channels.*.in' => 'Um dos canais selecionados não é válido.',

            'audiences.required' => 'Selecione pelo menos um público.',
            'audiences.array' => 'Os públicos selecionados não são válidos.',
            'audiences.min' => 'Selecione pelo menos um público.',
            'audiences.*.required' => 'Um dos públicos selecionados não é válido.',
            'audiences.*.in' => 'Um dos públicos selecionados não é válido.',

            'zone_ids.array' => 'As zonas selecionadas não são válidas.',
            'zone_ids.*.uuid' => 'Uma das zonas selecionadas não é válida.',
            'zone_ids.*.exists' => 'Uma das zonas selecionadas já não está disponível.',

            'locations.array' => 'As localizações enviadas não são válidas.',

            'locations.*.country_code.required' => 'Informe o país da localização.',
            'locations.*.country_code.size' => 'O código do país deve ter duas letras.',

            'locations.*.district.string' => 'O distrito informado não é válido.',
            'locations.*.district.max' => 'O distrito não pode ter mais de 150 caracteres.',

            'locations.*.municipality.string' => 'O município informado não é válido.',
            'locations.*.municipality.max' => 'O município não pode ter mais de 150 caracteres.',
        ];
    }

    public function attributes(): array
    {
        return [
            'advertiser_id' => 'anunciante',
            'tenant_id' => 'organização',
            'category_id' => 'categoria',
            'source' => 'origem',
            'kind' => 'tipo de campanha',
            'name' => 'nome interno',
            'title' => 'título',
            'description' => 'descrição',
            'pricing_model' => 'modelo de preço',
            'quoted_price' => 'preço',
            'currency' => 'moeda',
            'payment_required' => 'pagamento',
            'priority' => 'prioridade',
            'weight' => 'peso',
            'max_impressions' => 'limite de impressões',
            'max_clicks' => 'limite de cliques',
            'frequency_cap_daily' => 'limite diário por utilizador',
            'start_at' => 'data de início',
            'end_at' => 'data de fim',
            'channels' => 'canais',
            'audiences' => 'públicos',
            'zone_ids' => 'zonas',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $source = $this->input(
                    'source'
                );

                $kind = $this->input(
                    'kind'
                );

                if (
                    (
                        $source === AdCampaign::SOURCE_TENANT ||
                        $kind === AdCampaign::KIND_TENANT_INTERNAL
                    ) &&
                    ! $this->input(
                        'tenant_id'
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'tenant_id',
                            'Campanhas de tenant devem estar associadas a uma organização.'
                        );
                }

                if (
                    $kind === AdCampaign::KIND_TENANT_INTERNAL &&
                    $this->boolean(
                        'payment_required'
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payment_required',
                            'A comunicação interna gratuita não pode exigir pagamento.'
                        );
                }

                if (
                    $kind === AdCampaign::KIND_TENANT_INTERNAL &&
                    (float) $this->input(
                        'quoted_price',
                        0
                    ) > 0
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'quoted_price',
                            'A comunicação interna gratuita deve ter valor zero.'
                        );
                }
            },
        ];
    }
}
