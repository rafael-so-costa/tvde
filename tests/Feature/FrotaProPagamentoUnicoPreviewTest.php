<?php

use App\Services\FrotaProContractBillingTerms;

test('1002 pagamento unico existe no backend e no wizard com preview explicito',function(){

    $reflection=new ReflectionClass(
        FrotaProContractBillingTerms::class
    );

    $constant=$reflection->getReflectionConstant(
        'PERIODICIDADES'
    );

    expect($constant)->not->toBeFalse();

    $periods=$constant->getValue();

    expect($periods)->toBeArray();

    expect(
        $periods['unico']??null
    )->toBe('Pagamento único');

    foreach([
        'diario',
        'semanal',
        'quinzenal',
        'mensal',
        'bimestral',
        'trimestral',
        'semestral',
        'anual',
    ] as $previous){
        expect($periods)->toHaveKey($previous);
    }

    $billing=file_get_contents(
        resource_path(
            'js/components/contratos/wizard/ContractBillingFields.tsx'
        )
    );

    expect($billing)
        ->toContain('["unico","Pagamento único"]');

    expect($billing)
        ->toContain(
            'String(fields["BASE_CALCULO_COBRANCA"]??"")'
        );

    $wizard=file_get_contents(
        resource_path(
            'js/components/contratos/wizard/ContractWizard.tsx'
        )
    );

    expect($wizard)
        ->toContain(
            'step === steps.length-1 && selectedType && ('
        );

    expect($wizard)
        ->toContain(
            'if(!selectedType.template_id)'
        );

    expect($wizard)
        ->toContain(
            'Configure um template válido'
        );
});
