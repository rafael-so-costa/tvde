<?php

use App\Models\Contrato;
use App\Services\ContratoPdfService;
use Illuminate\Validation\ValidationException;

test('4n22 retificacao pendente bloqueia renderizacao de pdf',function(){
    $contrato=new Contrato([
        'campos_preenchidos'=>[
            'FROTAPRO_RETIFICACAO_PENDENTE'=>'v2',
        ],
    ]);

    expect(
        fn()=>app(ContratoPdfService::class)
            ->renderHtml($contrato)
    )->toThrow(ValidationException::class);
});

test('4n22 gerador possui bloqueio antes de emitir documento',function(){
    $source=file_get_contents(
        app_path('Services/ContratoPdfService.php')
    );

    $start=strpos($source,'public function generate(');
    $end=strpos($source,'public function renderHtml(');

    expect($start)->not->toBeFalse();
    expect($end)->not->toBeFalse();

    $generation=substr($source,$start,$end-$start);

    expect($generation)
        ->toContain('assertNotPendingRetification($contrato)');

    expect(
        strpos($generation,'assertNotPendingRetification($contrato)')
    )->toBeLessThan(
        strpos($generation,'->sync(')
    );
});
