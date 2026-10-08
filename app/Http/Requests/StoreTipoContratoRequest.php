<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTipoContratoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId=app(TenantContext::class)->requireId();

        return [
            'tenant_id'=>['prohibited'],

            'nome'=>['required','string','max:255'],

            'slug'=>[
                'required',
                'string',
                'max:150',
                'regex:/^[a-z0-9-]+$/',
                Rule::unique('tipos_contrato','slug')
                    ->where(fn($q)=>$q->where('tenant_id',$tenantId)),
            ],

            'codigo'=>[
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('tipos_contrato','codigo')
                    ->where(fn($q)=>$q->where('tenant_id',$tenantId)),
            ],

            'descricao'=>['nullable','string'],

            'template_id'=>[
                'nullable',
                'uuid',
                Rule::exists('templates_contrato','id')
                    ->where(fn($q)=>$q
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'checklist_process_template_id'=>[
                'nullable',
                'uuid',
                Rule::exists('checklist_process_templates','id')
                    ->where(fn($q)=>$q
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'entidades'=>['sometimes','array'],
            'entidades.empresa'=>['sometimes','boolean'],
            'entidades.proprietario'=>['sometimes','boolean'],
            'entidades.motorista'=>['sometimes','boolean'],
            'entidades.veiculo'=>['sometimes','boolean'],

            'campos_configuracao'=>['sometimes','array','max:100'],
            'campos_configuracao.*.campo'=>['required','string','max:150'],
            'campos_configuracao.*.origem'=>[
                'required',
                Rule::in(['automatico','manual']),
            ],
            'campos_configuracao.*.fonte'=>['nullable','string','max:255'],
            'campos_configuracao.*.tipo'=>['nullable','string','max:50'],
            'campos_configuracao.*.obrigatorio'=>['sometimes','boolean'],
            'campos_configuracao.*.opcoes'=>['nullable','array'],

            'assinaturas_configuracao'=>['sometimes','array','max:20'],
            'assinaturas_configuracao.*.placeholder'=>[
                'required',
                'distinct',
                Rule::in([
                    'ASSINATURA_MOTORISTA',
                    'ASSINATURA_PROPRIETARIO',
                    'ASSINATURA_EMPRESA',
                    'ASSINATURA_TESTEMUNHA',
                ]),
            ],
            'assinaturas_configuracao.*.obrigatoria'=>['required','boolean'],
            'assinaturas_configuracao.*.modos'=>['required','array','min:1'],
            'assinaturas_configuracao.*.modos.*'=>[
                Rule::in(['presencial','remota']),
            ],

            'configuracao'=>['sometimes','array'],
            'ativo'=>['sometimes','boolean'],
            'mostrar_menu'=>['sometimes','boolean'],
            'ordem'=>['sometimes','integer','min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $nome=trim((string)$this->input('nome',''));

        $this->merge([
            'nome'=>$nome,
            'slug'=>strtolower(
                trim(
                    (string)$this->input(
                        'slug',
                        str($nome)->slug()
                    )
                )
            ),
            'codigo'=>strtolower(
                trim(
                    (string)$this->input(
                        'codigo',
                        str($nome)->slug('_')
                    )
                )
            ),
        ]);
    }
}
