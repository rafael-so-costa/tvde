<?php

use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProDocumentReadinessGuard;
use Illuminate\Validation\ValidationException;

function fp4n31CatalogModel(): array
{
    $catalog=app(FrotaProDocumentCatalog::class);
    $model=$catalog->find('prestacao_servicos_motorista');

    if($model===null){
        throw new RuntimeException(
            'Modelo de Prestacao de Servicos inexistente.'
        );
    }

    $content=$catalog->content($model);

    preg_match_all(
        '/\{\{\s*([^{}]+?)\s*\}\}/u',
        $content,
        $matches
    );

    $tokens=array_values(array_unique(array_map(
        static fn($value)=>mb_strtoupper(
            trim((string)$value)
        ),
        $matches[1]??[]
    )));

    return [$model,$content,$tokens];
}

function fp4n31FilledValues(array $tokens): array
{
    $values=[];

    foreach($tokens as $token){
        $values[$token]=[
            'value'=>'VALOR DE TESTE',
            'html'=>false,
        ];
    }

    /*
     * Dados sintéticos validos para os testes
     * de preenchimento e formato.
     */
    foreach([
        'EMPRESA_NIF'=>'500000000',
        'MOTORISTA_NIF'=>'200000004',
        'EMPRESA_CAPITAL_SOCIAL'=>'2.500,00 €',
        'MOTORISTA_DOCUMENTO_VALID_UNTIL'=>'31/12/2030',
        'DATA_INICIO'=>'01/11/2026',
        'DATA_FIM'=>'01/11/2027',
        'PERCENTAGEM_CONTRATO'=>'15%',
    ] as $key=>$value){
        if(in_array($key,$tokens,true)){
            $values[$key]=[
                'value'=>$value,
                'html'=>false,
            ];
        }
    }

    return $values;
}

function fp4n31Deferred(): array
{
    return [
        'ASSINATURA_MOTORISTA',
        'ASSINATURA_PROPRIETARIO',
        'ASSINATURA_EMPRESA',
        'ASSINATURA_TESTEMUNHA',
        'DATA_ASSINATURA',
        'CONTRATO_DATA_ASSINATURA',
        'CODIGO_DOCUMENTO',
        'DOCUMENTO_CODIGO',
        'DOCUMENTO_NUMERO',
        'NUMERO_DOCUMENTO',
        'CONTRATO_NUMERO',
        'NUMERO_CONTRATO',
        'CONTRATO_CODIGO',
    ];
}

function fp4n31Failure(
    string $content,
    array $values
): ?array {
    try{
        app(FrotaProDocumentReadinessGuard::class)
            ->assertReady($content,$values);

        return null;
    }catch(ValidationException $exception){
        return $exception->errors();
    }
}

test(
    '4n31 utiliza modelo real da prestacao de servicos e lista campos',
    function(){
        [$model,$content,$tokens]=fp4n31CatalogModel();

        expect($model['codigo'])
            ->toBe('prestacao_servicos_motorista');

        expect($model['versao'])->toBe('2.1');

        expect(mb_strlen($content))
            ->toBeGreaterThan(1000);

        expect(count($tokens))
            ->toBeGreaterThanOrEqual(15);

        foreach([
            'EMPRESA_NOME_EMPRESA',
            'MOTORISTA_NOME_COMPLETO',
            'DATA_INICIO',
            'ASSINATURA_EMPRESA',
            'ASSINATURA_MOTORISTA',
        ] as $essential){
            expect($tokens)->toContain($essential);
        }

        expect(
            fp4n31Failure(
                $content,
                fp4n31FilledValues($tokens)
            )
        )->toBeNull();
    }
);

test(
    '4n31 cada campo documental nao diferido em falta bloqueia emissao',
    function(){
        [,$content,$tokens]=fp4n31CatalogModel();

        $required=array_values(array_diff(
            $tokens,
            fp4n31Deferred()
        ));

        expect(count($required))
            ->toBeGreaterThanOrEqual(10);

        foreach($required as $token){
            $values=fp4n31FilledValues($tokens);

            unset($values[$token]);

            $errors=fp4n31Failure(
                $content,
                $values
            );

            expect($errors)->not->toBeNull();

            expect($errors)
                ->toHaveKey('campos_preenchidos');

            expect(
                implode(' ',$errors['campos_preenchidos'])
            )->toContain($token);
        }
    }
);

test(
    '4n31 valores vazios nulos e com espacos nao passam',
    function(){
        [,$content,$tokens]=fp4n31CatalogModel();

        $target='EMPRESA_NOME_EMPRESA';

        expect($tokens)->toContain($target);

        $invalidValues=[
            null,
            '',
            '   ',
            "\t\n",
            [],
            ['value'=>'   '],
        ];

        foreach($invalidValues as $invalid){
            $values=fp4n31FilledValues($tokens);

            $values[$target]=$invalid;

            $errors=fp4n31Failure(
                $content,
                $values
            );

            expect($errors)
                ->toHaveKey('campos_preenchidos');

            expect(
                implode(' ',$errors['campos_preenchidos'])
            )->toContain($target);
        }
    }
);

test(
    '4n31 valores provisorios identificados sao recusados',
    function(){
        [,$content,$tokens]=fp4n31CatalogModel();

        foreach([
            '[POR PREENCHER]',
            '[DADO DE EXEMPLO]',
        ] as $invalid){
            $values=fp4n31FilledValues($tokens);

            $values['EMPRESA_NOME_EMPRESA']=[
                'value'=>$invalid,
            ];

            $errors=fp4n31Failure(
                $content,
                $values
            );

            expect($errors)
                ->toHaveKey('campos_preenchidos');

            expect(
                implode(' ',$errors['campos_preenchidos'])
            )->toContain('EMPRESA_NOME_EMPRESA');
        }
    }
);

test(
    '4n31 reporta varios campos em falta na mesma resposta',
    function(){
        [,$content,$tokens]=fp4n31CatalogModel();

        $targets=[
            'EMPRESA_NOME_EMPRESA',
            'MOTORISTA_NOME_COMPLETO',
            'DATA_INICIO',
        ];

        $values=fp4n31FilledValues($tokens);

        foreach($targets as $token){
            expect($tokens)->toContain($token);

            unset($values[$token]);
        }

        $errors=fp4n31Failure(
            $content,
            $values
        );

        expect($errors)
            ->toHaveKey('campos_preenchidos');

        $message=implode(
            ' ',
            $errors['campos_preenchidos']
        );

        foreach($targets as $token){
            expect($message)->toContain($token);
        }
    }
);

test(
    '4n31 assinaturas e data de assinatura seguem validacao propria',
    function(){
        [,$content,$tokens]=fp4n31CatalogModel();

        $values=fp4n31FilledValues($tokens);

        foreach(fp4n31Deferred() as $token){
            unset($values[$token]);
        }

        expect(
            fp4n31Failure($content,$values)
        )->toBeNull();
    }
);
