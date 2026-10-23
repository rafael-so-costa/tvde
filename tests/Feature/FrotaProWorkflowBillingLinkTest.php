<?php

use App\Models\Tenant;
use App\Models\TipoContrato;
use App\Services\ChecklistProcessPresetService;
use App\Services\FrotaProWorkflowCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('4n13 alugueres referenciam o tipo ativo real de prestacao',function(){
    $catalog=collect(
        app(FrotaProWorkflowCatalog::class)->all()
    );

    foreach([
        'aluguer_tvde_pessoa_singular',
        'aluguer_tvde_pessoa_coletiva',
    ] as $code){
        $workflow=$catalog->firstWhere('codigo',$code);

        expect($workflow)->not->toBeNull();

        $related=collect($workflow['items'])
            ->firstWhere('codigo','prestacao_servicos');

        expect($related)->not->toBeNull();

        expect($related['tipo'])
            ->toBe('contrato_relacionado');

        expect(
            data_get(
                $related,
                'configuracao.tipo_contrato_codigo'
            )
        )->toBe('contrato_de_prestacao_de_servicos');

        expect(
            data_get(
                $related,
                'configuracao.status_conclusao'
            )
        )->toBe('assinado');
    }
});

test('4n13 a copia do preset associa a prestacao do proprio tenant',function(){
    $tenant=Tenant::create([
        'nome'=>'Tenant Workflow Financeiro',
        'slug'=>'tenant-workflow-financeiro-4n13',
        'ativo'=>true,
    ]);

    $type=new TipoContrato([
        'codigo'=>'contrato_de_prestacao_de_servicos',
        'nome'=>'Contrato de Prestação de Serviços',
        'slug'=>'contrato-de-prestacao-de-servicos',
        'ativo'=>true,
        'mostrar_menu'=>true,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    $service=app(ChecklistProcessPresetService::class);

    foreach([
        'aluguer_tvde_pessoa_singular',
        'aluguer_tvde_pessoa_coletiva',
    ] as $code){
        $template=$service->copyToTenant(
            $tenant->id,
            $code
        );

        expect($template->tenant_id)->toBe($tenant->id);
        expect($template->preset_codigo)->toBe($code);

        $related=$template->items
            ->firstWhere('codigo','prestacao_servicos');

        expect($related)->not->toBeNull();

        expect(
            data_get(
                $related->configuracao,
                'tipo_contrato_codigo'
            )
        )->toBe('contrato_de_prestacao_de_servicos');

        expect(
            data_get(
                $related->configuracao,
                'tipo_contrato_id'
            )
        )->toBe($type->id);
    }
});

test('4n13 a copia nao associa prestacao de outro tenant',function(){
    $tenantA=Tenant::create([
        'nome'=>'Tenant A Workflow',
        'slug'=>'tenant-a-workflow-4n13',
        'ativo'=>true,
    ]);

    $tenantB=Tenant::create([
        'nome'=>'Tenant B Workflow',
        'slug'=>'tenant-b-workflow-4n13',
        'ativo'=>true,
    ]);

    $type=new TipoContrato([
        'codigo'=>'contrato_de_prestacao_de_servicos',
        'nome'=>'Contrato de Prestação de Serviços',
        'slug'=>'contrato-de-prestacao-de-servicos',
        'ativo'=>true,
    ]);

    $type->tenant_id=$tenantB->id;
    $type->save();

    $template=app(ChecklistProcessPresetService::class)
        ->copyToTenant(
            $tenantA->id,
            'aluguer_tvde_pessoa_singular'
        );

    $related=$template->items
        ->firstWhere('codigo','prestacao_servicos');

    expect($related)->not->toBeNull();

    expect(
        data_get(
            $related->configuracao,
            'tipo_contrato_codigo'
        )
    )->toBe('contrato_de_prestacao_de_servicos');

    expect(
        data_get(
            $related->configuracao,
            'tipo_contrato_id'
        )
    )->toBeNull();
});
