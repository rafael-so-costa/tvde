<?php

namespace App\Services;

use App\Models\ChecklistProcessTemplate;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use Illuminate\Validation\ValidationException;

class ContratoTipoResolverService
{
    public function __construct(
        private TipoContratoReadinessService $readiness
    ) {}

    public function resolve(
        array $data,
        string $tenantId
    ): array {
        $tipoId=$data['tipo_contrato_id']??null;

        if(!$tipoId){
            $templateId=$data['template_id']??null;

            if(is_string($templateId) && $templateId!==''){
                $candidate=TemplateContrato::query()
                    ->where('tenant_id',$tenantId)
                    ->where('ativo',true)
                    ->find($templateId);

                if(
                    $candidate &&
                    str_contains(
                        (string)$candidate->conteudo_original,
                        '{{CONDICOES_COBRANCA}}'
                    )
                ){
                    throw ValidationException::withMessages([
                        'tipo_contrato_id'=>
                            'Este modelo exige um tipo de Prestação de Serviços ou Aluguer. Utilize o assistente de contratos.',
                    ]);
                }
            }

            return [
                'data'=>$data,
                'tipo_contrato'=>null,
                'template'=>null,
                'workflow'=>null,
                'assinaturas_configuracao'=>[],
            ];
        }

        $tipo=TipoContrato::query()
            ->where('tenant_id',$tenantId)
            ->where('ativo',true)
            ->find($tipoId);

        if(!$tipo){
            throw ValidationException::withMessages([
                'tipo_contrato_id'=>
                    'Tipo de contrato inválido ou inativo para esta organização.',
            ]);
        }

        /*
         * Protege tambem configuracoes legadas existentes
         * antes da introducao da validacao de ativacao.
         */
        $this->readiness->assertCanCreateContract($tipo);

        if(
            array_key_exists('template_id',$data) &&
            filled($data['template_id']) &&
            $data['template_id']!==$tipo->template_id
        ){
            throw ValidationException::withMessages([
                'template_id'=>
                    'O template é definido pelo tipo de contrato e não pode ser substituído.',
            ]);
        }

        $template=$this->template(
            $tenantId,
            $tipo->template_id
        );

        $workflow=$this->workflow(
            $tenantId,
            $tipo->checklist_process_template_id
        );

        $this->validateEntities(
            $tipo,
            $data
        );

        $data=app(
            FrotaProContractBillingIntegration::class
        )->forRequest($data,$tipo,$template);

        $this->validateFields(
            $tipo,
            $data,
            $template
        );

        $this->validateFirstPaymentDate($data,$template);

        $data['tipo_contrato_id']=$tipo->id;
        $data['tipo']=$tipo->codigo;
        $data['template_id']=$template?->id;

        return [
            'data'=>$data,
            'tipo_contrato'=>$tipo,
            'template'=>$template,
            'workflow'=>$workflow,
            'assinaturas_configuracao'=>
                $this->normalizeSignatures(
                    (array)($tipo->assinaturas_configuracao??[])
                ),
        ];
    }

    /*
     * FROTAPRO_4Q4_FIRST_PAYMENT_BACKEND
     *
     * Exigencia definida pelo conteudo do modelo.
     * Aplica-se a contratos novos, sem alterar
     * documentos historicos ja emitidos.
     */
    private function validateFirstPaymentDate(
        array $data,
        ?TemplateContrato $template
    ): void {
        $content=(string)($template?->conteudo_original ?? '');

        if(!preg_match(
            '/\{\{\s*DATA_PRIMEIRO_PAGAMENTO\s*\}\}/iu',
            $content
        )){
            return;
        }

        $fields=(array)($data['campos_preenchidos'] ?? []);
        $value=null;

        foreach($fields as $key=>$candidate){
            if(
                mb_strtoupper(trim((string)$key),'UTF-8')===
                'DATA_PRIMEIRO_PAGAMENTO'
            ){
                $value=$candidate;
                break;
            }
        }

        $raw=is_string($value) ? trim($value) : '';

        $date=$raw!==''
            ? \DateTimeImmutable::createFromFormat('!Y-m-d',$raw)
            : false;

        $errors=\DateTimeImmutable::getLastErrors();

        if(
            $date===false ||
            $date->format('Y-m-d')!==$raw ||
            (
                $errors!==false &&
                (
                    $errors['warning_count']>0 ||
                    $errors['error_count']>0
                )
            )
        ){
            throw ValidationException::withMessages([
                'campos_preenchidos.DATA_PRIMEIRO_PAGAMENTO'=>
                    'Informe uma data válida para o primeiro pagamento.',
            ]);
        }
    }

    private function template(
        string $tenantId,
        ?string $id
    ): ?TemplateContrato {
        if(!$id){
            return null;
        }

        $template=TemplateContrato::query()
            ->where('tenant_id',$tenantId)
            ->where('ativo',true)
            ->find($id);

        if(!$template){
            throw ValidationException::withMessages([
                'tipo_contrato_id'=>
                    'O tipo de contrato possui um template inexistente, inativo ou pertencente a outra organização.',
            ]);
        }

        return $template;
    }

    private function workflow(
        string $tenantId,
        ?string $id
    ): ?ChecklistProcessTemplate {
        if(!$id){
            return null;
        }

        $workflow=ChecklistProcessTemplate::query()
            ->where('tenant_id',$tenantId)
            ->where('ativo',true)
            ->with('items')
            ->find($id);

        if(!$workflow){
            throw ValidationException::withMessages([
                'tipo_contrato_id'=>
                    'O tipo de contrato possui um workflow inexistente, inativo ou pertencente a outra organização.',
            ]);
        }

        return $workflow;
    }

    private function validateEntities(
        TipoContrato $tipo,
        array $data
    ): void {
        $entities=(array)($tipo->entidades??[]);

        $map=[
            'empresa'=>'empresa_id',
            'proprietario'=>'proprietario_id',
            'motorista'=>'motorista_id',
            'veiculo'=>'veiculo_id',
        ];

        $errors=[];

        foreach($map as $entity=>$field){
            if(
                !filter_var(
                    $entities[$entity]??false,
                    FILTER_VALIDATE_BOOLEAN
                )
            ){
                continue;
            }

            if(blank($data[$field]??null)){
                $errors[$field]=
                    "O tipo de contrato exige {$this->entityLabel($entity)}.";
            }
        }

        if($errors!==[]){
            throw ValidationException::withMessages(
                $errors
            );
        }
    }

    private function validateFields(
        TipoContrato $tipo,
        array $data,
        ?TemplateContrato $template
    ): void {
        $configurations=
            (array)($tipo->campos_configuracao??[]);

        if($configurations===[]){
            return;
        }

        $filledFields=
            (array)($data['campos_preenchidos']??[]);

        $errors=[];

        /*
         * FROTAPRO_4R14B4E_CONFIGURED_OPTIONS
         *
         * O cliente nao pode escolher valores
         * fora das opcoes definidas pelo tipo.
         */
        $this->validateConfiguredOptions(
            $configurations,
            $filledFields,
            $errors
        );

        foreach($configurations as $index=>$configuration){
            if(!is_array($configuration)){
                continue;
            }

            $required=filter_var(
                $configuration['obrigatorio']
                    ??$configuration['obrigatoria']
                    ??false,
                FILTER_VALIDATE_BOOLEAN
            );

            if(!$required){
                continue;
            }

            $origin=strtolower(
                trim(
                    (string)(
                        $configuration['origem']
                        ??'manual'
                    )
                )
            );

            if(
                in_array(
                    $origin,
                    [
                        'automatico',
                        'automático',
                        'sistema',
                    ],
                    true
                )
            ){
                continue;
            }

            $field=trim(
                (string)(
                    $configuration['campo']
                    ??$configuration['name']
                    ??$configuration['chave']
                    ??''
                )
            );

            if($field===''){
                continue;
            }

            /*
             * FROTAPRO_4R14B4I2
             *
             * No RGPD, determinados placeholders
             * sao preenchidos pelo servico documental,
             * nao pelo utilizador do wizard.
             */
            if(
                $this->isRgpdServerManagedField(
                    $tipo,
                    $template,
                    $field
                )
            ){
                continue;
            }

            if(
                strtoupper($field)==='PERCENTAGEM_CONTRATO' &&
                app(FrotaProContractBillingIntegration::class)
                    ->supports($tipo->codigo,$template?->conteudo_original)
            ){
                continue;
            }

            if(
                $this->hasValue(
                    $field,
                    $filledFields,
                    $data
                )
            ){
                continue;
            }

            $errors["campos_preenchidos.{$field}"]=
                "O campo {$field} é obrigatório para este tipo de contrato.";
        }

        if($errors!==[]){
            throw ValidationException::withMessages(
                $errors
            );
        }
    }

    /*
     * FROTAPRO_4R14B4E_CONFIGURED_OPTIONS
     *
     * Validacao partilhada por todos os tipos
     * documentais que possuem campos de selecao.
     *
     * A ausencia de um campo obrigatorio continua
     * a ser validada por validateFields().
     */
    private function validateConfiguredOptions(
        array $configurations,
        array $filledFields,
        array &$errors
    ): void {
        foreach ($configurations as $configuration) {
            if (!is_array($configuration)) {
                continue;
            }

            $origin = strtolower(
                trim(
                    (string) (
                        $configuration['origem']
                        ?? 'manual'
                    )
                )
            );

            if ($origin !== 'manual') {
                continue;
            }

            $options = $configuration['opcoes'] ?? [];

            if (!is_array($options) || $options === []) {
                continue;
            }

            $field = trim(
                (string) (
                    $configuration['campo']
                    ?? $configuration['name']
                    ?? $configuration['chave']
                    ?? ''
                )
            );

            if ($field === '') {
                continue;
            }

            $found = false;
            $selected = null;

            foreach ($filledFields as $key => $value) {
                if (
                    mb_strtoupper(
                        trim((string) $key),
                        'UTF-8'
                    ) !== mb_strtoupper(
                        $field,
                        'UTF-8'
                    )
                ) {
                    continue;
                }

                $selected = $value;
                $found = true;
                break;
            }

            if (
                !$found ||
                $selected === null ||
                $selected === ''
            ) {
                continue;
            }

            $allowed = [];

            foreach ($options as $option) {
                if (is_string($option)) {
                    $allowed[] = $option;
                } elseif (
                    is_int($option) ||
                    is_float($option)
                ) {
                    $allowed[] = (string) $option;
                } elseif (is_bool($option)) {
                    $allowed[] = $option ? 'true' : 'false';
                }
            }

            if (
                !is_string($selected) &&
                !is_int($selected) &&
                !is_float($selected)
            ) {
                $errors["campos_preenchidos.{$field}"] =
                    "O campo {$field} possui um valor invalido.";

                continue;
            }

            if (
                !in_array(
                    (string) $selected,
                    $allowed,
                    true
                )
            ) {
                $errors["campos_preenchidos.{$field}"] =
                    "Escolha uma das opcoes permitidas para {$field}.";
            }
        }
    }
    /*
     * FROTAPRO_4R14B4I2
     *
     * O tratamento especial aplica-se apenas
     * ao tipo RGPD com template RGPD reconhecido.
     *
     * O servico FrotaProRgpdV11Service continua
     * responsavel por validar e resolver cada valor.
     *
     * As escolhas do titular e a sua qualidade
     * nao sao dispensadas por este metodo.
     */
    private function isRgpdServerManagedField(
        TipoContrato $tipo,
        ?TemplateContrato $template,
        string $field
    ): bool {
        if(
            !in_array(
                (string) $tipo->codigo,
                [
                    'rgpd_informacao_autorizacoes',
                    'informacao_tratamento_dados_rgpd',
                ],
                true
            )
        ){
            return false;
        }

        if(
            !app(FrotaProRgpdV11Service::class)
                ->isRgpd($template)
        ){
            return false;
        }

        $managed = array_merge(
            array_keys(
                FrotaProRgpdV11Service::POLICY
            ),
            [
                'RGPD_TITULAR_NOME',
                'RGPD_TITULAR_NIF',
                'RGPD_TITULAR_CONTACTO',
                'RGPD_TITULAR_IDENTIFICADOR',
                'RGPD_TITULAR_QUALIDADE',
                'RGPD_TITULAR_EMAIL',
                'RGPD_DATA_DECLARACAO',
                'RGPD_DATA_ESCOLHAS',
                'RGPD_RECOLHA_EM',
                'RGPD_VERSAO_MODELO',
            ]
        );

        return in_array(
            mb_strtoupper(trim($field), 'UTF-8'),
            $managed,
            true
        );
    }
    private function hasValue(
        string $field,
        array $filledFields,
        array $data
    ): bool {
        if(
            array_key_exists(
                $field,
                $filledFields
            ) &&
            filled(
                $filledFields[$field]
            )
        ){
            return true;
        }

        $normalized=mb_strtoupper(
            trim($field)
        );

        foreach($filledFields as $key=>$value){
            if(
                mb_strtoupper(
                    trim((string)$key)
                )===$normalized &&
                filled($value)
            ){
                return true;
            }
        }

        $topLevelKey=strtolower(
            $normalized
        );

        if(
            array_key_exists(
                $topLevelKey,
                $data
            ) &&
            filled(
                $data[$topLevelKey]
            )
        ){
            return true;
        }

        return false;
    }

    private function normalizeSignatures(
        array $configurations
    ): array {
        $result=[];

        foreach($configurations as $configuration){
            if(!is_array($configuration)){
                continue;
            }

            $placeholder=mb_strtoupper(
                trim(
                    (string)(
                        $configuration['placeholder']
                        ??''
                    )
                )
            );

            if($placeholder===''){
                continue;
            }

            $modes=array_values(
                array_unique(
                    array_filter(
                        array_map(
                            fn($mode)=>strtolower(
                                trim((string)$mode)
                            ),
                            (array)(
                                $configuration['modos']
                                ??[
                                    'presencial',
                                    'remota',
                                ]
                            )
                        ),
                        fn($mode)=>in_array(
                            $mode,
                            [
                                'presencial',
                                'remota',
                            ],
                            true
                        )
                    )
                )
            );

            if($modes===[]){
                $modes=[
                    'presencial',
                    'remota',
                ];
            }

            $result[]=[
                'placeholder'=>$placeholder,

                'obrigatoria'=>filter_var(
                    $configuration['obrigatoria']
                        ??$configuration['obrigatorio']
                        ??true,
                    FILTER_VALIDATE_BOOLEAN
                ),

                'modos'=>$modes,
            ];
        }

        return $result;
    }

    private function entityLabel(
        string $entity
    ): string {
        return match($entity){
            'empresa'=>'uma empresa',
            'proprietario'=>'um proprietário',
            'motorista'=>'um motorista',
            'veiculo'=>'um veículo',
            default=>"a entidade {$entity}",
        };
    }
}
