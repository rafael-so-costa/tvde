<?php

use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\TemplateContrato;
use App\Services\ContratoPdfService;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProDocumentReadinessGuard;
use Illuminate\Validation\ValidationException;

function fp4n31OrigemFixture(
    array $companyOverride=[],
    array $driverOverride=[],
    array $manualOverride=[]
): Contrato {
    $company=new Empresa(array_replace([
        'nome_empresa'=>'Empresa Fonte Lda',
        'nif'=>'501234560',
        'nome_gerente'=>'Gerente da Empresa',
        'capital_social'=>'2500.00',
        'endereco_rua'=>'Rua da Empresa',
        'endereco_numero'=>'12',
        'endereco_cep'=>'1000-001',
        'endereco_cidade'=>'Lisboa',
    ],$companyOverride));

    $driver=new Motorista(array_replace([
        'nome_completo'=>'Motorista de Origem',
        'nif'=>'234567899',
        'tipo_documento'=>'Cartao de Cidadao',
        'numero_documento'=>'CC1234567',
        'documento_valid_until'=>'2030-06-30',
        'endereco_rua'=>'Rua do Motorista',
        'endereco_numero'=>'8',
        'endereco_cep'=>'1100-002',
        'endereco_cidade'=>'Lisboa',
    ],$driverOverride));

    $content=app(FrotaProDocumentCatalog::class)
        ->content('prestacao_servicos_motorista');

    $template=new TemplateContrato([
        'nome'=>'Prestacao V2.1 - Homologacao',
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>$content,
        'campos_detectados'=>[],
        'campos_mapeados'=>[],
    ]);

    $contract=new Contrato([
        'tipo'=>'contrato_de_prestacao_de_servicos',
        'data_inicio'=>'2026-11-01',
        'data_fim'=>'2027-11-01',
        'campos_preenchidos'=>array_replace([
            'PERCENTAGEM_CONTRATO'=>'15%',
            'CONDICOES_COBRANCA'=>'Pagamento por transferencia bancaria, conforme as condicoes acordadas.',
            'PERIODICIDADE_PAGAMENTO_TEXTO'=>'mensal',
        ],$manualOverride),
    ]);

    $contract->setRelation('empresa',$company);
    $contract->setRelation('motorista',$driver);
    $contract->setRelation('template',$template);
    $contract->setRelation('proprietario',null);
    $contract->setRelation('veiculo',null);
    $contract->setRelation('assinaturas',collect());

    return $contract;
}

function fp4n31OrigemValues(Contrato $contract): array
{
    /*
     * Usa o metodo real de preparacao do PDF,
     * sem executar geracao, registo ou numeracao.
     */
    $reflection=new ReflectionClass(
        ContratoPdfService::class
    );

    $service=$reflection
        ->newInstanceWithoutConstructor();

    return $reflection
        ->getMethod('values')
        ->invoke(
            $service,
            $contract,
            $contract->empresa,
            false
        );
}

function fp4n31OrigemErrors(
    Contrato $contract,
    array $values
): array {
    try{
        app(FrotaProDocumentReadinessGuard::class)
            ->assertReady(
                (string)$contract->template->conteudo_original,
                $values
            );

        return [];
    }catch(ValidationException $exception){
        return $exception->errors();
    }
}

test(
    '4n31origem mapeia os dados completos da empresa motorista e contrato',
    function(){
        $contract=fp4n31OrigemFixture();
        $values=fp4n31OrigemValues($contract);

        expect(
            $values['EMPRESA_NOME_EMPRESA']['value']
        )->toBe('Empresa Fonte Lda');

        expect(
            $values['EMPRESA_NIF']['value']
        )->toBe('501234560');

        expect(
            $values['EMPRESA_CAPITAL_SOCIAL']['value']
        )->toBe('2.500,00 €');

        expect(
            $values['MOTORISTA_NOME_COMPLETO']['value']
        )->toBe('Motorista de Origem');

        expect(
            $values['MOTORISTA_DOCUMENTO_VALID_UNTIL']['value']
        )->toBe('30/06/2030');

        expect(
            $values['DATA_INICIO']['value']
        )->toBe('01/11/2026');

        expect(
            $values['DATA_FIM']['value']
        )->toBe('01/11/2027');

        expect(
            $values['PERCENTAGEM_CONTRATO']['value']
        )->toBe('15%');

        expect(
            fp4n31OrigemErrors($contract,$values)
        )->toBe([]);
    }
);

test(
    '4n31origem nao permite substituicao de dados automaticos validos',
    function(){
        $contract=fp4n31OrigemFixture([],[],[
            'EMPRESA_NOME_EMPRESA'=>'EMPRESA FALSA',
            'MOTORISTA_NIF'=>'000000000',
            'DATA_INICIO'=>'1900-01-01',
        ]);

        $values=fp4n31OrigemValues($contract);

        expect(
            $values['EMPRESA_NOME_EMPRESA']['value']
        )->toBe('Empresa Fonte Lda');

        expect(
            $values['MOTORISTA_NIF']['value']
        )->toBe('234567899');

        expect(
            $values['DATA_INICIO']['value']
        )->toBe('01/11/2026');
    }
);

test(
    '4n31origem nif da empresa ausente nao pode ser forjado no formulario',
    function(){
        $contract=fp4n31OrigemFixture(
            ['nif'=>null],
            [],
            ['EMPRESA_NIF'=>'999999999']
        );

        $values=fp4n31OrigemValues($contract);
        $errors=fp4n31OrigemErrors(
            $contract,
            $values
        );

        expect($errors)
            ->toHaveKey('campos_preenchidos');

        expect(
            implode(' ',$errors['campos_preenchidos'])
        )->toContain('EMPRESA_NIF');
    }
);

test(
    '4n31origem nif do motorista ausente nao pode ser forjado no formulario',
    function(){
        $contract=fp4n31OrigemFixture(
            [],
            ['nif'=>''],
            ['MOTORISTA_NIF'=>'999999999']
        );

        $values=fp4n31OrigemValues($contract);
        $errors=fp4n31OrigemErrors(
            $contract,
            $values
        );

        expect($errors)
            ->toHaveKey('campos_preenchidos');

        expect(
            implode(' ',$errors['campos_preenchidos'])
        )->toContain('MOTORISTA_NIF');
    }
);

test(
    '4n31origem morada incompleta nao pode validar o documento',
    function(){
        $contract=fp4n31OrigemFixture([
            'endereco_rua'=>'',
            'endereco_numero'=>'',
            'endereco_cep'=>'',
            'endereco_cidade'=>'Lisboa',
        ]);

        $values=fp4n31OrigemValues($contract);
        $errors=fp4n31OrigemErrors(
            $contract,
            $values
        );

        expect($errors)
            ->toHaveKey('campos_preenchidos');

        expect(
            implode(' ',$errors['campos_preenchidos'])
        )->toContain('EMPRESA_ENDERECO_COMPLETO');
    }
);
test(
    '4n31origem mapeamento nao falsifica nif automatico',
    function(){
        $contract=fp4n31OrigemFixture(
            ['nif'=>null],
            [],
            ['NIF_ALTERNATIVO'=>'999999999']
        );

        $contract->template->campos_mapeados=[
            'EMPRESA_NIF'=>[
                'tipo'=>'automatico',
                'campo'=>'NIF_ALTERNATIVO',
            ],
        ];

        $values=fp4n31OrigemValues($contract);

        $errors=fp4n31OrigemErrors(
            $contract,
            $values
        );

        expect($errors)->toHaveKey('campos_preenchidos');

        expect(
            implode(' ',$errors['campos_preenchidos'])
        )->toContain('EMPRESA_NIF');
    }
);

test(
    '4n31origem morada do motorista incompleta nao pode ser falsificada',
    function(){
        $contract=fp4n31OrigemFixture(
            [],
            [
                'endereco_rua'=>'',
                'endereco_cep'=>'',
                'endereco_cidade'=>'Lisboa',
            ],
            [
                'MOTORISTA_ENDERECO_COMPLETO'=>'Rua Falsa, Lisboa',
            ]
        );

        $values=fp4n31OrigemValues($contract);

        $errors=fp4n31OrigemErrors(
            $contract,
            $values
        );

        expect($errors)->toHaveKey('campos_preenchidos');

        expect(
            implode(' ',$errors['campos_preenchidos'])
        )->toContain('MOTORISTA_ENDERECO_COMPLETO');
    }
);
test(
    '4n31origem preserva campos financeiros manuais',
    function(){
        $contract=fp4n31OrigemFixture();

        $values=fp4n31OrigemValues($contract);

        expect(
            $values['PERCENTAGEM_CONTRATO']['value']??null
        )->toBe('15%');

        expect(
            $values['CONDICOES_COBRANCA']['value']??null
        )->toBe(
            'Pagamento por transferencia bancaria, conforme as condicoes acordadas.'
        );

        expect(
            $values['PERIODICIDADE_PAGAMENTO_TEXTO']['value']??null
        )->toBe('mensal');

        expect(
            fp4n31OrigemErrors($contract,$values)
        )->toBe([]);
    }
);
