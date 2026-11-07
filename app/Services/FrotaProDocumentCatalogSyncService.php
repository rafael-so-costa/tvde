<?php

namespace App\Services;

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Models\ModeloDocumentoSaasVersao;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class FrotaProDocumentCatalogSyncService
{
    public function __construct(
        private FrotaProDocumentCatalog $catalog,
        private ModeloDocumentoSaasService $modelService
    ) {}

    public function plan(): array
    {
        $categories=
            $this->categoryPlan();

        $models=[];
        $blockers=[];

        foreach(
            $this->catalog->all()
            as $document
        ){
            // FROTAPRO_4R6_SKIP_DRAFT_IN_PLAN
            if(($document['publicavel']??true)===false){
                continue;
            }

            $content=
                $this->catalog->content(
                    $document
                );

            $analysis=
                $this->modelService
                    ->analyzeContent(
                        $content
                    );

            $technicalBlockers=
                $analysis[
                    'blocking_warnings'
                ] ?? [];

            $slug=
                Str::slug(
                    $document['slug']
                );

            $existing=
                $this->findExistingModel(
                    $slug,
                    $document['nome']
                );

            $expectedContent=
                (string)(
                    $analysis[
                        'conteudo_parametrizado'
                    ] ?? ''
                );

            $expectedChecksum=
                hash(
                    'sha256',
                    $expectedContent
                );

            $targetVersion=
                $document['versao'];

            $currentVersion=
                $existing
                ? $this->publishedVersion(
                    $existing
                )
                : null;

            $targetExisting=
                $existing
                ? ModeloDocumentoSaasVersao::query()
                    ->where(
                        'modelo_documento_saas_id',
                        $existing->id
                    )
                    ->where(
                        'versao',
                        $targetVersion
                    )
                    ->first()
                : null;

            $action='create';

            if(
                $existing
            ){
                if(
                    $currentVersion &&
                    hash_equals(
                        (string)$currentVersion->checksum,
                        $expectedChecksum
                    )
                ){
                    $action='unchanged';
                }
                else{
                    $action='publish_version';
                }
            }

            $modelBlockers=[];

            foreach(
                $technicalBlockers
                as $warning
            ){
                $modelBlockers[]=
                    $warning['message']
                    ?? 'Erro técnico no modelo.';
            }

            if(
                $targetExisting &&
                !hash_equals(
                    (string)$targetExisting->checksum,
                    $expectedChecksum
                )
            ){
                $modelBlockers[]=
                    "A versão {$targetVersion} já existe com conteúdo diferente.";
            }

            if(
                $currentVersion &&
                $action==='publish_version' &&
                version_compare(
                    $targetVersion,
                    $currentVersion->versao,
                    '<='
                ) &&
                !$targetExisting
            ){
                $modelBlockers[]=
                    "A versão alvo {$targetVersion} não é superior à versão publicada {$currentVersion->versao}.";
            }

            if(
                $modelBlockers!==[]
            ){
                $action='blocked';

                foreach(
                    $modelBlockers
                    as $message
                ){
                    $blockers[]=[
                        'codigo'=>
                            $document['codigo'],

                        'mensagem'=>
                            $message,
                    ];
                }
            }

            $models[]=[
                'codigo'=>
                    $document['codigo'],

                'nome'=>
                    $document['nome'],

                'slug'=>
                    $slug,

                'categoria'=>
                    $document['categoria'],

                'action'=>
                    $action,

                'existing_id'=>
                    $existing?->id,

                'existing_slug'=>
                    $existing?->slug,

                'versao_atual'=>
                    $currentVersion?->versao,

                'versao_alvo'=>
                    $targetVersion,

                'checksum'=>
                    $expectedChecksum,

                'campos'=>
                    count(
                        $analysis[
                            'campos_detectados'
                        ] ?? []
                    ),

                'entidades'=>
                    $analysis[
                        'entidades_requeridas'
                    ] ?? [],

                'assinaturas'=>
                    $analysis[
                        'assinaturas_requeridas'
                    ] ?? [],

                'tecnicamente_validado'=>
                    (
                        $analysis[
                            'tecnicamente_validado'
                        ] ?? false
                    )===true,

                'blockers'=>
                    $modelBlockers,
            ];
        }

        return [
            'categories'=>$categories,
            'models'=>$models,
            'blockers'=>$blockers,

            'summary'=>[
                'categories'=>
                    count($categories),

                'models'=>
                    count($models),

                'create'=>
                    collect($models)
                        ->where(
                            'action',
                            'create'
                        )
                        ->count(),

                'publish_version'=>
                    collect($models)
                        ->where(
                            'action',
                            'publish_version'
                        )
                        ->count(),

                'unchanged'=>
                    collect($models)
                        ->where(
                            'action',
                            'unchanged'
                        )
                        ->count(),

                'blocked'=>
                    collect($models)
                        ->where(
                            'action',
                            'blocked'
                        )
                        ->count(),
            ],
        ];
    }

    public function apply(): array
    {
        $plan=
            $this->plan();

        if(
            $plan['blockers']!==[]
        ){
            throw new RuntimeException(
                "O catálogo possui bloqueios técnicos. Execute primeiro o dry-run."
            );
        }

        return DB::transaction(
            function(): array {
                $categories=
                    $this->syncCategories();

                $applied=[];

                foreach(
                    $this->catalog->all()
                    as $document
                ){
                    // FROTAPRO_4R6_SKIP_DRAFT_IN_APPLY
                    if(($document['publicavel']??true)===false){
                        continue;
                    }

                    $analysis=
                        $this->modelService
                            ->analyzeContent(
                                $this->catalog
                                    ->content(
                                        $document
                                    )
                            );

                    if(
                        !(
                            $analysis[
                                'tecnicamente_validado'
                            ] ?? false
                        )
                    ){
                        throw new RuntimeException(
                            "Modelo {$document['codigo']} não passou na validação técnica."
                        );
                    }

                    $category=
                        $categories[
                            $document[
                                'categoria_slug'
                            ]
                        ];

                    $result=
                        $this->syncModel(
                            $document,
                            $category,
                            $analysis
                        );

                    $applied[]=
                        $result;
                }

                return [
                    'models'=>$applied,

                    'summary'=>[
                        'models'=>
                            count($applied),

                        'created'=>
                            collect($applied)
                                ->where(
                                    'action',
                                    'created'
                                )
                                ->count(),

                        'published'=>
                            collect($applied)
                                ->where(
                                    'action',
                                    'published'
                                )
                                ->count(),

                        'unchanged'=>
                            collect($applied)
                                ->where(
                                    'action',
                                    'unchanged'
                                )
                                ->count(),
                    ],
                ];
            }
        );
    }

    private function categoryPlan(): array
    {
        return collect(
            $this->catalog
                ->categories()
        )
            ->map(
                function(
                    array $category,
                    int $index
                ): array {
                    $existing=
                        ModeloDocumentoSaasCategoria::query()
                            ->where(
                                'slug',
                                $category['slug']
                            )
                            ->first();

                    return [
                        'nome'=>$category['nome'],
                        'slug'=>$category['slug'],

                        'action'=>
                            $existing
                            ? 'update_or_keep'
                            : 'create',

                        'existing_id'=>
                            $existing?->id,

                        'ordem'=>
                            ($index+1)*10,
                    ];
                }
            )
            ->values()
            ->all();
    }

    private function syncCategories(): array
    {
        $result=[];

        foreach(
            $this->catalog
                ->categories()
            as $index=>$data
        ){
            $category=
                ModeloDocumentoSaasCategoria::query()
                    ->firstOrNew([
                        'slug'=>$data['slug'],
                    ]);

            $category->nome=
                $data['nome'];

            $category->descricao=
                $data['descricao'];

            $category->ordem=
                ($index+1)*10;

            $category->ativo=true;

            $category->save();

            $result[
                $data['slug']
            ]=$category;
        }

        return $result;
    }

    private function syncModel(
        array $document,
        ModeloDocumentoSaasCategoria $category,
        array $analysis
    ): array {
        $slug=
            Str::slug(
                $document['slug']
            );

        $model=
            $this->findExistingModel(
                $slug,
                $document['nome'],
                true
            );

        $created=false;

        if(
            !$model
        ){
            $model=
                new ModeloDocumentoSaas();

            $model->slug=$slug;
            $created=true;
        }

        $expectedContent=
            (string)(
                $analysis[
                    'conteudo_parametrizado'
                ] ?? ''
            );

        $checksum=
            hash(
                'sha256',
                $expectedContent
            );

        $currentVersion=
            $this->publishedVersion(
                $model
            );

        if(
            $currentVersion &&
            hash_equals(
                (string)$currentVersion->checksum,
                $checksum
            )
        ){
            $this->applyMetadata(
                $model,
                $document,
                $category,
                $analysis,
                false
            );

            $model->save();

            return [
                'codigo'=>$document['codigo'],
                'id'=>$model->id,
                'action'=>'unchanged',
                'versao'=>
                    $currentVersion->versao,
            ];
        }

        $targetVersion=
            $document['versao'];

        $version=
            ModeloDocumentoSaasVersao::query()
                ->where(
                    'modelo_documento_saas_id',
                    $model->id
                )
                ->where(
                    'versao',
                    $targetVersion
                )
                ->first();

        if(
            $version &&
            !hash_equals(
                (string)$version->checksum,
                $checksum
            )
        ){
            throw new RuntimeException(
                "A versão {$targetVersion} do modelo {$document['codigo']} já existe com conteúdo diferente."
            );
        }

        $this->applyMetadata(
            $model,
            $document,
            $category,
            $analysis,
            true
        );

        $model->versao=
            $targetVersion;

        $model->juridicamente_revisto=false;

        $model->save();

        if(
            !$version
        ){
            $publishedAt=now();

            $version=
                new ModeloDocumentoSaasVersao([
                    'modelo_documento_saas_id'=>
                        $model->id,

                    'versao'=>
                        $targetVersion,

                    'conteudo_original'=>
                        $model->conteudo,

                    'conteudo_parametrizado'=>
                        $model->conteudo_parametrizado,

                    'campos_detectados'=>
                        $model->campos_detectados ?? [],

                    'campos_mapeados'=>
                        $model->campos_mapeados ?? [],

                    'entidades_requeridas'=>
                        $model->entidades_requeridas ?? [],

                    'assinaturas_requeridas'=>
                        $model->assinaturas_requeridas ?? [],

                    'checksum'=>$checksum,

                    'juridicamente_revisto'=>
                        false,

                    'publicado_em'=>
                        $publishedAt,

                    'created_by_user_id'=>
                        null,
                ]);

            $version->save();
        }

        $model->status='publicado';

        $model->versao_publicada=
            $targetVersion;

        $model->publicado_em=
            $version->publicado_em
            ?? now();

        $model->save();

        return [
            'codigo'=>$document['codigo'],
            'id'=>$model->id,

            'action'=>
                $created
                ? 'created'
                : 'published',

            'versao'=>
                $targetVersion,
        ];
    }

    private function applyMetadata(
        ModeloDocumentoSaas $model,
        array $document,
        ModeloDocumentoSaasCategoria $category,
        array $analysis,
        bool $replaceContent
    ): void {
        $model->categoria_id=
            $category->id;

        $model->nome=
            $document['nome'];

        $model->resumo=
            $document['resumo'];

        $model->descricao=
            $document['descricao'];

        $model->tipo_documento=
            $document['tipo_documento'];

        $model->pais=
            $document['pais'];

        $model->idioma=
            $document['idioma'];

        $model->destaque=
            $document['destaque'];

        $model->ativo=
            true;

        $model->ordem=
            $document['ordem'];

        if(
            !$replaceContent
        ){
            return;
        }

        $model->conteudo=
            $this->catalog
                ->content(
                    $document
                );

        $model->conteudo_parametrizado=
            $analysis[
                'conteudo_parametrizado'
            ] ?? '';

        $model->campos_detectados=
            $analysis[
                'campos_detectados'
            ] ?? [];

        $model->campos_mapeados=
            $analysis[
                'campos_mapeados'
            ] ?? [];

        $model->entidades_requeridas=
            $analysis[
                'entidades_requeridas'
            ] ?? [];

        $model->assinaturas_requeridas=
            $analysis[
                'assinaturas_requeridas'
            ] ?? [];

        $model->warnings=
            $analysis[
                'warnings'
            ] ?? [];

        $model->tecnicamente_validado=
            (
                $analysis[
                    'tecnicamente_validado'
                ] ?? false
            )===true;
    }

    private function findExistingModel(
        string $slug,
        string $name,
        bool $lock=false
    ): ?ModeloDocumentoSaas {
        $query=
            ModeloDocumentoSaas::query();

        if($lock){
            $query->lockForUpdate();
        }

        $bySlug=
            (clone $query)
                ->where(
                    'slug',
                    $slug
                )
                ->first();

        if($bySlug){
            return $bySlug;
        }

        /*
         * Permite incorporar o modelo recomendado já existente
         * "Prestação de Serviços" sem criar um duplicado.
         */
        return (clone $query)
            ->where(
                'nome',
                $name
            )
            ->first();
    }

    private function publishedVersion(
        ModeloDocumentoSaas $model
    ): ?ModeloDocumentoSaasVersao {
        if(
            !$model->exists ||
            !$model->versao_publicada
        ){
            return null;
        }

        return ModeloDocumentoSaasVersao::query()
            ->where(
                'modelo_documento_saas_id',
                $model->id
            )
            ->where(
                'versao',
                $model->versao_publicada
            )
            ->first();
    }
}
