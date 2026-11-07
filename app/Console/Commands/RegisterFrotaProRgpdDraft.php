<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProWorkflowCatalog;
use App\Services\ModeloDocumentoSaasService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class RegisterFrotaProRgpdDraft extends Command
{
    protected $signature=
        'frotapro:rgpd-draft
        {--apply : Regista exclusivamente o RGPD como rascunho global}';

    protected $description=
        'Prepara o modelo RGPD para visualização no backoffice SaaS sem o publicar.';

    public function handle(
        FrotaProDocumentCatalog $catalog,
        FrotaProWorkflowCatalog $workflowCatalog,
        ModeloDocumentoSaasService $modelService
    ): int {
        $code='informacao_tratamento_dados_rgpd';

        $document=$catalog->find($code);

        if(
            !$document ||
            ($document['publicavel']??true)!==false
        ){
            $this->error(
                'Modelo RGPD global inexistente ou nao protegido como rascunho.'
            );

            return self::FAILURE;
        }

        $workflow=collect(
            $workflowCatalog->all()
        )->firstWhere(
            'codigo',
            'rgpd_informacao_autorizacoes'
        );

        if(
            !$workflow ||
            ($workflow['publicavel']??true)!==false ||
            ($document['workflow_codigo']??null)!==
                $workflow['codigo']
        ){
            $this->error(
                'Workflow RGPD global invalido ou nao protegido.'
            );

            return self::FAILURE;
        }

        $content=$catalog->content($document);

        if(
            strlen($content)<2000 ||
            !str_contains(
                $content,
                '{{EMPRESA_NOME_EMPRESA}}'
            ) ||
            !str_contains(
                $content,
                'SUJEITA A REVISÃO JURÍDICA'
            )
        ){
            $this->error(
                'Conteudo RGPD incompleto ou diferente do rascunho aprovado.'
            );

            return self::FAILURE;
        }

        $slug=Str::slug(
            (string)$document['slug']
        );

        if(!$this->option('apply')){
            $this->newLine();

            $this->info(
                'PRE-VISUALIZACAO — nenhuma escrita executada.'
            );

            $this->line(
                'Modelo: '.$document['nome']
            );

            $this->line(
                'Slug: '.$slug
            );

            $this->line(
                'Categoria: '.$document['categoria']
            );

            $this->line(
                'Versao: '.$document['versao']
            );

            $this->line(
                'Estado pretendido: rascunho'
            );

            $this->line(
                'Workflow: '.$workflow['codigo']
            );

            $this->line(
                'Acesso tenant: bloqueado'
            );

            $this->newLine();

            $this->warn(
                'O modo --apply regista apenas o rascunho RGPD.'
            );

            return self::SUCCESS;
        }

        $analysis=$modelService->analyzeContent(
            $content
        );

        $result=DB::transaction(
            function() use(
                $document,
                $analysis,
                $content,
                $slug
            ):string{
                /*
                 * FROTAPRO_4R62_REGISTER_DRAFT
                 *
                 * Idempotente.
                 * Nao modifica modelos existentes.
                 * Nao publica versoes.
                 * Nao cria copias tenant.
                 */
                $existing=ModeloDocumentoSaas::query()
                    ->where('slug',$slug)
                    ->lockForUpdate()
                    ->first();

                if($existing){
                    if(
                        $existing->status!=='rascunho' ||
                        $existing->versao_publicada!==null ||
                        $existing->nome!==$document['nome']
                    ){
                        throw new RuntimeException(
                            'Ja existe um RGPD com estado ou identidade diferente. '.
                            'A sincronizacao automatica foi bloqueada.'
                        );
                    }

                    return 'existing';
                }

                if(
                    ModeloDocumentoSaas::query()
                        ->where('nome',$document['nome'])
                        ->exists()
                ){
                    throw new RuntimeException(
                        'Existe um modelo com o mesmo nome e slug diferente.'
                    );
                }

                $category=
                    ModeloDocumentoSaasCategoria::query()
                        ->where(
                            'slug',
                            $document['categoria_slug']
                        )
                        ->lockForUpdate()
                        ->first();

                if(!$category){
                    $category=
                        new ModeloDocumentoSaasCategoria();

                    $category->nome=
                        $document['categoria'];

                    $category->slug=
                        $document['categoria_slug'];

                    $category->descricao=
                        $document['categoria_descricao'];

                    $category->ativo=true;
                    $category->ordem=90;
                    $category->save();
                }

                if(!$category->ativo){
                    throw new RuntimeException(
                        'A categoria RGPD existente esta inativa.'
                    );
                }

                $model=new ModeloDocumentoSaas();

                $model->categoria_id=$category->id;
                $model->nome=$document['nome'];
                $model->slug=$slug;
                $model->resumo=$document['resumo'];
                $model->descricao=$document['descricao'];
                $model->tipo_documento=$document['tipo_documento'];

                $model->pais='PT';
                $model->idioma='pt-PT';

                $model->conteudo=$content;

                $model->conteudo_parametrizado=
                    $analysis['conteudo_parametrizado']
                    ?? $content;

                $model->campos_detectados=
                    $analysis['campos_detectados']??[];

                $model->campos_mapeados=
                    $analysis['campos_mapeados']??[];

                $model->entidades_requeridas=
                    $analysis['entidades_requeridas']??[];

                $model->assinaturas_requeridas=
                    $analysis['assinaturas_requeridas']??[];

                $model->warnings=
                    array_merge(
                        $analysis['warnings']??[],
                        [[
                            'code'=>'RGPD_DRAFT',
                            'severity'=>'info',
                            'message'=>
                                'Pendente de assinatura generica, consentimentos auditaveis e revisao juridica.',
                        ]]
                    );

                $model->status='rascunho';
                $model->versao=$document['versao'];

                $model->versao_publicada=null;
                $model->publicado_em=null;

                /*
                 * Nao declarar validacao final
                 * enquanto o workflow estiver
                 * funcionalmente incompleto.
                 */
                $model->tecnicamente_validado=false;
                $model->juridicamente_revisto=false;

                $model->ativo=true;
                $model->destaque=false;
                $model->ordem=$document['ordem'];

                $model->save();

                return 'created';
            }
        );

        $this->newLine();

        if($result==='created'){
            $this->info(
                '[OK] RGPD registado como rascunho global.'
            );
        }else{
            $this->info(
                '[OK] Rascunho RGPD ja existente; nenhum registo modificado.'
            );
        }

        $this->line(
            'Estado: rascunho'
        );

        $this->line(
            'Visivel no backoffice SaaS: sim'
        );

        $this->line(
            'Publicacao: nao'
        );

        $this->line(
            'Copia para tenants: nao'
        );

        $this->line(
            'Workflows existentes: sem alteracoes'
        );

        return self::SUCCESS;
    }
}