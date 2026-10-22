<?php

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Models\ModeloDocumentoSaasVersao;
use App\Services\FrotaProDocumentCatalogSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test(
    'dry run identifica oito modelos novos sem alterar banco',
    function(){
        $plan=
            app(
                FrotaProDocumentCatalogSyncService::class
            )->plan();

        expect(
            $plan['summary']['models']
        )->toBe(8);

        expect(
            $plan['summary']['create']
        )->toBe(8);

        expect(
            $plan['summary']['blocked']
        )->toBe(0);

        expect(
            ModeloDocumentoSaas::query()
                ->count()
        )->toBe(0);

        expect(
            ModeloDocumentoSaasVersao::query()
                ->count()
        )->toBe(0);
    }
);

test(
    'sincronizacao cria oito modelos publicados de forma idempotente',
    function(){
        $service=
            app(
                FrotaProDocumentCatalogSyncService::class
            );

        $first=
            $service->apply();

        expect(
            $first['summary']['models']
        )->toBe(8);

        expect(
            $first['summary']['created']
        )->toBe(8);

        expect(
            ModeloDocumentoSaas::query()
                ->count()
        )->toBe(8);

        expect(
            ModeloDocumentoSaasVersao::query()
                ->count()
        )->toBe(8);

        expect(
            ModeloDocumentoSaas::query()
                ->where(
                    'status',
                    'publicado'
                )
                ->count()
        )->toBe(8);

        $second=
            $service->apply();

        expect(
            $second['summary']['created']
        )->toBe(0);

        expect(
            $second['summary']['published']
        )->toBe(0);

        expect(
            $second['summary']['unchanged']
        )->toBe(8);

        expect(
            ModeloDocumentoSaas::query()
                ->count()
        )->toBe(8);

        expect(
            ModeloDocumentoSaasVersao::query()
                ->count()
        )->toBe(8);
    }
);

test(
    'sincronizacao cria categorias recomendadas sem duplicacao',
    function(){
        $service=
            app(
                FrotaProDocumentCatalogSyncService::class
            );

        $service->apply();

        $first=
            ModeloDocumentoSaasCategoria::query()
                ->count();

        expect($first)
            ->toBeGreaterThan(0);

        $service->apply();

        expect(
            ModeloDocumentoSaasCategoria::query()
                ->count()
        )->toBe(
            $first
        );
    }
);

test(
    'prestacao existente preserva versao publicada e recebe versao dois',
    function(){
        $category=
            ModeloDocumentoSaasCategoria::query()
                ->create([
                    'nome'=>
                        'Contrato de Prestação de Serviços',

                    'slug'=>
                        'contrato-de-prestacao-de-servicos',

                    'descricao'=>
                        'Categoria existente.',

                    'ordem'=>10,
                    'ativo'=>true,
                ]);

        $model=
            ModeloDocumentoSaas::query()
                ->create([
                    'categoria_id'=>
                        $category->id,

                    'nome'=>
                        'Prestação de Serviços',

                    'slug'=>
                        'prestacao-de-servicos',

                    'resumo'=>
                        'Modelo anterior',

                    'descricao'=>
                        'Modelo anterior',

                    'tipo_documento'=>
                        'contrato',

                    'pais'=>'PT',
                    'idioma'=>'pt-PT',

                    'conteudo'=>
                        'Conteúdo anterior',

                    'conteudo_parametrizado'=>
                        'Conteúdo anterior',

                    'campos_detectados'=>[],
                    'campos_mapeados'=>[],
                    'entidades_requeridas'=>[],
                    'assinaturas_requeridas'=>[],
                    'warnings'=>[],

                    'status'=>'publicado',

                    'versao'=>'1.1',
                    'versao_publicada'=>'1.1',

                    'tecnicamente_validado'=>true,
                    'juridicamente_revisto'=>true,

                    'destaque'=>true,
                    'ativo'=>true,
                    'ordem'=>10,

                    'publicado_em'=>now(),
                ]);

        ModeloDocumentoSaasVersao::query()
            ->create([
                'modelo_documento_saas_id'=>
                    $model->id,

                'versao'=>'1.1',

                'conteudo_original'=>
                    'Conteúdo anterior',

                'conteudo_parametrizado'=>
                    'Conteúdo anterior',

                'campos_detectados'=>[],
                'campos_mapeados'=>[],
                'entidades_requeridas'=>[],
                'assinaturas_requeridas'=>[],

                'checksum'=>
                    hash(
                        'sha256',
                        'Conteúdo anterior'
                    ),

                'juridicamente_revisto'=>true,
                'publicado_em'=>now(),
            ]);

        $originalId=
            $model->id;

        app(
            FrotaProDocumentCatalogSyncService::class
        )->apply();

        expect(
            ModeloDocumentoSaas::query()
                ->count()
        )->toBe(8);

        $updated=
            ModeloDocumentoSaas::query()
                ->whereKey(
                    $originalId
                )
                ->firstOrFail();

        expect(
            $updated->versao_publicada
        )->toBe('2.1');

        expect(
            $updated->juridicamente_revisto
        )->toBeFalse();

        expect(
            ModeloDocumentoSaasVersao::query()
                ->where(
                    'modelo_documento_saas_id',
                    $originalId
                )
                ->where(
                    'versao',
                    '1.1'
                )
                ->where(
                    'juridicamente_revisto',
                    true
                )
                ->exists()
        )->toBeTrue();

        expect(
            ModeloDocumentoSaasVersao::query()
                ->where(
                    'modelo_documento_saas_id',
                    $originalId
                )
                ->where(
                    'versao',
                    '2.1'
                )
                ->where(
                    'juridicamente_revisto',
                    false
                )
                ->exists()
        )->toBeTrue();
    }
);

test(
    'todos modelos do plano passam validacao tecnica',
    function(){
        $plan=
            app(
                FrotaProDocumentCatalogSyncService::class
            )->plan();

        expect(
            $plan['blockers']
        )->toBe([]);

        foreach(
            $plan['models']
            as $model
        ){
            expect(
                $model[
                    'tecnicamente_validado'
                ]
            )->toBeTrue();
        }
    }
);
