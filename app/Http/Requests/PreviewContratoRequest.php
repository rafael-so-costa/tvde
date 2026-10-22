<?php

namespace App\Http\Requests;

class PreviewContratoRequest extends StoreContratoRequest
{
    // FrotaProWizardPreviewResolver
    protected function prepareForValidation(): void
    {
        if(!$this->exists('tipo_contrato_id')){
            return;
        }

        $tipoId=$this->input('tipo_contrato_id');

        if(
            !is_string($tipoId) ||
            !\Illuminate\Support\Str::isUuid($tipoId)
        ){
            throw \Illuminate\Validation\ValidationException::withMessages([
                'tipo_contrato_id'=>'Selecione um tipo de contrato válido.',
            ]);
        }

        $tenantId=app(
            \App\Services\TenantContext::class
        )->requireId();

        $resolved=app(
            \App\Services\ContratoTipoResolverService::class
        )->resolve(
            $this->all(),
            $tenantId
        );

        $template=$resolved['template'] ?? null;

        if(
            !$template ||
            blank($template->conteudo_original)
        ){
            throw \Illuminate\Validation\ValidationException::withMessages([
                'tipo_contrato_id'=>
                    'O tipo de contrato não possui um template de texto válido.',
            ]);
        }

        $this->merge([
            'tipo'=>$resolved['data']['tipo'],
            'template_id'=>$template->id,
        ]);
    }

}
