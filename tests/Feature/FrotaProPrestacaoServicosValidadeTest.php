<?php

use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProDocumentReadinessGuard;
use Illuminate\Validation\ValidationException;

/*
 * NIF sintetico para testes: verifica apenas
 * a estrutura matematica do digito de controlo.
 * Nao consulta nem comprova registos fiscais.
 */
function fp4n32Nif(string $firstEight): string
{
    if(!preg_match('/^[0-9]{8}$/',$firstEight)){
        throw new InvalidArgumentException(
            'Sao necessarios oito digitos.'
        );
    }

    $sum=0;

    for($i=0;$i<8;$i++){
        $sum+=(int)$firstEight[$i]*(9-$i);
    }

    $check=11-($sum%11);

    if($check>=10){
        $check=0;
    }

    return $firstEight.(string)$check;
}

/*
 * Utiliza o conteudo real do modelo V2.1.
 * Os valores sao exclusivamente sinteticos
 * e nao representam dados aptos para producao.
 */
function fp4n32Fixture(): array
{
    $catalog=app(FrotaProDocumentCatalog::class);

    $document=$catalog->find(
        'prestacao_servicos_motorista'
    );

    if($document===null){
        throw new RuntimeException(
            'Prestacao de Servicos nao encontrada.'
        );
    }

    if(($document['versao']??null)!=='2.1'){
        throw new RuntimeException(
            'A versao esperada do modelo e 2.1.'
        );
    }

    $content=$catalog->content($document);

    preg_match_all(
        '/\{\{\s*([^{}]+?)\s*\}\}/u',
        $content,
        $matches
    );

    $tokens=array_values(array_unique(
        array_map(
            static fn($item)=>mb_strtoupper(
                trim((string)$item)
            ),
            $matches[1]??[]
        )
    ));

    $values=[];

    foreach($tokens as $token){
        $values[$token]=[
            'value'=>'VALOR DE TESTE',
            'html'=>false,
        ];
    }

    $valid=[
        'EMPRESA_NOME_EMPRESA'=>'Empresa de Testes Lda',
        'EMPRESA_NIF'=>fp4n32Nif('50000001'),
        'EMPRESA_NOME_GERENTE'=>'Gerente de Testes',
        'EMPRESA_ENDERECO_COMPLETO'=>
            'Rua do Teste, 12, 1000-001, Lisboa',
        'EMPRESA_CAPITAL_SOCIAL'=>'2.500,00 €',

        'MOTORISTA_NOME_COMPLETO'=>'Motorista de Testes',
        'MOTORISTA_NIF'=>fp4n32Nif('20000001'),
        'MOTORISTA_ENDERECO_COMPLETO'=>
            'Rua do Motorista, 8, 1100-002, Lisboa',
        'MOTORISTA_TIPO_DOCUMENTO'=>'Cartao de Cidadao',
        'MOTORISTA_NUMERO_DOCUMENTO'=>'12345678',
        'MOTORISTA_DOCUMENTO_VALID_UNTIL'=>'31/12/2030',

        'DATA_INICIO'=>'01/11/2026',
        'DATA_FIM'=>'01/11/2027',
        'DURACAO_CONTRATO'=>'12 meses',

        'PERCENTAGEM_CONTRATO'=>'15%',
        'CONDICOES_COBRANCA'=>
            'Pagamento mensal por transferencia bancaria',
        'PERIODICIDADE_PAGAMENTO_TEXTO'=>'mensal',

        'DATA_ASSINATURA'=>'01/11/2026',
    ];

    foreach($valid as $key=>$value){
        $values[$key]=[
            'value'=>$value,
            'html'=>false,
        ];
    }

    foreach([
        'EMPRESA_NIF',
        'MOTORISTA_NIF',
        'MOTORISTA_DOCUMENTO_VALID_UNTIL',
        'DATA_INICIO',
        'DATA_FIM',
        'CONDICOES_COBRANCA',
        'PERIODICIDADE_PAGAMENTO_TEXTO',
        'EMPRESA_CAPITAL_SOCIAL',
    ] as $required){
        if(!in_array($required,$tokens,true)){
            throw new RuntimeException(
                "O modelo nao contem {$required}."
            );
        }
    }

    return [$content,$values];
}

function fp4n32Errors(
    array $overrides=[],
    ?string $additionalPlaceholder=null
): array
{
    [$content,$values]=fp4n32Fixture();

    /*
     * Testes de percentagem usam um marcador
     * explicito, pois a Prestacao V2.1 atual
     * utiliza condicoes financeiras textuais.
     */
    if($additionalPlaceholder!==null){
        $content.="\n{{".$additionalPlaceholder."}}";
    }

    foreach($overrides as $key=>$value){
        $values[$key]=[
            'value'=>$value,
            'html'=>false,
        ];
    }

    try{
        app(FrotaProDocumentReadinessGuard::class)
            ->assertReady($content,$values);

        return [];
    }catch(ValidationException $exception){
        return $exception->errors();
    }
}

function fp4n32ExpectInvalid(
    string $field,
    string $value
): void {
    $errors=fp4n32Errors(
        [$field=>$value],
        $field==='PERCENTAGEM_CONTRATO'
            ? $field
            : null
    );

    expect($errors)
        ->toHaveKey('campos_preenchidos');

    expect(
        implode(' ',$errors['campos_preenchidos'])
    )->toContain($field);
}

test(
    '4n32 dados coerentes e formatos validos passam na prevalidacao',
    function(){
        expect(
            fp4n32Errors()
        )->toBe([]);
    }
);

test(
    '4n32 nif da empresa com formato ou controlo invalido e rejeitado',
    function(){
        $valid=fp4n32Nif('50000001');

        $wrongDigit=(
            (int)substr($valid,-1)+1
        )%10;

        $invalid=[
            'ABCDE1234',
            '12345678',
            substr($valid,0,8).$wrongDigit,
        ];

        foreach($invalid as $value){
            fp4n32ExpectInvalid(
                'EMPRESA_NIF',
                $value
            );
        }
    }
);

test(
    '4n32 nif do motorista com controlo invalido e rejeitado',
    function(){
        $valid=fp4n32Nif('20000001');

        $wrongDigit=(
            (int)substr($valid,-1)+1
        )%10;

        fp4n32ExpectInvalid(
            'MOTORISTA_NIF',
            substr($valid,0,8).$wrongDigit
        );
    }
);

test(
    '4n32 documento expirado ou com data inexistente e rejeitado',
    function(){
        foreach([
            '01/01/2020',
            '31/02/2030',
            'data desconhecida',
        ] as $value){
            fp4n32ExpectInvalid(
                'MOTORISTA_DOCUMENTO_VALID_UNTIL',
                $value
            );
        }
    }
);

test(
    '4n32 fim contratual anterior ao inicio e rejeitado',
    function(){
        fp4n32ExpectInvalid(
            'DATA_FIM',
            '31/10/2026'
        );
    }
);

test(
    '4n32 modelo com percentagem rejeita valores negativos superiores a cem ou ambiguos',
    function(){
        foreach([
            '-2%',
            '120%',
            'quinze por cento',
            '15',
        ] as $value){
            fp4n32ExpectInvalid(
                'PERCENTAGEM_CONTRATO',
                $value
            );
        }
    }
);

test(
    '4n32 capital social com formato invalido ou negativo e rejeitado',
    function(){
        foreach([
            'valor desconhecido',
            '-50,00 €',
        ] as $value){
            fp4n32ExpectInvalid(
                'EMPRESA_CAPITAL_SOCIAL',
                $value
            );
        }
    }
);
test(
    '4n32 modelo V2.1 exige campos financeiros',
    function(){
        foreach([
            'CONDICOES_COBRANCA',
            'PERIODICIDADE_PAGAMENTO_TEXTO',
        ] as $field){
            $errors=fp4n32Errors([
                $field=>'',
            ]);

            expect($errors)
                ->toHaveKey('campos_preenchidos');

            expect(
                implode(' ',$errors['campos_preenchidos'])
            )->toContain($field);
        }
    }
);
