<?php

declare(strict_types=1);

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Services\ChecklistProcessPresetService;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProWorkflowCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test('4r12c1 RGPD pertence ao catalogo publicavel', function (): void {
    $documento = app(
        FrotaProDocumentCatalog::class
    )->find('informacao_tratamento_dados_rgpd');

    $workflow = collect(
        app(FrotaProWorkflowCatalog::class)->all()
    )->firstWhere(
        'codigo',
        'rgpd_informacao_autorizacoes'
    );

    expect($documento)->not->toBeNull();
    expect($workflow)->not->toBeNull();
    expect($documento['publicavel'])->toBeTrue();
    expect($workflow['publicavel'])->toBeTrue();
    expect($workflow['items'])->toHaveCount(5);
});

test('4r12c1 nao copia RGPD sem modelo publicado', function (): void {
    $service = app(
        ChecklistProcessPresetService::class
    );

    $tenant = (string) Str::uuid();

    expect(
        collect($service->catalog($tenant))
            ->contains(
                'codigo',
                'rgpd_informacao_autorizacoes'
            )
    )->toBeFalse();

    expect(
        fn() => $service->copyToTenant(
            $tenant,
            'rgpd_informacao_autorizacoes'
        )
    )->toThrow(
        \Symfony\Component\HttpKernel\Exception\HttpException::class
    );
});

test('4r12c1 workflow aparece apos publicacao valida', function (): void {
    $categoria = ModeloDocumentoSaasCategoria::query()
        ->create([
            'nome' => 'Proteção de Dados (RGPD)',
            'slug' => 'protecao-de-dados-rgpd',
            'ativo' => true,
            'ordem' => 90,
        ]);

    $modelo = ModeloDocumentoSaas::query()
        ->create([
            'categoria_id' => $categoria->id,
            'nome' => 'RGPD de teste',
            'slug' => 'informacao-tratamento-dados-rgpd',
            'conteudo' => 'Teste',
            'conteudo_parametrizado' => 'Teste',
            'status' => 'publicado',
            'versao' => '1.0',
            'versao_publicada' => '1.0',
            'tecnicamente_validado' => true,
            'ativo' => true,
            'ordem' => 90,
        ]);

    expect($modelo->exists)->toBeTrue();

    $tenant = (string) Str::uuid();

    expect(
        collect(
            app(ChecklistProcessPresetService::class)
                ->catalog($tenant)
        )->contains(
            'codigo',
            'rgpd_informacao_autorizacoes'
        )
    )->toBeTrue();
});
