<?php

namespace App\Http\Requests;

use App\Models\Contrato;
use App\Services\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateContratoRequest extends FormRequest
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

            'tipo_contrato_id'=>['prohibited'],
            'template_id'=>['prohibited'],
            'tipo'=>['prohibited'],

            'empresa_id'=>['prohibited'],

            'status'=>['prohibited'],
            'versao_atual'=>['prohibited'],
            'valor_semanal'=>['prohibited'],
            'data_assinatura'=>['prohibited'],

            'pdf_gerado_url'=>['prohibited'],
            'assinatura_proprietario_url'=>['prohibited'],
            'assinatura_motorista_url'=>['prohibited'],

            'contrato_pai_id'=>['prohibited'],
            'renovacao_count'=>['prohibited'],
            'hash_documento'=>['prohibited'],
            'bloqueado'=>['prohibited'],
            'assinaturas'=>['prohibited'],

            'proprietario_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('proprietarios','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'motorista_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('motoristas','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'veiculo_id'=>[
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('veiculos','id')
                    ->where(fn($query)=>$query
                        ->where('tenant_id',$tenantId)
                        ->where('ativo',true)),
            ],

            'data_inicio'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'data_fim'=>[
                'sometimes',
                'nullable',
                'date',
            ],

            'valor_diaria'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_caucao'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'valor_total'=>[
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'campos_preenchidos'=>[
                'sometimes',
                'array',
            ],
        ];
    }
    public function messages(): array
    {
        return [
            'data_inicio.date' =>
                'Informe uma data de início válida.',

            'data_fim.date' =>
                'Informe uma data de fim válida.',
        ];
    }

    public function withValidator(
        Validator $validator
    ): void {
        $validator->after(
            function (
                Validator $validator
            ): void {
                if (
                    $validator
                        ->errors()
                        ->hasAny([
                            'data_inicio',
                            'data_fim',
                        ])
                ) {
                    return;
                }

                $tenantId =
                    app(
                        TenantContext::class
                    )->requireId();

                $contrato =
                    Contrato::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->find(
                            $this->route(
                                'id'
                            )
                        );

                if (! $contrato) {
                    return;
                }

                $inicio =
                    $this->exists(
                        'data_inicio'
                    )
                        ? $this->input(
                            'data_inicio'
                        )
                        : $contrato
                            ->data_inicio
                            ?->toDateString();

                $fim =
                    $this->exists(
                        'data_fim'
                    )
                        ? $this->input(
                            'data_fim'
                        )
                        : $contrato
                            ->data_fim
                            ?->toDateString();

                if (
                    ! $inicio ||
                    ! $fim
                ) {
                    return;
                }

                if (
                    Carbon::parse(
                        $fim
                    )->lt(
                        Carbon::parse(
                            $inicio
                        )
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'data_fim',
                            'A data de fim deve ser igual ou posterior à data de início.'
                        );
                }
            }
        );
    }
}
