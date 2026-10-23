<?php

use App\Models\Contrato;
use App\Models\Documento;
use App\Models\LogAuditoriaContrato;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TipoContrato;
use App\Models\User;
use App\Services\ContratoPdfService;
use App\Services\ContratoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Smalot\PdfParser\Parser;

uses(RefreshDatabase::class);

function b4n6Fixture(string $suffix,string $code):array
{
    $tenant=Tenant::create([
        'nome'=>'Tenant Documento '.$suffix,
        'slug'=>'tenant-b4n6-'.strtolower($suffix),
        'ativo'=>true,
    ]);

    $user=User::factory()->create();

    $template=new TemplateContrato([
        'nome'=>'Contrato Financeiro '.$suffix,
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>
            "CONTRATO FINANCEIRO DE TESTE\n\n".
            "CLÁUSULA PRIMEIRA\n".
            "Condições: {{CONDICOES_COBRANCA}}.\n".
            "Pagamento: {{PERIODICIDADE_PAGAMENTO_TEXTO}}.",
        'campos_detectados'=>[],
        'campos_mapeados'=>[],
    ]);

    $template->tenant_id=$tenant->id;
    $template->ativo=true;
    $template->save();

    $type=new TipoContrato([
        'nome'=>'Tipo Financeiro '.$suffix,
        'slug'=>'tipo-b4n6-'.strtolower($suffix),
        'codigo'=>$code,
        'template_id'=>$template->id,
        'entidades'=>[],
        'campos_configuracao'=>[],
        'assinaturas_configuracao'=>[],
        'configuracao'=>[],
        'ativo'=>true,
        'mostrar_menu'=>true,
        'ordem'=>1,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    return [$tenant,$user,$template,$type];
}

function b4n6Fields(
    string $mode='mista',
    string $amount='25',
    string $period='quinzenal'
):array{
    $fields=[
        'TIPO_COBRANCA'=>$mode,
        'PERIODICIDADE_PAGAMENTO'=>$period,
    ];

    if($mode==='fixa' || $mode==='mista'){
        $fields['VALOR_FIXO_COBRANCA']=$amount;
    }

    if($mode==='variavel' || $mode==='mista'){
        $fields['PERCENTAGEM_COBRANCA']='5';
        $fields['BASE_CALCULO_COBRANCA']='faturação bruta';
    }

    return $fields;
}

function b4n6Sequence():int
{
    return (int)DB::table('document_sequences')
        ->where('chave','documentos')
        ->value('ultimo_numero');
}

function b4n6Create(
    Tenant $tenant,
    User $user,
    TipoContrato $type,
    array $fields
):Contrato{
    return app(ContratoService::class)->create(
        [
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-10-22',
            'data_fim'=>'2027-10-22',
            'campos_preenchidos'=>$fields,
        ],
        $user,
        $tenant->id
    );
}

function b4n6Document(Contrato $contract):Documento
{
    return Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contract->id)
        ->firstOrFail();
}

test('4n6 criacao incompleta nao cria contrato nem atribui numero',function(){
    Storage::fake('local');

    [$tenant,$user,,$type]=b4n6Fixture(
        'incompleto',
        'prestacao_servico'
    );

    $initial=b4n6Sequence();

    expect(fn()=>b4n6Create(
        $tenant,
        $user,
        $type,
        [
            'TIPO_COBRANCA'=>'mista',
            'VALOR_FIXO_COBRANCA'=>'25',
            'PERIODICIDADE_PAGAMENTO'=>'mensal',
        ]
    ))->toThrow(ValidationException::class);

    expect(Contrato::count())->toBe(0);
    expect(b4n6Sequence())->toBe($initial);
    expect(
        Storage::disk('local')->allFiles('contract-pdfs')
    )->toBe([]);
});

test('4n6 tres modalidades emitem pdf valido mantendo o codigo',function(){
    Storage::fake('local');

    $cases=[
        [
            'sufixo'=>'fixa',
            'codigo'=>'prestacao_servico',
            'campos'=>b4n6Fields('fixa','100','semanal'),
            'provas'=>['100,00','semanal'],
        ],
        [
            'sufixo'=>'variavel',
            'codigo'=>'aluguer_tvde_pessoa_singular',
            'campos'=>b4n6Fields('variavel','25','mensal'),
            'provas'=>['5%','faturação bruta','mensal'],
        ],
        [
            'sufixo'=>'mista',
            'codigo'=>'aluguer_tvde_pessoa_coletiva',
            'campos'=>b4n6Fields('mista','25','quinzenal'),
            'provas'=>['25,00','5%','quinzenal'],
        ],
    ];

    foreach($cases as $case){
        [$tenant,$user,,$type]=b4n6Fixture(
            $case['sufixo'],
            $case['codigo']
        );

        $contract=b4n6Create(
            $tenant,
            $user,
            $type,
            $case['campos']
        );

        expect($contract->exists)->toBeTrue();

        $before=b4n6Document($contract);
        $initialCode=$before->codigo;
        $initialId=$before->id;
        $sequence=b4n6Sequence();

        $issued=app(ContratoPdfService::class)
            ->generate(
                $contract->id,
                $tenant->id,
                $user
            );

        $after=b4n6Document($contract);

        expect($after->id)->toBe($initialId);
        expect($after->codigo)->toBe($initialCode);
        expect(b4n6Sequence())->toBe($sequence);

        expect($issued->pdf_gerado_url)->not->toBeNull();
        expect($issued->hash_documento)
            ->toMatch('/^[a-f0-9]{64}$/');

        Storage::disk('local')->assertExists(
            $issued->pdf_gerado_url
        );

        $binary=Storage::disk('local')->get(
            $issued->pdf_gerado_url
        );

        expect($binary)->toStartWith('%PDF-');
        expect(hash('sha256',$binary))
            ->toBe($issued->hash_documento);

        $text=(new Parser())
            ->parseContent($binary)
            ->getText();

        $text=preg_replace('/\s+/u',' ',$text)??$text;

        foreach($case['provas'] as $value){
            expect($text)->toContain($value);
        }

        expect($text)->toContain($initialCode);

        expect(LogAuditoriaContrato::query()
            ->where('contrato_id',$contract->id)
            ->where('acao','geracao_pdf')
            ->count()
        )->toBe(1);
    }
});

test('4n6 emissao incompleta preserva numero e permite correcao',function(){
    Storage::fake('local');

    [$tenant,$user,,$type]=b4n6Fixture(
        'correcao',
        'prestacao_servico'
    );

    $contract=b4n6Create(
        $tenant,
        $user,
        $type,
        b4n6Fields()
    );

    $document=b4n6Document($contract);

    $documentId=$document->id;
    $documentCode=$document->codigo;
    $sequence=b4n6Sequence();

    $invalid=$contract->campos_preenchidos;
    unset($invalid['BASE_CALCULO_COBRANCA']);

    $contract->campos_preenchidos=$invalid;
    $contract->save();

    expect(fn()=>app(ContratoPdfService::class)
        ->generate(
            $contract->id,
            $tenant->id,
            $user
        )
    )->toThrow(ValidationException::class);

    expect($contract->fresh()->pdf_gerado_url)->toBeNull();
    expect(b4n6Sequence())->toBe($sequence);

    expect(b4n6Document($contract)->id)->toBe($documentId);
    expect(b4n6Document($contract)->codigo)->toBe($documentCode);

    expect(
        Storage::disk('local')->allFiles('contract-pdfs')
    )->toBe([]);

    expect(LogAuditoriaContrato::query()
        ->where('contrato_id',$contract->id)
        ->where('acao','geracao_pdf')
        ->count()
    )->toBe(0);

    $corrected=app(ContratoService::class)
        ->updateDraft(
            $contract->id,
            $tenant->id,
            [
                'campos_preenchidos'=>b4n6Fields(
                    'mista',
                    '50',
                    'quinzenal'
                ),
            ],
            $user
        );

    expect(
        $corrected->campos_preenchidos['CONDICOES_COBRANCA']
    )->toContain('50,00 €');

    $issued=app(ContratoPdfService::class)
        ->generate(
            $contract->id,
            $tenant->id,
            $user
        );

    expect($issued->pdf_gerado_url)->not->toBeNull();

    Storage::disk('local')->assertExists(
        $issued->pdf_gerado_url
    );

    expect(b4n6Sequence())->toBe($sequence);
    expect(b4n6Document($contract)->id)->toBe($documentId);
    expect(b4n6Document($contract)->codigo)->toBe($documentCode);

    $text=(new Parser())
        ->parseContent(
            Storage::disk('local')->get(
                $issued->pdf_gerado_url
            )
        )
        ->getText();

    expect($text)->toContain('50,00');

    expect(LogAuditoriaContrato::query()
        ->where('contrato_id',$contract->id)
        ->where('acao','geracao_pdf')
        ->count()
    )->toBe(1);
});
