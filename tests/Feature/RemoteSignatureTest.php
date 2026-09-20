<?php

use App\Models\AssinaturaDigital;
use App\Models\ChecklistProcessRun;
use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\LogAuditoriaContrato;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Veiculo;
use App\Services\ContratoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function remoteSignaturePng(): string
{
    return 'data:image/png;base64,' .
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' .
        'CAQAAAC1HAwCAAAAC0lEQVR42mNk+A8A' .
        'AQUBAScY42YAAAAASUVORK5CYII=';
}

function remoteSignatureFixture(
    bool $duasAssinaturas = false,
    bool $comProcesso = false
): array {
    $tenant = Tenant::create([
        'nome' =>
        'Tenant Assinatura Remota',
        'slug' =>
        'tenant-assinatura-remota-' .
            strtolower(
                str()->random(8)
            ),
        'ativo' => true,
    ]);

    $actor =
        User::factory()->create();

    $motorista =
        new Motorista([
            'nome_completo' =>
            'Motorista Remoto',
            'email' =>
            'motorista@remoto.test',
        ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->save();

    $proprietario =
        new Proprietario([
            'tipo' =>
            'pessoa_fisica',
            'nome_completo' =>
            'Proprietário Remoto',
            'email' =>
            'proprietario@remoto.test',
        ]);

    $proprietario->tenant_id =
        $tenant->id;

    $proprietario->save();

    $veiculo =
        new Veiculo([
            'matricula' =>
            'RM-10-TO',
            'marca' =>
            'Tesla',
            'modelo' =>
            'Model 3',
            'valor_aluguel' =>
            350,
        ]);

    $veiculo->tenant_id =
        $tenant->id;

    $veiculo->save();

    $conteudo =
        '{{ASSINATURA_MOTORISTA}}';

    if ($duasAssinaturas) {
        $conteudo .=
            "\n{{ASSINATURA_PROPRIETARIO}}";
    }

    $processo = null;

    if ($comProcesso) {
        $processo =
            new ChecklistProcessTemplate([
                'codigo' =>
                'assinatura_remota_' .
                    strtolower(
                        str()->random(8)
                    ),

                'nome' =>
                'Processo Assinatura Remota',

                'descricao' =>
                'Processo usado no teste de assinatura remota.',

                'ativo' =>
                true,

                'versao' =>
                1,
            ]);

        $processo->tenant_id =
            $tenant->id;

        $processo->save();

        $item =
            new ChecklistProcessTemplateItem([
                'codigo' =>
                'assinatura_motorista',

                'ordem' =>
                1,

                'titulo' =>
                'Assinatura do motorista',

                'tipo' =>
                'assinatura',

                'obrigatorio' =>
                true,

                'configuracao' => [
                    'placeholder' =>
                    'ASSINATURA_MOTORISTA',
                ],
            ]);

        $item->template_id =
            $processo->id;

        $item->save();
    }

    $template =
        new TemplateContrato([
            'nome' =>
            'Contrato Remoto',
            'tipo_arquivo' =>
            'txt',
            'checklist_process_template_id' =>
            $processo?->id,
            'conteudo_original' =>
            $conteudo,
            'campos_detectados' =>
            [],
            'campos_mapeados' =>
            [],
        ]);

    $template->tenant_id =
        $tenant->id;

    $template->save();

    $assinaturas = [
        [
            'placeholder' =>
            'ASSINATURA_MOTORISTA',
            'modo' =>
            'remota',
        ],
    ];

    if ($duasAssinaturas) {
        $assinaturas[] = [
            'placeholder' =>
            'ASSINATURA_PROPRIETARIO',
            'modo' =>
            'remota',
        ];
    }

    $contrato =
        app(ContratoService::class)
        ->create(
            [
                'template_id' =>
                $template->id,
                'tipo' =>
                'aluguer',
                'motorista_id' =>
                $motorista->id,
                'proprietario_id' =>
                $proprietario->id,
                'veiculo_id' =>
                $veiculo->id,
                'data_inicio' =>
                '2026-10-01',
                'assinaturas' =>
                $assinaturas,
            ],
            $actor,
            $tenant->id,
            '127.0.0.1',
            'Pest'
        );

    $rows =
        AssinaturaDigital::query()
        ->where(
            'contrato_id',
            $contrato->id
        )
        ->orderBy(
            'placeholder'
        )
        ->get();

    return [
        $tenant,
        $contrato,
        $rows,
        $motorista,
        $proprietario,
        $veiculo,
    ];
}

test('token remoto inválido retorna 404', function () {
    $this->getJson(
        '/api/assinaturas/remotas/' .
            str()->uuid()
    )->assertNotFound();
});

test('preview remoto não expõe otp nem token de verificação', function () {
    [
        $tenant,
        $contrato,
        $assinaturas,
    ] = remoteSignatureFixture();

    $assinatura =
        $assinaturas->first();

    $token =
        $assinatura
        ->token_verificacao;

    $this->getJson(
        "/api/assinaturas/remotas/{$token}"
    )
        ->assertOk()
        ->assertJsonPath(
            'data.assinatura.id',
            $assinatura->id
        )
        ->assertJsonPath(
            'data.contrato.id',
            $contrato->id
        )
        ->assertJsonPath(
            'data.contrato.status',
            'enviado'
        )
        ->assertJsonPath(
            'data.template.nome',
            'Contrato Remoto'
        )
        ->assertJsonMissingPath(
            'data.assinatura.codigo_otp'
        )
        ->assertJsonMissingPath(
            'data.assinatura.token_verificacao'
        );

    expect(
        $this->getJson(
            "/api/assinaturas/remotas/{$token}"
        )->json(
            'data.assinatura.signatario_email'
        )
    )->not->toBe(
        $assinatura
            ->signatario_email
    );
});

test('otp incorreto não altera assinatura nem cria arquivo', function () {
    Storage::fake('local');

    [
        $tenant,
        $contrato,
        $assinaturas,
    ] = remoteSignatureFixture();

    $assinatura =
        $assinaturas->first();

    $otpIncorreto =
        $assinatura->codigo_otp ===
        '000000'
        ? '999999'
        : '000000';

    $this->postJson(
        '/api/assinaturas/remotas/' .
            $assinatura
            ->token_verificacao .
            '/confirmar',
        [
            'codigo_otp' =>
            $otpIncorreto,
            'aceite' => true,
            'assinatura' =>
            remoteSignaturePng(),
        ]
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'codigo_otp'
        );

    $assinatura->refresh();
    $contrato->refresh();

    expect(
        $assinatura->status
    )->toBe('pendente');

    expect(
        $assinatura->verificado
    )->toBeFalse();

    expect(
        $contrato->status
    )->toBe('enviado');

    expect(
        Storage::disk('local')
            ->allFiles()
    )->toBe([]);
});

test('otp expirado não permite assinatura', function () {
    Storage::fake('local');

    [
        $tenant,
        $contrato,
        $assinaturas,
    ] = remoteSignatureFixture();

    $assinatura =
        $assinaturas->first();

    $otp =
        $assinatura->codigo_otp;

    $assinatura->otp_expira_em =
        now()->subMinute();

    $assinatura->save();

    $this->postJson(
        '/api/assinaturas/remotas/' .
            $assinatura
            ->token_verificacao .
            '/confirmar',
        [
            'codigo_otp' =>
            $otp,
            'aceite' => true,
            'assinatura' =>
            remoteSignaturePng(),
        ]
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'codigo_otp'
        );

    expect(
        Storage::disk('local')
            ->allFiles()
    )->toBe([]);
});

test('última assinatura remota assina contrato e ativa veículo', function () {
    Storage::fake('local');

    [
        $tenant,
        $contrato,
        $assinaturas,
        $motorista,
        $proprietario,
        $veiculo,
    ] = remoteSignatureFixture();

    $assinatura =
        $assinaturas->first();

    $otp =
        $assinatura->codigo_otp;

    $response =
        $this->postJson(
            '/api/assinaturas/remotas/' .
                $assinatura
                ->token_verificacao .
                '/confirmar',
            [
                'codigo_otp' =>
                $otp,
                'aceite' => true,
                'assinatura' =>
                remoteSignaturePng(),
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'assinado'
        )
        ->assertJsonPath(
            'data.verificado',
            true
        )
        ->assertJsonPath(
            'data.contrato_status',
            'assinado'
        );

    $assinatura->refresh();
    $contrato->refresh();

    expect(
        $assinatura->codigo_otp
    )->toBeNull();

    expect(
        $assinatura
            ->assinatura_url
    )->toStartWith(
        'contract-signatures/' .
            $tenant->id .
            '/' .
            $contrato->id .
            '/'
    );

    Storage::disk('local')
        ->assertExists(
            $assinatura
                ->assinatura_url
        );

    expect(
        $contrato->status
    )->toBe('assinado');

    expect(
        $contrato
            ->data_assinatura
    )->not->toBeNull();

    expect(
        $contrato
            ->assinatura_motorista_url
    )->toBe(
        $assinatura
            ->assinatura_url
    );

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'contrato_id' =>
            $contrato->id,
            'motorista_id' =>
            $motorista->id,
            'veiculo_id' =>
            $veiculo->id,
            'ativo' => 1,
        ]
    );

    $this->assertDatabaseHas(
        'logs_auditoria_contratos',
        [
            'contrato_id' =>
            $contrato->id,
            'tenant_id' =>
            $tenant->id,
            'acao' =>
            'assinatura_remota',
        ]
    );
});

test('contrato com duas assinaturas só fica assinado após a última', function () {
    Storage::fake('local');

    [
        $tenant,
        $contrato,
        $assinaturas,
        $motorista,
        $proprietario,
        $veiculo,
    ] = remoteSignatureFixture(
        true
    );

    $motoristaAssinatura =
        $assinaturas->firstWhere(
            'placeholder',
            'ASSINATURA_MOTORISTA'
        );

    $proprietarioAssinatura =
        $assinaturas->firstWhere(
            'placeholder',
            'ASSINATURA_PROPRIETARIO'
        );

    $this->postJson(
        '/api/assinaturas/remotas/' .
            $motoristaAssinatura
            ->token_verificacao .
            '/confirmar',
        [
            'codigo_otp' =>
            $motoristaAssinatura
                ->codigo_otp,
            'aceite' => true,
            'assinatura' =>
            remoteSignaturePng(),
        ]
    )
        ->assertOk()
        ->assertJsonPath(
            'data.contrato_status',
            'enviado'
        );

    $contrato->refresh();

    expect(
        $contrato->status
    )->toBe('enviado');

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'contrato_id',
                $contrato->id
            )
            ->exists()
    )->toBeFalse();

    $this->postJson(
        '/api/assinaturas/remotas/' .
            $proprietarioAssinatura
            ->token_verificacao .
            '/confirmar',
        [
            'codigo_otp' =>
            $proprietarioAssinatura
                ->codigo_otp,
            'aceite' => true,
            'assinatura' =>
            remoteSignaturePng(),
        ]
    )
        ->assertOk()
        ->assertJsonPath(
            'data.contrato_status',
            'assinado'
        );

    $contrato->refresh();

    expect(
        $contrato->status
    )->toBe('assinado');

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'contrato_id',
                $contrato->id
            )
            ->where(
                'ativo',
                true
            )
            ->count()
    )->toBe(1);
});

test('assinatura remota concluída invalida token e não pode ser reutilizada', function () {
    Storage::fake('local');

    [
        $tenant,
        $contrato,
        $assinaturas,
    ] = remoteSignatureFixture();

    $assinatura =
        $assinaturas->first();

    $token =
        $assinatura
        ->token_verificacao;

    $otp =
        $assinatura
        ->codigo_otp;

    $payload = [
        'codigo_otp' =>
        $otp,
        'aceite' =>
        true,
        'assinatura' =>
        remoteSignaturePng(),
    ];

    $this->postJson(
        "/api/assinaturas/remotas/{$token}/confirmar",
        $payload
    )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'assinado'
        );

    $assinatura->refresh();

    expect(
        $assinatura
            ->codigo_otp
    )->toBeNull();

    expect(
        $assinatura
            ->token_verificacao
    )->toBeNull();

    $filesAntes =
        Storage::disk('local')
        ->allFiles();

    $this->getJson(
        "/api/assinaturas/remotas/{$token}"
    )->assertNotFound();

    $this->postJson(
        "/api/assinaturas/remotas/{$token}/confirmar",
        $payload
    )->assertNotFound();

    expect(
        Storage::disk('local')
            ->allFiles()
    )->toBe($filesAntes);

    expect(
        LogAuditoriaContrato::query()
            ->where(
                'contrato_id',
                $contrato->id
            )
            ->where(
                'acao',
                'assinatura_remota'
            )
            ->count()
    )->toBe(1);
});

test('falha ao ativar veículo faz rollback da assinatura e remove arquivo privado', function () {
    Storage::fake('local');

    [
        $tenant,
        $contrato,
        $assinaturas,
        $motorista,
        $proprietario,
        $veiculo,
    ] = remoteSignatureFixture(
        false,
        true
    );

    $assinatura =
        $assinaturas->first();

    $otp =
        $assinatura->codigo_otp;

    $run =
        ChecklistProcessRun::query()
        ->where(
            'tenant_id',
            $tenant->id
        )
        ->where(
            'entidade_tipo',
            'contrato'
        )
        ->where(
            'entidade_id',
            $contrato->id
        )
        ->with('items')
        ->firstOrFail();

    $processItem =
        $run->items
        ->first();

    expect(
        $run->status
    )->toBe(
        'em_andamento'
    );

    expect(
        $processItem->status
    )->toBe(
        'pendente'
    );

    for ($i = 1; $i <= 3; $i++) {
        $ocupante =
            new Motorista([
                'nome_completo' =>
                "Motorista Ocupante {$i}",
                'email' =>
                "ocupante{$i}@remoto.test",
            ]);

        $ocupante->tenant_id =
            $tenant->id;

        $ocupante->save();

        $contratoOcupante =
            new Contrato([
                'tipo' =>
                'aluguer',
                'motorista_id' =>
                $ocupante->id,
                'veiculo_id' =>
                $veiculo->id,
                'data_inicio' =>
                '2026-09-01',
            ]);

        $contratoOcupante->tenant_id =
            $tenant->id;

        $contratoOcupante->status =
            'assinado';

        $contratoOcupante->save();

        $associacao =
            new ContratoAtivoVeiculo([
                'data_inicio' =>
                now(),
                'ativo' =>
                true,
            ]);

        $associacao->tenant_id =
            $tenant->id;

        $associacao->motorista_id =
            $ocupante->id;

        $associacao->veiculo_id =
            $veiculo->id;

        $associacao->contrato_id =
            $contratoOcupante->id;

        $associacao->save();
    }

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'veiculo_id',
                $veiculo->id
            )
            ->where(
                'ativo',
                true
            )
            ->count()
    )->toBe(3);

    $logsAntes =
        LogAuditoriaContrato::query()
        ->where(
            'contrato_id',
            $contrato->id
        )
        ->count();

    $this->postJson(
        '/api/assinaturas/remotas/' .
            $assinatura
            ->token_verificacao .
            '/confirmar',
        [
            'codigo_otp' =>
            $otp,
            'aceite' =>
            true,
            'assinatura' =>
            remoteSignaturePng(),
        ]
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    $assinatura->refresh();
    $contrato->refresh();

    expect(
        $assinatura->status
    )->toBe('pendente');

    expect(
        $assinatura->verificado
    )->toBeFalse();

    expect(
        $assinatura->assinatura_url
    )->toBeNull();

    expect(
        $assinatura->assinado_em
    )->toBeNull();

    expect(
        $assinatura->hash_documento
    )->toBeNull();

    expect(
        $assinatura->codigo_otp
    )->toBe($otp);

    expect(
        $contrato->status
    )->toBe('enviado');

    expect(
        $contrato->data_assinatura
    )->toBeNull();

    expect(
        $contrato
            ->assinatura_motorista_url
    )->toBeNull();

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'veiculo_id',
                $veiculo->id
            )
            ->where(
                'ativo',
                true
            )
            ->count()
    )->toBe(3);

    expect(
        LogAuditoriaContrato::query()
            ->where(
                'contrato_id',
                $contrato->id
            )
            ->count()
    )->toBe($logsAntes);

    $this->assertDatabaseMissing(
        'logs_auditoria_contratos',
        [
            'contrato_id' =>
            $contrato->id,
            'acao' =>
            'assinatura_remota',
        ]
    );

    $run->refresh();

    $processItem->refresh();

    expect(
        $run->status
    )->toBe(
        'em_andamento'
    );

    expect(
        $run->concluido_em
    )->toBeNull();

    expect(
        $processItem->status
    )->toBe(
        'pendente'
    );

    expect(
        $processItem->concluido_em
    )->toBeNull();

    expect(
        $processItem->concluido_por
    )->toBeNull();

    expect(
        $processItem->resultado
    )->toBeNull();


    expect(
        Storage::disk('local')
            ->allFiles()
    )->toBe([]);
});


test(
    'assinatura remota conclui automaticamente etapa do checklist de processo',
    function () {
        Storage::fake(
            'local'
        );

        [
            $tenant,
            $contrato,
            $assinaturas,
        ] =
            remoteSignatureFixture(
                false,
                true
            );

        $assinatura =
            $assinaturas->first();

        $run =
            ChecklistProcessRun::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'entidade_tipo',
                'contrato'
            )
            ->where(
                'entidade_id',
                $contrato->id
            )
            ->with('items')
            ->firstOrFail();

        expect(
            $run->status
        )->toBe(
            'em_andamento'
        );

        expect(
            $run->items
                ->first()
                ->status
        )->toBe(
            'pendente'
        );

        $this->postJson(
            '/api/assinaturas/remotas/' .
                $assinatura
                ->token_verificacao .
                '/confirmar',
            [
                'codigo_otp' =>
                $assinatura
                    ->codigo_otp,

                'aceite' =>
                true,

                'assinatura' =>
                remoteSignaturePng(),
            ]
        )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'assinado'
            )
            ->assertJsonPath(
                'data.contrato_status',
                'assinado'
            );

        $run->refresh();
        $run->load(
            'items'
        );

        $item =
            $run->items
            ->first();

        expect(
            $run->status
        )->toBe(
            'concluido'
        );

        expect(
            $run->concluido_em
        )->not->toBeNull();

        expect(
            $item->status
        )->toBe(
            'concluido'
        );

        expect(
            $item->concluido_em
        )->not->toBeNull();

        expect(
            $item->resultado['modo']
        )->toBe(
            'remota'
        );

        expect(
            $item->resultado['placeholder']
        )->toBe(
            'ASSINATURA_MOTORISTA'
        );

        expect(
            $item->resultado['assinatura_id']
        )->toBe(
            $assinatura->id
        );
    }
);
