<?php

declare(strict_types=1);

use App\Services\ChecklistProcessPresetService;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProWorkflowCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test('4r11h rgpd possui cinco etapas', function (): void {
    $workflow = collect(
        app(FrotaProWorkflowCatalog::class)->all()
    )->firstWhere(
        'codigo',
        'rgpd_informacao_autorizacoes'
    );

    expect($workflow)->not->toBeNull();

    expect($workflow['publicavel'])->toBeFalse();

    expect(
        collect($workflow['items'])
            ->pluck('codigo')
            ->all()
    )->toBe([
        'preencher_rgpd',
        'validar_itens_rgpd',
        'previsualizar_rgpd',
        'conferir_assinatura_rgpd',
        'emitir_pdf_rgpd',
    ]);
});

test('4r11h autorizacoes sao independentes', function (): void {
    $workflow = collect(
        app(FrotaProWorkflowCatalog::class)->all()
    )->firstWhere(
        'codigo',
        'rgpd_informacao_autorizacoes'
    );

    $item = collect($workflow['items'])
        ->firstWhere('codigo', 'preencher_rgpd');

    expect(
        $item['configuracao']['pre_selecionadas']
    )->toBeFalse();

    expect(
        $item['configuracao']['escolhas_independentes']
    )->toBeTrue();

    expect(
        $item['configuracao']['opcoes']
    )->toContain('autorizo', 'nao_autorizo');
});

test('4r11h rascunho nao e copiavel', function (): void {
    $presets = app(
        ChecklistProcessPresetService::class
    )->catalog(Str::uuid()->toString());

    expect($presets)->toHaveCount(12);

    expect(
        collect($presets)->contains(
            'codigo',
            'rgpd_informacao_autorizacoes'
        )
    )->toBeFalse();

    expect(fn() => app(
        ChecklistProcessPresetService::class
    )->copyToTenant(
        Str::uuid()->toString(),
        'rgpd_informacao_autorizacoes'
    ))->toThrow(
        \Symfony\Component\HttpKernel\Exception\HttpException::class
    );
});

test('4r11h template rgpd permanece original', function (): void {
    $catalogo = app(
        FrotaProDocumentCatalog::class
    );

    $documento = $catalogo->find(
        'informacao_tratamento_dados_rgpd'
    );

    expect($documento)->not->toBeNull();

    expect($documento['publicavel'])->toBeFalse();

    expect(
        $documento['workflow_codigo']
    )->toBe(
        'rgpd_informacao_autorizacoes'
    );

    expect(
        hash(
            'sha256',
            $catalogo->content($documento)
        )
    )->toBe(
        '5e701afd6af480c9143da277b3524a29f29b8c576e157bf955c73f8e5f5b75fe'
    );
});
