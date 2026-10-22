<?php

use App\Services\FrotaProDocumentReadinessGuard;
use Illuminate\Validation\ValidationException;

test('documento completo passa na validacao',function(){
    $guard=app(FrotaProDocumentReadinessGuard::class);

    $guard->assertReady(
        'Empresa: {{EMPRESA_NIF}}. '.
        'Motorista: {{MOTORISTA_NIF}}. '.
        'Assinatura: {{ASSINATURA_MOTORISTA}}.',
        [
            'EMPRESA_NIF'=>[
                'value'=>'500000000',
                'html'=>false,
            ],
            'MOTORISTA_NIF'=>[
                'value'=>'200000000',
                'html'=>false,
            ],
        ]
    );

    expect(true)->toBeTrue();
});

test('documento com campo ausente e bloqueado',function(){
    $guard=app(FrotaProDocumentReadinessGuard::class);

    try{
        $guard->assertReady(
            'Empresa: {{EMPRESA_NIF}}. '.
            'Motorista: {{MOTORISTA_NIF}}.',
            [
                'EMPRESA_NIF'=>[
                    'value'=>'500000000',
                    'html'=>false,
                ],
            ]
        );

        test()->fail(
            'O campo ausente deveria bloquear a emissao.'
        );
    }
    catch(ValidationException $exception){
        $errors=$exception->errors();

        expect($errors)
            ->toHaveKey('campos_preenchidos');

        expect(
            implode(' ',$errors['campos_preenchidos'])
        )->toContain('MOTORISTA_NIF');
    }
});

test('marcadores de diferentes sintaxes sao verificados',function(){
    $guard=app(FrotaProDocumentReadinessGuard::class);

    foreach([
        '[[VEICULO_MATRICULA]]',
        '<<VEICULO_MATRICULA>>',
        '__VEICULO_MATRICULA__',
    ] as $marker){
        try{
            $guard->assertReady(
                'Veiculo '.$marker,
                []
            );

            test()->fail(
                'O marcador deveria impedir a emissao.'
            );
        }
        catch(ValidationException $exception){
            expect(
                implode(
                    ' ',
                    $exception->errors()['campos_preenchidos']
                )
            )->toContain('VEICULO_MATRICULA');
        }
    }
});

test('acronimos normais nao sao campos por preencher',function(){
    $guard=app(FrotaProDocumentReadinessGuard::class);

    $guard->assertReady(
        'Atividade (TVDE), tributacao (IVA) e NIF.',
        []
    );

    expect(true)->toBeTrue();
});

test('valores ficticios impedem a emissao',function(){
    $guard=app(FrotaProDocumentReadinessGuard::class);

    $this->expectException(
        ValidationException::class
    );

    $guard->assertReady(
        'Empresa: {{EMPRESA_NOME_EMPRESA}}',
        [
            'EMPRESA_NOME_EMPRESA'=>[
                'value'=>'[DADO DE EXEMPLO]',
                'html'=>false,
            ],
        ]
    );
});

test('emissao verifica campos antes de reservar numero',function(){
    $source=file_get_contents(
        app_path('Services/ContratoPdfService.php')
    );

    $generate=strpos(
        $source,
        'public function generate('
    );

    expect($generate)->not->toBeFalse();

    $body=substr($source,$generate);

    $validation=strpos(
        $body,
        '->assertReady('
    );

    $registry=strpos(
        $body,
        '->sync('
    );

    expect($validation)->not->toBeFalse();
    expect($registry)->not->toBeFalse();

    expect($validation)
        ->toBeLessThan($registry);

    expect($source)
        ->toContain('FROTAPRO_DOCUMENT_READINESS_4L8');
});
