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

    /*
     * Workflow isolado para testes de faturacao.
     * Cada fixture recebe uma instancia propria.
     */
    $workflow=new \App\Models\ChecklistProcessTemplate([
        'codigo'=>'b4n6_financeiro_'.
            str_replace(
                '-',
                '',
                (string)\Illuminate\Support\Str::uuid()
            ),
        'nome'=>'Workflow financeiro de teste',
        'ativo'=>true,
        'versao'=>1,
    ]);

    $workflow->tenant_id=$tenant->id;
    $workflow->save();

    $workflowItem=new \App\Models\ChecklistProcessTemplateItem([
        'codigo'=>'gerar_documento',
        'ordem'=>1,
        'titulo'=>'Gerar documento financeiro',
        'tipo'=>'gerar_documento',
        'obrigatorio'=>true,
        'configuracao'=>[],
    ]);

    $workflowItem->template_id=$workflow->id;
    $workflowItem->save();
    $type=new TipoContrato([
        'nome'=>'Tipo Financeiro '.$suffix,
        'slug'=>'tipo-b4n6-'.strtolower($suffix),
        'codigo'=>$code,
        'template_id'=>$template->id,
        'checklist_process_template_id'=>$workflow->id,
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

/*
 * FROTAPRO_4P12_VALID_PNG_TEST_FIXTURE
 *
 * PNG RGB valido, gerado sem GD nem bibliotecas externas.
 * Sao imagens sinteticas para testes automatizados.
 *
 * Cada linha utiliza filtro PNG 0 (None).
 * Os blocos IHDR, IDAT e IEND recebem CRC real.
 */
function b4p12SignaturePng(string $who):string
{
    if(!in_array($who,['empresa','motorista'],true)){
        throw new \InvalidArgumentException(
            'Identificador de assinatura desconhecido.'
        );
    }

    $width=192;
    $height=64;
    $raw='';

    for($y=0;$y<$height;$y++){
        // PNG filter type 0.
        $raw.="\x00";

        for($x=0;$x<$width;$x++){
            $curve=$who==='empresa'
                ? 32+(int)round(10*sin($x/12.0))
                    +(int)round(3*cos($x/5.0))
                : 29+(int)round(8*cos($x/9.0))
                    +(int)round(4*sin($x/4.0));

            $stroke=
                $x>=12 &&
                $x<=178 &&
                abs($y-$curve)<=1;

            $raw.=$stroke
                ? "\x15\x25\x35"
                : "\xff\xff\xff";
        }
    }

    $chunk=static function(
        string $type,
        string $payload
    ):string{
        $body=$type.$payload;

        return pack('N',strlen($payload)).
            $body.
            pack('N',crc32($body));
    };

    $png="\x89PNG\r\n\x1a\n".
        $chunk(
            'IHDR',
            pack(
                'NNCCCCC',
                $width,
                $height,
                8,
                2,
                0,
                0,
                0
            )
        ).
        $chunk(
            'IDAT',
            gzcompress($raw,9)
        ).
        $chunk('IEND','');

    return 'data:image/png;base64,'.
        base64_encode($png);
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

        $sequence=b4n6Sequence();

        expect(Documento::query()
            ->where('entidade_tipo','contrato')
            ->where('entidade_id',$contract->id)
            ->exists())->toBeFalse();

        $issued=app(ContratoPdfService::class)
            ->generate(
                $contract->id,
                $tenant->id,
                $user
            );

        $after=b4n6Document($contract);
        $initialCode=$after->codigo;

        expect($initialCode)->toMatch('/^G\d{6}$/');
        expect(b4n6Sequence())->toBe($sequence+1);

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

test('4p8 emissao financeira incompleta nao reserva numero',function(){
    Storage::fake('local');

    [$tenant,$user,,$type]=b4n6Fixture(
        'correcao',
        'prestacao_servico'
    );

    $contract=b4n6Create(
        $tenant,$user,$type,b4n6Fields()
    );

    $sequence=b4n6Sequence();

    $documentQuery=fn()=>Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contract->id);

    expect($documentQuery()->exists())->toBeFalse();

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
    expect($documentQuery()->exists())->toBeFalse();
    expect(b4n6Sequence())->toBe($sequence);

    expect(Storage::disk('local')
        ->allFiles('contract-pdfs'))->toBe([]);

    $corrected=app(ContratoService::class)
        ->updateDraft(
            $contract->id,
            $tenant->id,
            [
                'campos_preenchidos'=>b4n6Fields(
                    'mista','50','quinzenal'
                ),
            ],
            $user
        );

    expect($corrected->campos_preenchidos['CONDICOES_COBRANCA'])
        ->toContain('50,00 €');

    expect($documentQuery()->exists())->toBeFalse();

    $issued=app(ContratoPdfService::class)
        ->generate(
            $contract->id,
            $tenant->id,
            $user
        );

    $doc=$documentQuery()->firstOrFail();

    expect($doc->codigo)->toMatch('/^G\d{6}$/');
    expect(b4n6Sequence())->toBe($sequence+1);

    expect($issued->pdf_gerado_url)->not->toBeNull();

    Storage::disk('local')->assertExists(
        $issued->pdf_gerado_url
    );

    $text=(new Parser())->parseContent(
        Storage::disk('local')->get(
            $issued->pdf_gerado_url
        )
    )->getText();

    expect($text)->toContain('50,00');
    expect($text)->toContain($doc->codigo);

    expect(LogAuditoriaContrato::query()
        ->where('contrato_id',$contract->id)
        ->where('acao','geracao_pdf')
        ->count())->toBe(1);
});

test('4p8 nif invalido bloqueia criacao assinada e imagem surge no pdf',function(){
    Storage::fake('local');

    [$tenant,$user,$template,$type]=b4n6Fixture(
        'nif4p8',
        'contrato_de_prestacao_de_servicos'
    );

    $template->conteudo_original .=
        "\nNIF: {{EMPRESA_NIF}}\n".
        "Assinatura: {{ASSINATURA_EMPRESA}}\n";

    $template->save();

    $type->entidades=['empresa'=>true];

    $type->assinaturas_configuracao=[
        [
            'placeholder'=>'ASSINATURA_EMPRESA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
    ];

    $type->save();

    $empresa=new \App\Models\Empresa([
        'nome_empresa'=>'Empresa de Teste 4P8',
        'nif'=>'111111111',
        'ativo'=>true,
        'endereco_rua'=>'Rua dos Testes',
        'endereco_cep'=>'1000-001',
        'endereco_cidade'=>'Lisboa',
    ]);

    $empresa->tenant_id=$tenant->id;
    $empresa->save();

    // Imagem sintetica com CRC valido.
    $signature=b4p12SignaturePng('empresa');

    $payload=[
        'tipo_contrato_id'=>$type->id,
        'empresa_id'=>$empresa->id,
        'data_inicio'=>'2026-11-05',
        'data_fim'=>'2027-11-05',
        'campos_preenchidos'=>b4n6Fields(
            'fixa','100','mensal'
        ),
        'assinaturas'=>[
            [
                'placeholder'=>'ASSINATURA_EMPRESA',
                'modo'=>'presencial',
                'assinatura_url'=>$signature,
            ],
        ],
    ];

    $sequence=b4n6Sequence();

    expect(fn()=>app(ContratoService::class)
        ->create($payload,$user,$tenant->id)
    )->toThrow(ValidationException::class);

    expect(Contrato::query()
        ->where('tenant_id',$tenant->id)
        ->count())->toBe(0);

    expect(b4n6Sequence())->toBe($sequence);

    // Corrigir a origem, nunca substituir o NIF
    // automatico por um campo livre do wizard.
    $empresa->nif='501964843';
    $empresa->save();

    $contract=app(ContratoService::class)
        ->create($payload,$user,$tenant->id);

    expect($contract->status)->toBe('assinado');

    expect(Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contract->id)
        ->exists())->toBeFalse();

    expect(b4n6Sequence())->toBe($sequence);

    $contract->load([
        'template',
        'empresa',
        'assinaturas',
    ]);

    $html=app(ContratoPdfService::class)
        ->renderHtml($contract,$empresa,false);

    expect($html)->toContain(
        '<img src="data:image/png;base64,'
    );

    expect(strip_tags($html))
        ->not->toContain('data:image/png;base64,');

    $issued=app(ContratoPdfService::class)
        ->generate($contract->id,$tenant->id,$user);

    $doc=Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contract->id)
        ->firstOrFail();

    expect($doc->codigo)->toMatch('/^G\d{6}$/');
    expect(b4n6Sequence())->toBe($sequence+1);

    expect($issued->hash_documento)
        ->toMatch('/^[a-f0-9]{64}$/');

    Storage::disk('local')->assertExists(
        $issued->pdf_gerado_url
    );

    $binary=Storage::disk('local')
        ->get($issued->pdf_gerado_url);

    expect($binary)->toStartWith('%PDF-');
    expect(hash('sha256',$binary))
        ->toBe($issued->hash_documento);
});

/*
 * FROTAPRO 4P.11
 * Testes de integridade, sem acesso a MySQL operacional.
 */

test('4p11 falha apos reservar numero reverte documento e ficheiro',function(){
    Storage::fake('local');

    [$tenant,$user,,$type]=b4n6Fixture(
        'rollback4p11',
        'prestacao_servico'
    );

    $contract=b4n6Create(
        $tenant,
        $user,
        $type,
        b4n6Fields('fixa','100','mensal')
    );

    $sequence=b4n6Sequence();

    $documentQuery=fn()=>Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contract->id);

    expect($documentQuery()->exists())->toBeFalse();

    $mock=\Mockery::mock(
        \App\Services\ChecklistProcessService::class
    );

    $mock->shouldReceive('completeDocumentGeneration')
        ->once()
        ->andThrow(
            new \RuntimeException(
                'FALHA_CONTROLADA_4P11'
            )
        );

    app()->instance(
        \App\Services\ChecklistProcessService::class,
        $mock
    );

    expect(fn()=>app(ContratoPdfService::class)
        ->generate(
            $contract->id,
            $tenant->id,
            $user
        )
    )->toThrow(
        \RuntimeException::class,
        'FALHA_CONTROLADA_4P11'
    );

    expect($documentQuery()->exists())->toBeFalse();
    expect(b4n6Sequence())->toBe($sequence);

    $fresh=$contract->fresh();

    expect($fresh->pdf_gerado_url)->toBeNull();
    expect($fresh->hash_documento)->toBeNull();

    expect(
        Storage::disk('local')->allFiles('contract-pdfs')
    )->toBe([]);

    expect(LogAuditoriaContrato::query()
        ->where('contrato_id',$contract->id)
        ->where('acao','geracao_pdf')
        ->count())->toBe(0);
});

test('4p11 pdf incorpora assinatura empresa e motorista como imagens',function(){
    Storage::fake('local');

    [$tenant,$user,$template,$type]=b4n6Fixture(
        'assinaturas4p11',
        'contrato_de_prestacao_de_servicos'
    );

    $template->conteudo_original .=
        "\nNIF: {{EMPRESA_NIF}}\n".
        "Empresa: {{ASSINATURA_EMPRESA}}\n".
        "Motorista: {{ASSINATURA_MOTORISTA}}\n";

    $template->save();

    $type->entidades=[
        'empresa'=>true,
        'motorista'=>true,
    ];

    $type->assinaturas_configuracao=[
        [
            'placeholder'=>'ASSINATURA_EMPRESA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
        [
            'placeholder'=>'ASSINATURA_MOTORISTA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
    ];

    $type->save();

    $empresa=new \App\Models\Empresa([
        'nome_empresa'=>'Empresa Teste Assinaturas',
        'nif'=>'501964843',
        'ativo'=>true,
        'endereco_rua'=>'Rua de Teste',
        'endereco_cep'=>'1000-001',
        'endereco_cidade'=>'Lisboa',
    ]);

    $empresa->tenant_id=$tenant->id;
    $empresa->save();

    $motorista=new \App\Models\Motorista([
        'nome_completo'=>'Motorista Teste Assinaturas',
        'ativo'=>true,
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->save();

    $empresaPng=b4p12SignaturePng('empresa');
    $motoristaPng=b4p12SignaturePng('motorista');

    expect($empresaPng)->not->toBe($motoristaPng);

    foreach([$empresaPng,$motoristaPng] as $image){
        $decoded=base64_decode(
            substr($image,strpos($image,',')+1),
            true
        );

        expect($decoded)->not->toBeFalse();

        $info=getimagesizefromstring($decoded);

        expect($info)->not->toBeFalse();
        expect($info[0])->toBe(192);
        expect($info[1])->toBe(64);
    }

    $contract=app(ContratoService::class)->create([
        'tipo_contrato_id'=>$type->id,
        'empresa_id'=>$empresa->id,
        'motorista_id'=>$motorista->id,
        'data_inicio'=>'2026-11-05',
        'data_fim'=>'2027-11-05',
        'campos_preenchidos'=>b4n6Fields(
            'fixa','100','mensal'
        ),
        'assinaturas'=>[
            [
                'placeholder'=>'ASSINATURA_EMPRESA',
                'modo'=>'presencial',
                'assinatura_url'=>$empresaPng,
            ],
            [
                'placeholder'=>'ASSINATURA_MOTORISTA',
                'modo'=>'presencial',
                'assinatura_url'=>$motoristaPng,
            ],
        ],
    ],$user,$tenant->id);

    expect($contract->status)->toBe('assinado');

    $contract->load([
        'template',
        'empresa',
        'motorista',
        'assinaturas',
    ]);

    $html=app(ContratoPdfService::class)
        ->renderHtml($contract,$empresa,false);

    preg_match_all(
        '/<img\b[^>]*class="signature"[^>]*>/iu',
        $html,
        $matches
    );

    expect(count($matches[0]))->toBe(2);

    expect(strip_tags($html))
        ->not->toContain('data:image/png;base64,');

    $sequence=b4n6Sequence();

    $issued=app(ContratoPdfService::class)
        ->generate(
            $contract->id,
            $tenant->id,
            $user
        );

    expect(b4n6Sequence())->toBe($sequence+1);

    Storage::disk('local')
        ->assertExists($issued->pdf_gerado_url);

    $binary=Storage::disk('local')
        ->get($issued->pdf_gerado_url);

    expect($binary)->toStartWith('%PDF-');

    /*
     * Pelo menos um recurso de imagem no PDF.
     * Duas ocorrencias iguais podem partilhar
     * um unico recurso de imagem internamente.
     */
    /*
     * A empresa e o motorista usam imagens
     * diferentes. O PDF deve incorporar ambas.
     */
    preg_match_all(
        '/\/Subtype\s*\/Image\b/',
        $binary,
        $embeddedImages
    );

    expect(count($embeddedImages[0]))
        ->toBeGreaterThanOrEqual(2);

    $text=(new Parser())
        ->parseContent($binary)
        ->getText();

    expect($text)
        ->not->toContain('data:image/png;base64,')
        ->not->toContain('iVBORw0KGgo');

    expect(hash('sha256',$binary))
        ->toBe($issued->hash_documento);
});

/*
 * FROTAPRO_4P18_PREVIEW_INTEGRADO
 *
 * Testes em SQLite isolado.
 * Nenhuma emissao documental definitiva.
 */

test('4p18 preview dos tres contratos financeiros nao consome numero',function(){
    Storage::fake('local');

    $cases=[
        [
            'servicos',
            'contrato_de_prestacao_de_servicos',
            'fixa',
            '100',
            'mensal',
            '100,00',
            'mensal',
        ],
        [
            'singular',
            'aluguer_tvde_pessoa_singular',
            'variavel',
            '25',
            'semanal',
            '5%',
            'semanal',
        ],
        [
            'coletiva',
            'aluguer_tvde_pessoa_coletiva',
            'mista',
            '50',
            'quinzenal',
            '50,00',
            'quinzenal',
        ],
    ];

    foreach($cases as [
        $suffix,
        $code,
        $mode,
        $amount,
        $period,
        $expectedAmount,
        $expectedPeriod
    ]){
        [$tenant,$user,$template,$type]=b4n6Fixture(
            '4p18-'.$suffix,
            $code
        );

        $sequenceBefore=b4n6Sequence();
        $contractsBefore=Contrato::count();
        $documentsBefore=Documento::count();
        $logsBefore=LogAuditoriaContrato::count();

        $result=app(
            \App\Services\ContratoPreviewService::class
        )->preview(
            [
                'tipo_contrato_id'=>$type->id,
                'data_inicio'=>'2026-11-07',
                'data_fim'=>'2027-11-07',
                'campos_preenchidos'=>b4n6Fields(
                    $mode,
                    $amount,
                    $period
                ),
                'assinaturas'=>[],
            ],
            $tenant->id
        );

        $html=$result['html'];

        expect($html)
            ->toBeString()
            ->toContain('preview-mode')
            ->toContain('CONTRATO FINANCEIRO DE TESTE')
            ->toContain($expectedAmount)
            ->toContain($expectedPeriod);

        expect($result['meta']['preview'])->toBeTrue();
        expect($result['meta']['tipo_contrato_id'])
            ->toBe($type->id);

        expect(b4n6Sequence())->toBe($sequenceBefore);
        expect(Contrato::count())->toBe($contractsBefore);
        expect(Documento::count())->toBe($documentsBefore);
        expect(LogAuditoriaContrato::count())->toBe($logsBefore);

        expect(Storage::disk('local')
            ->allFiles('contract-pdfs'))->toBe([]);
    }
});

test('4p18 preview apresenta as duas assinaturas sem persistencia',function(){
    Storage::fake('local');

    [$tenant,$user,$template,$type]=b4n6Fixture(
        '4p18-assinaturas',
        'contrato_de_prestacao_de_servicos'
    );

    $template->conteudo_original .=
        "\nAssinatura Empresa: {{ASSINATURA_EMPRESA}}\n".
        "Assinatura Motorista: {{ASSINATURA_MOTORISTA}}\n";

    $template->save();

    $type->assinaturas_configuracao=[
        [
            'placeholder'=>'ASSINATURA_EMPRESA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
        [
            'placeholder'=>'ASSINATURA_MOTORISTA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
    ];

    $type->save();

    $empresaPng=b4p12SignaturePng('empresa');
    $motoristaPng=b4p12SignaturePng('motorista');

    expect($empresaPng)->not->toBe($motoristaPng);

    $sequenceBefore=b4n6Sequence();

    $result=app(
        \App\Services\ContratoPreviewService::class
    )->preview(
        [
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-11-07',
            'data_fim'=>'2027-11-07',
            'campos_preenchidos'=>b4n6Fields(
                'fixa',
                '100',
                'mensal'
            ),
            'assinaturas'=>[
                [
                    'placeholder'=>'ASSINATURA_EMPRESA',
                    'modo'=>'presencial',
                    'assinatura_url'=>$empresaPng,
                ],
                [
                    'placeholder'=>'ASSINATURA_MOTORISTA',
                    'modo'=>'presencial',
                    'assinatura_url'=>$motoristaPng,
                ],
            ],
        ],
        $tenant->id
    );

    $html=$result['html'];

    expect(substr_count($html,'class="signature"'))
        ->toBe(2);

    expect($html)
        ->toContain($empresaPng)
        ->toContain($motoristaPng);

    expect(strip_tags($html))
        ->not->toContain('data:image/png;base64,');

    expect(b4n6Sequence())->toBe($sequenceBefore);
    expect(Contrato::count())->toBe(0);
    expect(Documento::count())->toBe(0);
    expect(LogAuditoriaContrato::count())->toBe(0);

    expect(Storage::disk('local')
        ->allFiles('contract-pdfs'))->toBe([]);
});

test('4p18 preview financeiro incompleto e rejeitado sem efeitos',function(){
    Storage::fake('local');

    [$tenant,$user,$template,$type]=b4n6Fixture(
        '4p18-incompleto',
        'aluguer_tvde_pessoa_coletiva'
    );

    $fields=b4n6Fields(
        'mista',
        '50',
        'quinzenal'
    );

    unset($fields['BASE_CALCULO_COBRANCA']);

    $sequenceBefore=b4n6Sequence();

    expect(fn()=>app(
        \App\Services\ContratoPreviewService::class
    )->preview(
        [
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-11-07',
            'data_fim'=>'2027-11-07',
            'campos_preenchidos'=>$fields,
        ],
        $tenant->id
    ))->toThrow(ValidationException::class);

    expect(b4n6Sequence())->toBe($sequenceBefore);
    expect(Contrato::count())->toBe(0);
    expect(Documento::count())->toBe(0);

    expect(Storage::disk('local')
        ->allFiles('contract-pdfs'))->toBe([]);
});

/*
 * FROTAPRO_4P19_PDF_HTTP
 *
 * Endpoint real de preview PDF.
 * Os dados sao criados apenas no SQLite dos testes.
 */

function b4p19Login(
    $test,
    Tenant $tenant,
    User $user
):void{
    $user->forceFill([
        'password'=>\Illuminate\Support\Facades\Hash::make(
            'SenhaTeste123!'
        ),
        'ativo'=>true,
    ])->save();

    \App\Models\TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=\App\Models\Role::firstOrCreate(
        ['codigo'=>'funcionario'],
        [
            'nome'=>'Funcionário',
            'sistema'=>true,
        ]
    );

    \App\Models\UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    $permission=\App\Models\Permission::firstOrCreate(
        ['codigo'=>'contratos'],
        [
            'modulo'=>'contratos',
            'nome'=>'Contratos',
        ]
    );

    \App\Models\RolePermission::updateOrCreate(
        [
            'role_id'=>$role->id,
            'permission_id'=>$permission->id,
        ],
        [
            'nivel'=>'configurar',
        ]
    );

    $test->withHeaders([
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ])->postJson(
        '/login',
        [
            'email'=>$user->email,
            'password'=>'SenhaTeste123!',
        ]
    )->assertOk();
}

/*
 * FROTAPRO_4P19_2_ISOLATED_DATASETS
 *
 * Cada tipo contratual e um teste Pest independente.
 * Cada execucao recebe nova aplicacao, sessao e
 * banco SQLite de teste com RefreshDatabase.
 */
test('4p19 rota pdf gera tres tipos sem numero definitivo',function(
    string $suffix,
    string $code,
    string $mode,
    string $period
){
    Storage::fake('local');

    [$tenant,$user,$template,$type]=b4n6Fixture(
        $suffix,
        $code
    );

    /*
     * Um unico login por teste.
     * Nao reutilizar a sessao entre tenants.
     */
    b4p19Login($this,$tenant,$user);

    $sequenceBefore=b4n6Sequence();
    $contractsBefore=Contrato::count();
    $documentsBefore=Documento::count();
    $logsBefore=LogAuditoriaContrato::count();

    $response=$this->postJson(
        '/api/contratos/preview-pdf',
        [
            'tipo_contrato_id'=>$type->id,
            'data_inicio'=>'2026-11-07',
            'data_fim'=>'2027-11-07',
            'campos_preenchidos'=>b4n6Fields(
                $mode,
                '50',
                $period
            ),
            'assinaturas'=>[],
        ]
    );

    $response->assertOk();
    $response->assertHeader(
        'Content-Type',
        'application/pdf'
    );

    $binary=$response->getContent();

    expect($binary)->toStartWith('%PDF-');
    expect(strlen($binary))->toBeGreaterThan(1000);

    $text=(new Parser())
        ->parseContent($binary)
        ->getText();

    /*
     * Um preview nao pode usar numero definitivo.
     */
    expect($text)->toContain('A ATRIBUIR');

    expect(b4n6Sequence())->toBe($sequenceBefore);
    expect(Contrato::count())->toBe($contractsBefore);
    expect(Documento::count())->toBe($documentsBefore);
    expect(LogAuditoriaContrato::count())->toBe($logsBefore);

    expect(
        Storage::disk('local')->allFiles('contract-pdfs')
    )->toBe([]);
})->with([
    'prestacao-de-servicos'=>[
        '4p19-servicos',
        'contrato_de_prestacao_de_servicos',
        'fixa',
        'mensal',
    ],
    'aluguer-pessoa-singular'=>[
        '4p19-singular',
        'aluguer_tvde_pessoa_singular',
        'variavel',
        'semanal',
    ],
    'aluguer-pessoa-coletiva'=>[
        '4p19-coletiva',
        'aluguer_tvde_pessoa_coletiva',
        'mista',
        'quinzenal',
    ],
]);

test('4p19 rota pdf incorpora duas assinaturas sem guardar contrato',function(){
    Storage::fake('local');

    [$tenant,$user,$template,$type]=b4n6Fixture(
        '4p19-assinaturas',
        'contrato_de_prestacao_de_servicos'
    );

    $template->conteudo_original .=
        "\nNIF: {{EMPRESA_NIF}}\n".
        "Empresa: {{ASSINATURA_EMPRESA}}\n".
        "Motorista: {{ASSINATURA_MOTORISTA}}\n";

    $template->save();

    $type->entidades=[
        'empresa'=>true,
        'motorista'=>true,
    ];

    $type->assinaturas_configuracao=[
        [
            'placeholder'=>'ASSINATURA_EMPRESA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
        [
            'placeholder'=>'ASSINATURA_MOTORISTA',
            'obrigatoria'=>true,
            'modos'=>['presencial'],
        ],
    ];

    $type->save();

    $empresa=new \App\Models\Empresa([
        'nome_empresa'=>'Empresa de Teste PDF',
        'nif'=>'501964843',
        'ativo'=>true,
        'endereco_rua'=>'Rua de Teste',
        'endereco_cep'=>'1000-001',
        'endereco_cidade'=>'Lisboa',
    ]);

    $empresa->tenant_id=$tenant->id;
    $empresa->save();

    $motorista=new \App\Models\Motorista([
        'nome_completo'=>'Motorista de Teste PDF',
        'ativo'=>true,
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->save();

    b4p19Login($this,$tenant,$user);

    $empresaPng=b4p12SignaturePng('empresa');
    $motoristaPng=b4p12SignaturePng('motorista');

    $seq=b4n6Sequence();

    $response=$this->postJson(
        '/api/contratos/preview-pdf',
        [
            'tipo_contrato_id'=>$type->id,
            'empresa_id'=>$empresa->id,
            'motorista_id'=>$motorista->id,
            'data_inicio'=>'2026-11-07',
            'data_fim'=>'2027-11-07',
            'campos_preenchidos'=>b4n6Fields(
                'fixa','100','mensal'
            ),
            'assinaturas'=>[
                [
                    'placeholder'=>'ASSINATURA_EMPRESA',
                    'modo'=>'presencial',
                    'assinatura_url'=>$empresaPng,
                ],
                [
                    'placeholder'=>'ASSINATURA_MOTORISTA',
                    'modo'=>'presencial',
                    'assinatura_url'=>$motoristaPng,
                ],
            ],
        ]
    );

    $response->assertOk();
    $response->assertHeader(
        'Content-Type','application/pdf'
    );

    $binary=$response->getContent();

    expect($binary)->toStartWith('%PDF-');

    preg_match_all(
        '/\/Subtype\s*\/Image\b/',
        $binary,
        $images
    );

    expect(count($images[0]))
        ->toBeGreaterThanOrEqual(2);

    $text=(new Parser())
        ->parseContent($binary)
        ->getText();

    expect($text)->not->toContain(
        'data:image/png;base64,'
    );

    expect(b4n6Sequence())->toBe($seq);
    expect(Contrato::count())->toBe(0);
    expect(Documento::count())->toBe(0);
    expect(LogAuditoriaContrato::count())->toBe(0);

    expect(
        Storage::disk('local')->allFiles('contract-pdfs')
    )->toBe([]);
});
