<?php

use App\Mail\RemoteSignatureRequestMail;
use App\Models\AssinaturaDigital;
use App\Models\ChecklistProcessTemplate;
use App\Models\ChecklistProcessTemplateItem;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Documento;
use App\Models\LogAuditoriaContrato;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use App\Models\VersaoContrato;
use App\Services\DocumentoRegistryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser;

uses(RefreshDatabase::class);

function contratoHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function contratoTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function contratoUsuario(
    Tenant $tenant,
    string $email,
    string $nivel = 'configurar'
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make(
            'SenhaTeste123!'
        ),
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = Role::firstOrCreate(
        ['codigo' => 'funcionario'],
        [
            'nome' => 'Funcionário',
            'sistema' => true,
        ]
    );

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $permission = Permission::firstOrCreate(
        ['codigo' => 'contratos'],
        [
            'modulo' => 'contratos',
            'nome' => 'Contratos',
        ]
    );

    RolePermission::updateOrCreate(
        [
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ],
        [
            'nivel' => $nivel,
        ]
    );

    return $user;
}

function contratoUsuarioComRole(
    Tenant $tenant,
    string $email,
    string $roleCodigo
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make(
            'SenhaTeste123!'
        ),
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $nomes = [
        'motorista' => 'Motorista',
        'proprietario' => 'Proprietário',
        'funcionario' => 'Funcionário',
    ];

    $role = Role::firstOrCreate(
        [
            'codigo' => $roleCodigo,
        ],
        [
            'nome' => $nomes[$roleCodigo]
                ?? ucfirst(
                    $roleCodigo
                ),
            'sistema' => true,
        ]
    );

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    return $user;
}

function contratoLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function contratoTemplate(
    Tenant $tenant,
    string $conteudo,
    string $nome = 'Template Teste'
): TemplateContrato {
    $template = new TemplateContrato([
        'nome' => $nome,
        'tipo_arquivo' => 'html',
        'conteudo_original' => $conteudo,
        'campos_detectados' => [],
        'campos_mapeados' => [],
    ]);

    $template->tenant_id = $tenant->id;
    $template->save();

    return $template;
}

function contratoMotorista(
    Tenant $tenant,
    string $sufixo
): Motorista {
    $motorista = new Motorista([
        'nome_completo' => "Motorista {$sufixo}",
        'email' => strtolower($sufixo).
            '@motorista.test',
    ]);

    $motorista->tenant_id = $tenant->id;
    $motorista->save();

    return $motorista;
}

function contratoProprietario(
    Tenant $tenant,
    string $sufixo
): Proprietario {
    $proprietario = new Proprietario([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => "Proprietário {$sufixo}",
        'email' => strtolower($sufixo).
            '@proprietario.test',
    ]);

    $proprietario->tenant_id =
        $tenant->id;

    $proprietario->save();

    return $proprietario;
}

function contratoVeiculo(
    Tenant $tenant,
    string $matricula,
    float $valorAluguel,
    ?Proprietario $proprietario = null
): Veiculo {
    $veiculo = new Veiculo([
        'matricula' => $matricula,
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
        'valor_aluguel' => $valorAluguel,
        'proprietario_id' => $proprietario?->id,
    ]);

    $veiculo->tenant_id = $tenant->id;
    $veiculo->save();

    return $veiculo;
}

function contratoPayloadAssinado(
    TemplateContrato $template,
    Motorista $motorista,
    Veiculo $veiculo
): array {
    return [
        'template_id' => $template->id,
        'tipo' => 'aluguer',
        'motorista_id' => $motorista->id,
        'veiculo_id' => $veiculo->id,
        'data_inicio' => '2026-09-20',

        'campos_preenchidos' => [
            'NOME_MOTORISTA' => $motorista->nome_completo,
        ],

        'assinaturas' => [
            [
                'placeholder' => 'ASSINATURA_MOTORISTA',
                'modo' => 'presencial',
                'assinatura_url' => 'data:image/png;base64,TESTE',
            ],
        ],
    ];
}

test('rotas de contratos exigem autenticação', function () {
    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson('/api/contratos')
        ->assertUnauthorized();
});

test('cliente não pode controlar campos protegidos do contrato', function () {
    $tenant = contratoTenant(
        'Tenant Segurança Contrato',
        'tenant-seguranca-contrato'
    );

    $user = contratoUsuario(
        $tenant,
        'seguranca.contrato@frotapro.test'
    );

    contratoLogin($this, $user);

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'tipo' => 'aluguer',
            'tenant_id' => Str::uuid()
                ->toString(),
            'status' => 'assinado',
            'versao_atual' => 99,
            'valor_semanal' => 1,
            'data_assinatura' => now()->toISOString(),
            'bloqueado' => true,
            'renovacao_count' => 10,
            'hash_documento' => 'fraude',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'status',
            'versao_atual',
            'valor_semanal',
            'data_assinatura',
            'bloqueado',
            'renovacao_count',
            'hash_documento',
        ]);

    expect(Contrato::count())->toBe(0);
});

test('template com campos de motorista sem assinatura cria rascunho', function () {
    $tenant = contratoTenant(
        'Tenant Rascunho',
        'tenant-contrato-rascunho'
    );

    $user = contratoUsuario(
        $tenant,
        'rascunho.contrato@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '<p>{{NOME_MOTORISTA}}</p>'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Rascunho'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'AA-10-AA',
        275.50
    );

    contratoLogin($this, $user);

    $response = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'template_id' => $template->id,
            'tipo' => 'aluguer',
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculo->id,
            'campos_preenchidos' => [
                'NOME_MOTORISTA' => $motorista
                    ->nome_completo,
            ],
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'rascunho'
        )
        ->assertJsonPath(
            'data.versao_atual',
            1
        )
        ->assertJsonPath(
            'data.valor_semanal',
            '275.50'
        );

    $id = $response->json('data.id');

    $this->assertDatabaseHas(
        'versoes_contrato',
        [
            'contrato_id' => $id,
            'versao_numero' => 1,
            'criado_por' => $user->id,
        ]
    );

    $this->assertDatabaseHas(
        'logs_auditoria_contratos',
        [
            'contrato_id' => $id,
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'acao' => 'criacao',
        ]
    );

    expect(
        AssinaturaDigital::query()
            ->where('contrato_id', $id)
            ->count()
    )->toBe(0);
});

test('assinatura obrigatória omitida bloqueia criação integralmente', function () {
    $tenant = contratoTenant(
        'Tenant Assinatura Obrigatória',
        'tenant-assinatura-obrigatoria'
    );

    $user = contratoUsuario(
        $tenant,
        'assinatura.obrigatoria@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '<p>{{ASSINATURA_MOTORISTA}}</p>'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Obrigatoria'
    );

    contratoLogin($this, $user);

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'template_id' => $template->id,
            'tipo' => 'aluguer',
            'motorista_id' => $motorista->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'assinaturas'
        );

    expect(Contrato::count())->toBe(0);
    expect(VersaoContrato::count())
        ->toBe(0);
    expect(LogAuditoriaContrato::count())
        ->toBe(0);
});

test('assinatura remota cria contrato enviado e solicitação pendente', function () {
    $tenant = contratoTenant(
        'Tenant Assinatura Remota',
        'tenant-assinatura-remota'
    );

    $user = contratoUsuario(
        $tenant,
        'remota.contrato@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '<p>{{ASSINATURA_MOTORISTA}}</p>'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Remoto'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'BB-20-BB',
        300
    );

    contratoLogin($this, $user);

    $response = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'template_id' => $template->id,
            'tipo' => 'aluguer',
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculo->id,

            'assinaturas' => [
                [
                    'placeholder' => 'ASSINATURA_MOTORISTA',
                    'modo' => 'remota',
                ],
            ],
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'enviado'
        );

    $id = $response->json('data.id');

    $assinatura =
        AssinaturaDigital::query()
            ->where(
                'contrato_id',
                $id
            )
            ->firstOrFail();

    expect($assinatura->status)
        ->toBe('pendente');

    expect($assinatura->verificado)
        ->toBeFalse();

    expect($assinatura->codigo_otp)
        ->toMatch('/^\d{6}$/');

    expect(
        $assinatura->token_verificacao
    )->not->toBeNull();

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'contrato_id',
                $id
            )
            ->exists()
    )->toBeFalse();
});

test('assinatura presencial cria contrato assinado e associação ativa', function () {
    $tenant = contratoTenant(
        'Tenant Contrato Assinado',
        'tenant-contrato-assinado'
    );

    $user = contratoUsuario(
        $tenant,
        'assinado.contrato@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '<p>{{ASSINATURA_MOTORISTA}}</p>'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Assinado'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'CC-30-CC',
        325
    );

    contratoLogin($this, $user);

    $response = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculo
            )
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'assinado'
        )
        ->assertJsonPath(
            'data.valor_semanal',
            '325.00'
        );

    $id = $response->json('data.id');

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'contrato_id' => $id,
            'tenant_id' => $tenant->id,
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculo->id,
            'ativo' => 1,
        ]
    );

    $this->assertDatabaseHas(
        'assinaturas_digitais',
        [
            'contrato_id' => $id,
            'status' => 'assinado',
            'verificado' => 1,
            'placeholder' => 'ASSINATURA_MOTORISTA',
        ]
    );
});

test('valor semanal enviado pelo cliente é rejeitado e valor do veículo prevalece', function () {
    $tenant = contratoTenant(
        'Tenant Valor Semanal',
        'tenant-valor-semanal'
    );

    $user = contratoUsuario(
        $tenant,
        'valor.semanal@frotapro.test'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'DD-40-DD',
        412.75
    );

    contratoLogin($this, $user);

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'tipo' => 'aluguer',
            'veiculo_id' => $veiculo->id,
            'valor_semanal' => 1,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'valor_semanal'
        );

    $response = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'tipo' => 'aluguer',
            'veiculo_id' => $veiculo->id,
        ])
        ->assertCreated()
        ->assertJsonPath(
            'data.valor_semanal',
            '412.75'
        );

    $this->assertDatabaseHas(
        'contratos',
        [
            'id' => $response->json(
                'data.id'
            ),
            'valor_semanal' => 412.75,
        ]
    );
});

test('edição de rascunho cria nova versão e resincroniza valor semanal', function () {
    $tenant = contratoTenant(
        'Tenant Versionamento',
        'tenant-versionamento-contrato'
    );

    $user = contratoUsuario(
        $tenant,
        'versionamento@frotapro.test'
    );

    $veiculoA = contratoVeiculo(
        $tenant,
        'EE-50-EE',
        250
    );

    $veiculoB = contratoVeiculo(
        $tenant,
        'FF-60-FF',
        375
    );

    contratoLogin($this, $user);

    $create = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'tipo' => 'aluguer',
            'veiculo_id' => $veiculoA->id,
            'campos_preenchidos' => [
                'CAMPO' => 'Versão 1',
            ],
        ])
        ->assertCreated();

    $id = $create->json('data.id');

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}",
            [
                'veiculo_id' => $veiculoB->id,
                'campos_preenchidos' => [
                    'CAMPO' => 'Versão 2',
                ],
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.versao_atual',
            2
        )
        ->assertJsonPath(
            'data.valor_semanal',
            '375.00'
        );

    expect(
        VersaoContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count()
    )->toBe(2);

    $this->assertDatabaseHas(
        'versoes_contrato',
        [
            'contrato_id' => $id,
            'versao_numero' => 2,
        ]
    );

    $this->assertDatabaseHas(
        'logs_auditoria_contratos',
        [
            'contrato_id' => $id,
            'acao' => 'edicao',
        ]
    );
});

test('contrato assinado não pode ser alterado pelo patch genérico', function () {
    $tenant = contratoTenant(
        'Tenant Bloqueio Edição',
        'tenant-bloqueio-edicao'
    );

    $user = contratoUsuario(
        $tenant,
        'bloqueio.edicao@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '{{ASSINATURA_MOTORISTA}}'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Bloqueado'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'GG-70-GG',
        300
    );

    contratoLogin($this, $user);

    $create = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculo
            )
        )
        ->assertCreated();

    $id = $create->json('data.id');

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}",
            [
                'valor_total' => 999,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'contrato'
        );

    expect(
        Contrato::findOrFail($id)
            ->versao_atual
    )->toBe(1);
});

test('veículo aceita no máximo três motoristas ativos e quarta criação faz rollback', function () {
    $tenant = contratoTenant(
        'Tenant Limite Motoristas',
        'tenant-limite-motoristas'
    );

    $user = contratoUsuario(
        $tenant,
        'limite.motoristas@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '{{ASSINATURA_MOTORISTA}}'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'HH-80-HH',
        350
    );

    contratoLogin($this, $user);

    foreach (
        ['Um', 'Dois', 'Tres'] as $indice => $nome
    ) {
        $motorista = contratoMotorista(
            $tenant,
            "Limite{$nome}"
        );

        $this->withHeaders(
            contratoHeaders()
        )
            ->postJson(
                '/api/contratos',
                contratoPayloadAssinado(
                    $template,
                    $motorista,
                    $veiculo
                )
            )
            ->assertCreated();
    }

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'veiculo_id',
                $veiculo->id
            )
            ->where('ativo', true)
            ->count()
    )->toBe(3);

    $contratosAntes = Contrato::count();
    $versoesAntes = VersaoContrato::count();
    $assinaturasAntes =
        AssinaturaDigital::count();
    $logsAntes =
        LogAuditoriaContrato::count();

    $quarto = contratoMotorista(
        $tenant,
        'LimiteQuatro'
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $quarto,
                $veiculo
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    expect(Contrato::count())
        ->toBe($contratosAntes);

    expect(VersaoContrato::count())
        ->toBe($versoesAntes);

    expect(AssinaturaDigital::count())
        ->toBe($assinaturasAntes);

    expect(LogAuditoriaContrato::count())
        ->toBe($logsAntes);
});

test('motorista é removido da associação ativa anterior ao assinar novo veículo', function () {
    $tenant = contratoTenant(
        'Tenant Troca Veículo',
        'tenant-troca-veiculo'
    );

    $user = contratoUsuario(
        $tenant,
        'troca.veiculo@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '{{ASSINATURA_MOTORISTA}}'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Troca'
    );

    $veiculoA = contratoVeiculo(
        $tenant,
        'II-90-II',
        300
    );

    $veiculoB = contratoVeiculo(
        $tenant,
        'JJ-11-JJ',
        320
    );

    contratoLogin($this, $user);

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculoA
            )
        )
        ->assertCreated();

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculoB
            )
        )
        ->assertCreated();

    expect(
        ContratoAtivoVeiculo::query()
            ->where(
                'motorista_id',
                $motorista->id
            )
            ->where('ativo', true)
            ->count()
    )->toBe(1);

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculoA->id,
            'ativo' => 0,
        ]
    );

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculoB->id,
            'ativo' => 1,
        ]
    );
});

test('encerrar contrato assinado bloqueia contrato e termina associação', function () {
    $tenant = contratoTenant(
        'Tenant Encerramento',
        'tenant-encerramento'
    );

    $user = contratoUsuario(
        $tenant,
        'encerramento@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '{{ASSINATURA_MOTORISTA}}'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Encerramento'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'KK-22-KK',
        340
    );

    contratoLogin($this, $user);

    $create = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculo
            )
        )
        ->assertCreated();

    $id = $create->json('data.id');

    $contratoAntes =
        Contrato::findOrFail(
            $id
        );

    $documentoAntes =
        app(
            DocumentoRegistryService::class
        )->sync(
            $contratoAntes
        );

    expect(
        $documentoAntes
            ?->status
    )->toBe(
        'assinado'
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}/encerrar",
            [
                'data_fim' => '2026-10-31',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'encerrado'
        )
        ->assertJsonPath(
            'data.bloqueado',
            true
        );

    $this->assertDatabaseHas(
        'contratos',
        [
            'id' => $id,
            'status' => 'encerrado',
            'bloqueado' => 1,
        ]
    );

    $contratoEncerrado = Contrato::findOrFail($id);

    expect(
        $contratoEncerrado->data_fim->toDateString()
    )->toBe('2026-10-31');

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'contrato_id' => $id,
            'ativo' => 0,
        ]
    );

    $this->assertDatabaseHas(
        'logs_auditoria_contratos',
        [
            'contrato_id' => $id,
            'acao' => 'encerramento',
        ]
    );

    $this->assertDatabaseHas(
        'documentos',
        [
            'entidade_tipo' => 'contrato',

            'entidade_id' => $id,

            'status' => 'encerrado',
        ]
    );
});

test('contratos de outro tenant não podem ser consultados alterados encerrados ou apagados', function () {
    $tenantA = contratoTenant(
        'Tenant Isolamento A',
        'tenant-isolamento-contrato-a'
    );

    $tenantB = contratoTenant(
        'Tenant Isolamento B',
        'tenant-isolamento-contrato-b'
    );

    $userA = contratoUsuario(
        $tenantA,
        'isolamento.contrato@frotapro.test'
    );

    $contratoB = new Contrato([
        'tipo' => 'aluguer',
    ]);

    $contratoB->tenant_id = $tenantB->id;
    $contratoB->save();

    contratoLogin($this, $userA);

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$contratoB->id}"
        )
        ->assertNotFound();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$contratoB->id}",
            [
                'valor_total' => 10,
            ]
        )
        ->assertNotFound();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$contratoB->id}/encerrar"
        )
        ->assertNotFound();

    $this->withHeaders(
        contratoHeaders()
    )
        ->deleteJson(
            "/api/contratos/{$contratoB->id}"
        )
        ->assertNotFound();

    $this->assertDatabaseHas(
        'contratos',
        [
            'id' => $contratoB->id,
        ]
    );
});

test('permissão visualizar permite leitura e bloqueia escrita', function () {
    $tenant = contratoTenant(
        'Tenant Permissão Contratos',
        'tenant-permissao-contratos'
    );

    $user = contratoUsuario(
        $tenant,
        'visualizar.contratos@frotapro.test',
        'visualizar'
    );

    $contrato = new Contrato([
        'tipo' => 'aluguer',
    ]);

    $contrato->tenant_id = $tenant->id;
    $contrato->save();

    contratoLogin($this, $user);

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson('/api/contratos')
        ->assertOk();

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$contrato->id}"
        )
        ->assertOk();

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson('/api/contratos', [
            'tipo' => 'aluguer',
        ])
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$contrato->id}",
            [
                'valor_total' => 100,
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->deleteJson(
            "/api/contratos/{$contrato->id}"
        )
        ->assertForbidden();
});

test('novo contrato no mesmo veículo não altera associação ativa existente', function () {
    $tenant = contratoTenant(
        'Tenant Mesmo Veículo',
        'tenant-mesmo-veiculo'
    );

    $user = contratoUsuario(
        $tenant,
        'mesmo.veiculo@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '{{ASSINATURA_MOTORISTA}}'
    );

    $motorista = contratoMotorista(
        $tenant,
        'MesmoVeiculo'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'LL-33-LL',
        360
    );

    contratoLogin($this, $user);

    $primeiro = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculo
            )
        )
        ->assertCreated();

    $primeiroContratoId = $primeiro->json('data.id');

    $associacao = ContratoAtivoVeiculo::query()
        ->where('motorista_id', $motorista->id)
        ->where('veiculo_id', $veiculo->id)
        ->where('ativo', true)
        ->firstOrFail();

    expect($associacao->contrato_id)
        ->toBe($primeiroContratoId);

    $segundo = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            contratoPayloadAssinado(
                $template,
                $motorista,
                $veiculo
            )
        )
        ->assertCreated();

    $segundoContratoId = $segundo->json('data.id');

    expect($segundoContratoId)
        ->not->toBe($primeiroContratoId);

    expect(
        ContratoAtivoVeiculo::query()
            ->where('motorista_id', $motorista->id)
            ->where('veiculo_id', $veiculo->id)
            ->where('ativo', true)
            ->count()
    )->toBe(1);

    $associacao->refresh();

    expect($associacao->contrato_id)
        ->toBe($primeiroContratoId);
});

test('patch não aceita data fim anterior à data início já existente', function () {
    $tenant = contratoTenant(
        'Tenant Cronologia Fim',
        'tenant-cronologia-fim'
    );

    $user = contratoUsuario(
        $tenant,
        'cronologia.fim@frotapro.test'
    );

    contratoLogin(
        $this,
        $user
    );

    $create = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            [
                'tipo' => 'aluguer',
                'data_inicio' => '2026-10-10',
            ]
        )
        ->assertCreated();

    $id = $create->json(
        'data.id'
    );

    $versoesAntes =
        VersaoContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count();

    $logsAntes =
        LogAuditoriaContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}",
            [
                'data_fim' => '2026-10-09',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'data_fim'
        );

    $contrato =
        Contrato::findOrFail($id);

    expect(
        $contrato->data_inicio
            ->toDateString()
    )->toBe(
        '2026-10-10'
    );

    expect(
        $contrato->data_fim
    )->toBeNull();

    expect(
        $contrato->versao_atual
    )->toBe(1);

    expect(
        VersaoContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count()
    )->toBe(
        $versoesAntes
    );

    expect(
        LogAuditoriaContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count()
    )->toBe(
        $logsAntes
    );
});

test('patch não aceita data início posterior à data fim já existente', function () {
    $tenant = contratoTenant(
        'Tenant Cronologia Início',
        'tenant-cronologia-inicio'
    );

    $user = contratoUsuario(
        $tenant,
        'cronologia.inicio@frotapro.test'
    );

    contratoLogin(
        $this,
        $user
    );

    $create = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            [
                'tipo' => 'aluguer',
                'data_inicio' => '2026-10-01',
                'data_fim' => '2026-10-10',
            ]
        )
        ->assertCreated();

    $id = $create->json(
        'data.id'
    );

    $versoesAntes =
        VersaoContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}",
            [
                'data_inicio' => '2026-10-11',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'data_fim'
        );

    $contrato =
        Contrato::findOrFail($id);

    expect(
        $contrato->data_inicio
            ->toDateString()
    )->toBe(
        '2026-10-01'
    );

    expect(
        $contrato->data_fim
            ->toDateString()
    )->toBe(
        '2026-10-10'
    );

    expect(
        $contrato->versao_atual
    )->toBe(1);

    expect(
        VersaoContrato::query()
            ->where(
                'contrato_id',
                $id
            )
            ->count()
    )->toBe(
        $versoesAntes
    );
});

test('encerramento não aceita data fim anterior à data início', function () {
    $tenant = contratoTenant(
        'Tenant Cronologia Encerramento',
        'tenant-cronologia-encerramento'
    );

    $user = contratoUsuario(
        $tenant,
        'cronologia.encerramento@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        '{{ASSINATURA_MOTORISTA}}'
    );

    $motorista = contratoMotorista(
        $tenant,
        'CronologiaEncerramento'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'CR-10-NO',
        350
    );

    contratoLogin(
        $this,
        $user
    );

    $payload =
        contratoPayloadAssinado(
            $template,
            $motorista,
            $veiculo
        );

    $payload['data_inicio'] =
        '2026-10-10';

    $create = $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            $payload
        )
        ->assertCreated();

    $id = $create->json(
        'data.id'
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}/encerrar",
            [
                'data_fim' => '2026-10-09',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'data_fim'
        );

    $contrato =
        Contrato::findOrFail($id);

    expect(
        $contrato->status
    )->toBe(
        'assinado'
    );

    expect(
        $contrato->bloqueado
    )->toBeFalse();

    expect(
        $contrato->data_fim
    )->toBeNull();

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'contrato_id' => $id,
            'ativo' => 1,
        ]
    );

    $this->assertDatabaseMissing(
        'logs_auditoria_contratos',
        [
            'contrato_id' => $id,
            'acao' => 'encerramento',
        ]
    );
});

test('motorista pode listar e consultar apenas os próprios contratos', function () {
    $tenant = contratoTenant(
        'Tenant Contratos Motorista',
        'tenant-contratos-motorista'
    );

    $user =
        contratoUsuarioComRole(
            $tenant,
            'self.motorista@frotapro.test',
            'motorista'
        );

    $motorista =
        contratoMotorista(
            $tenant,
            'SelfMotorista'
        );

    $motorista->user_id =
        $user->id;

    $motorista->save();

    $outroMotorista =
        contratoMotorista(
            $tenant,
            'OutroMotorista'
        );

    $proprio = new Contrato([
        'tipo' => 'aluguer',
        'motorista_id' => $motorista->id,
    ]);

    $proprio->tenant_id =
        $tenant->id;

    $proprio->save();

    $alheio = new Contrato([
        'tipo' => 'aluguer',
        'motorista_id' => $outroMotorista->id,
    ]);

    $alheio->tenant_id =
        $tenant->id;

    $alheio->save();

    contratoLogin(
        $this,
        $user
    );

    $response = $this->withHeaders(
        contratoHeaders()
    )
        ->getJson('/api/contratos')
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        );

    expect(
        $response->json(
            'data.0.id'
        )
    )->toBe(
        $proprio->id
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$proprio->id}"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.id',
            $proprio->id
        );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$alheio->id}"
        )
        ->assertNotFound();

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            [
                'tipo' => 'aluguer',
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$proprio->id}",
            [
                'valor_total' => 100,
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->deleteJson(
            "/api/contratos/{$proprio->id}"
        )
        ->assertForbidden();
});

test('proprietário pode listar e consultar apenas os próprios contratos', function () {
    $tenant = contratoTenant(
        'Tenant Contratos Proprietário',
        'tenant-contratos-proprietario'
    );

    $user =
        contratoUsuarioComRole(
            $tenant,
            'self.proprietario@frotapro.test',
            'proprietario'
        );

    $proprietario =
        contratoProprietario(
            $tenant,
            'SelfProprietario'
        );

    $proprietario->user_id =
        $user->id;

    $proprietario->save();

    $outroProprietario =
        contratoProprietario(
            $tenant,
            'OutroProprietario'
        );

    $proprio = new Contrato([
        'tipo' => 'aluguer',
        'proprietario_id' => $proprietario->id,
    ]);

    $proprio->tenant_id =
        $tenant->id;

    $proprio->save();

    $alheio = new Contrato([
        'tipo' => 'aluguer',
        'proprietario_id' => $outroProprietario->id,
    ]);

    $alheio->tenant_id =
        $tenant->id;

    $alheio->save();

    contratoLogin(
        $this,
        $user
    );

    $response = $this->withHeaders(
        contratoHeaders()
    )
        ->getJson('/api/contratos')
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        );

    expect(
        $response->json(
            'data.0.id'
        )
    )->toBe(
        $proprio->id
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$proprio->id}"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.id',
            $proprio->id
        );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$alheio->id}"
        )
        ->assertNotFound();

    $this->withHeaders(
        contratoHeaders()
    )
        ->postJson(
            '/api/contratos',
            [
                'tipo' => 'aluguer',
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$proprio->id}",
            [
                'valor_total' => 100,
            ]
        )
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->deleteJson(
            "/api/contratos/{$proprio->id}"
        )
        ->assertForbidden();
});

test('motorista sem registo vinculado recebe lista vazia', function () {
    $tenant = contratoTenant(
        'Tenant Motorista Sem Vínculo',
        'tenant-motorista-sem-vinculo'
    );

    $user =
        contratoUsuarioComRole(
            $tenant,
            'sem.vinculo.motorista@frotapro.test',
            'motorista'
        );

    $motorista =
        contratoMotorista(
            $tenant,
            'NaoVinculado'
        );

    $contrato = new Contrato([
        'tipo' => 'aluguer',
        'motorista_id' => $motorista->id,
    ]);

    $contrato->tenant_id =
        $tenant->id;

    $contrato->save();

    contratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson('/api/contratos')
        ->assertOk()
        ->assertJsonCount(
            0,
            'data'
        );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$contrato->id}"
        )
        ->assertNotFound();
});

test('funcionário sem permissão de contratos continua sem acesso de leitura', function () {
    $tenant = contratoTenant(
        'Tenant Funcionário Sem Contratos',
        'tenant-funcionario-sem-contratos'
    );

    $user =
        contratoUsuarioComRole(
            $tenant,
            'sem.permissao.contratos@frotapro.test',
            'funcionario'
        );

    $contrato = new Contrato([
        'tipo' => 'aluguer',
    ]);

    $contrato->tenant_id =
        $tenant->id;

    $contrato->save();

    contratoLogin(
        $this,
        $user
    );

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson('/api/contratos')
        ->assertForbidden();

    $this->withHeaders(
        contratoHeaders()
    )
        ->getJson(
            "/api/contratos/{$contrato->id}"
        )
        ->assertForbidden();
});

test('assinatura remota pendente pode ser reenviada com novo otp e token', function () {
    Mail::fake();

    $tenant =
        contratoTenant(
            'Tenant Reenvio Remoto',
            'tenant-reenvio-remoto'
        );

    $user =
        contratoUsuario(
            $tenant,
            'reenvio.remoto@frotapro.test'
        );

    $template =
        contratoTemplate(
            $tenant,
            '{{ASSINATURA_MOTORISTA}}',
            'Contrato Reenvio Remoto'
        );

    $motorista =
        contratoMotorista(
            $tenant,
            'Reenvio'
        );

    $veiculo =
        contratoVeiculo(
            $tenant,
            'RR-10-RR',
            300
        );

    contratoLogin(
        $this,
        $user
    );

    $response =
        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'template_id' => $template->id,

                    'tipo' => 'aluguer',

                    'motorista_id' => $motorista->id,

                    'veiculo_id' => $veiculo->id,

                    'data_inicio' => '2026-10-01',

                    'assinaturas' => [
                        [
                            'placeholder' => 'ASSINATURA_MOTORISTA',

                            'modo' => 'remota',
                        ],
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.status',
                'enviado'
            );

    $contratoId =
        $response->json(
            'data.id'
        );

    $assinatura =
        AssinaturaDigital::query()
            ->where(
                'contrato_id',
                $contratoId
            )
            ->firstOrFail();

    $tokenAnterior =
        $assinatura
            ->token_verificacao;

    $otpAnterior =
        $assinatura
            ->codigo_otp;

    $this
        ->withHeaders(
            contratoHeaders()
        )
        ->postJson(
            "/api/contratos/{$contratoId}/assinaturas/{$assinatura->id}/reenviar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.id',
            $assinatura->id
        )
        ->assertJsonPath(
            'data.status',
            'pendente'
        )
        ->assertJsonMissingPath(
            'data.codigo_otp'
        )
        ->assertJsonMissingPath(
            'data.token_verificacao'
        );

    $assinatura
        ->refresh();

    expect(
        $assinatura
            ->token_verificacao
    )->not->toBe(
        $tokenAnterior
    );

    expect(
        $assinatura
            ->codigo_otp
    )->not->toBe(
        $otpAnterior
    );

    expect(
        $assinatura
            ->otp_expira_em
    )->not->toBeNull();

    Mail::assertSent(
        RemoteSignatureRequestMail::class,
        function (
            RemoteSignatureRequestMail $mail
        ) use (
            $motorista,
            $assinatura
        ) {
            return
                $mail->hasTo(
                    $motorista->email
                ) &&
                $mail->otp ===
                $assinatura
                    ->codigo_otp &&
                    str_contains(
                        $mail->signatureUrl,
                        (string)
                        $assinatura
                            ->token_verificacao
                    );
        }
    );

    $this->assertDatabaseHas(
        'logs_auditoria_contratos',
        [
            'contrato_id' => $contratoId,

            'tenant_id' => $tenant->id,

            'user_id' => $user->id,

            'acao' => 'reenvio_assinatura_remota',
        ]
    );
});

test('pdf do contrato é gerado em storage privado com hash e auditoria', function () {
    Storage::fake('local');

    $tenant = contratoTenant(
        'Tenant PDF',
        'tenant-pdf'
    );

    $user = contratoUsuario(
        $tenant,
        'pdf.contrato@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        "CONTRATO DE ALUGUER\n\nMotorista: {{NOME_MOTORISTA}}\nVeículo: {{MATRICULA_VEICULO}}\nInício: {{DATA_INICIO}}"
    );

    $motorista = contratoMotorista(
        $tenant,
        'PDF'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'PDF-10-AA',
        300
    );

    contratoLogin($this, $user);

    $response = $this
        ->withHeaders(contratoHeaders())
        ->postJson('/api/contratos', [
            'template_id' => $template->id,
            'tipo' => 'aluguer',
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculo->id,
            'data_inicio' => '2026-09-20',
            'campos_preenchidos' => [
                'NOME_MOTORISTA' => $motorista->nome_completo,
            ],
        ])
        ->assertCreated();

    $id = $response->json('data.id');

    $this
        ->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$id}/pdf")
        ->assertOk()
        ->assertJsonPath(
            'data.pdf_disponivel',
            true
        );

    $contrato = Contrato::findOrFail($id);

    expect($contrato->pdf_gerado_url)
        ->not->toBeNull();

    expect($contrato->hash_documento)
        ->toMatch('/^[a-f0-9]{64}$/');

    Storage::disk('local')
        ->assertExists(
            $contrato->pdf_gerado_url
        );

    $binary = Storage::disk('local')
        ->get(
            $contrato->pdf_gerado_url
        );

    $documento = Documento::query()
        ->where(
            'entidade_tipo',
            'contrato'
        )
        ->where(
            'entidade_id',
            $contrato->id
        )
        ->firstOrFail();

    expect(
        $documento->codigo
    )->toMatch(
        '/^G[0-9]{6}$/'
    );

    $text = (new Parser)
        ->parseContent(
            $binary
        )
        ->getText();

    expect(
        $text
    )->toContain(
        $documento->codigo
    );

    expect($binary)
        ->toStartWith('%PDF-');

    expect(hash('sha256', $binary))
        ->toBe(
            $contrato->hash_documento
        );

    $this->assertDatabaseHas(
        'logs_auditoria_contratos',
        [
            'contrato_id' => $id,
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'acao' => 'geracao_pdf',
        ]
    );
});

test('pdf gerado pode ser visualizado e descarregado', function () {
    Storage::fake('local');

    $tenant = contratoTenant(
        'Tenant PDF Download',
        'tenant-pdf-download'
    );

    $user = contratoUsuario(
        $tenant,
        'pdf.download@frotapro.test'
    );

    $template = contratoTemplate(
        $tenant,
        'Contrato {{NOME_MOTORISTA}}'
    );

    $motorista = contratoMotorista(
        $tenant,
        'Download'
    );

    $veiculo = contratoVeiculo(
        $tenant,
        'PDF-20-BB',
        320
    );

    contratoLogin($this, $user);

    $response = $this
        ->withHeaders(contratoHeaders())
        ->postJson('/api/contratos', [
            'template_id' => $template->id,
            'tipo' => 'aluguer',
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculo->id,
            'campos_preenchidos' => [
                'NOME_MOTORISTA' => $motorista->nome_completo,
            ],
        ])
        ->assertCreated();

    $id = $response->json('data.id');

    $this
        ->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$id}/pdf")
        ->assertOk();

    $this
        ->withHeaders(contratoHeaders())
        ->get("/api/contratos/{$id}/pdf")
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $this
        ->withHeaders(contratoHeaders())
        ->get("/api/contratos/{$id}/pdf/download")
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );
});

test('utilizador apenas visualizar não pode gerar pdf', function () {
    Storage::fake('local');

    $tenant = contratoTenant(
        'Tenant PDF Permissão',
        'tenant-pdf-permissao'
    );

    $user = contratoUsuario(
        $tenant,
        'pdf.visualizar@frotapro.test',
        'visualizar'
    );

    $template = contratoTemplate(
        $tenant,
        'Contrato de teste'
    );

    $contrato = new Contrato([
        'template_id' => $template->id,
        'tipo' => 'aluguer',
    ]);

    $contrato->tenant_id = $tenant->id;
    $contrato->save();

    contratoLogin($this, $user);

    $this
        ->withHeaders(contratoHeaders())
        ->postJson(
            "/api/contratos/{$contrato->id}/pdf"
        )
        ->assertForbidden();

    expect(
        $contrato->fresh()
            ->pdf_gerado_url
    )->toBeNull();
});

test(
    'encerramento aguarda etapas obrigatórias anteriores à recolha',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Encerramento Workflow',
                'tenant-encerramento-workflow'
            );

        $user =
            contratoUsuario(
                $tenant,
                'encerramento.workflow@frotapro.test'
            );

        $process =
            new ChecklistProcessTemplate([
                'codigo' => 'encerramento_workflow',

                'nome' => 'Workflow de encerramento',

                'ativo' => true,

                'versao' => 1,
            ]);

        $process->tenant_id =
            $tenant->id;

        $process->save();

        $entrega =
            new ChecklistProcessTemplateItem([
                'codigo' => 'entrega',

                'ordem' => 1,

                'titulo' => 'Checklist de entrega',

                'tipo' => 'checklist_veiculo',

                'obrigatorio' => true,

                'configuracao' => [
                    'checklist_tipo' => 'entrega',
                ],
            ]);

        $entrega->template_id =
            $process->id;

        $entrega->save();

        $recolha =
            new ChecklistProcessTemplateItem([
                'codigo' => 'recolha',

                'ordem' => 2,

                'titulo' => 'Checklist de recolha',

                'tipo' => 'checklist_veiculo',

                'obrigatorio' => true,

                'configuracao' => [
                    'checklist_tipo' => 'recolha',
                ],
            ]);

        $recolha->template_id =
            $process->id;

        $recolha->save();

        $template =
            contratoTemplate(
                $tenant,
                '{{ASSINATURA_MOTORISTA}}'
            );

        $template
            ->checklist_process_template_id =
            $process->id;

        $template->save();

        $motorista =
            contratoMotorista(
                $tenant,
                'EncerramentoWorkflow'
            );

        $veiculo =
            contratoVeiculo(
                $tenant,
                'RW-22-RW',
                350
            );

        contratoLogin(
            $this,
            $user
        );

        $create =
            $this
                ->withHeaders(
                    contratoHeaders()
                )
                ->postJson(
                    '/api/contratos',
                    contratoPayloadAssinado(
                        $template,
                        $motorista,
                        $veiculo
                    )
                )
                ->assertCreated();

        $id =
            $create
                ->json(
                    'data.id'
                );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->patchJson(
                "/api/contratos/{$id}/encerrar",
                [
                    'data_fim' => '2026-10-31',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'contrato'
            );

        $contrato =
            Contrato::findOrFail(
                $id
            );

        expect(
            $contrato->status
        )->toBe(
            'assinado'
        );

        expect(
            $contrato->bloqueado
        )->toBeFalse();
    }
);

test(
    'contrato não aceita data final anterior à inicial na criação',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Cronologia Create',
                'tenant-cronologia-create'
            );

        $user =
            contratoUsuario(
                $tenant,
                'cronologia.create@frotapro.test'
            );

        contratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo' => 'aluguer',

                    'data_inicio' =>
                        '2026-10-20',

                    'data_fim' =>
                        '2026-10-19',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'data_fim'
            );

        expect(
            Contrato::count()
        )->toBe(0);
    }
);

test(
    'atualização não permite data final anterior à data inicial já gravada',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Cronologia Update',
                'tenant-cronologia-update'
            );

        $user =
            contratoUsuario(
                $tenant,
                'cronologia.update@frotapro.test'
            );

        $contrato =
            new Contrato([
                'tipo' => 'aluguer',

                'data_inicio' =>
                    '2026-10-20',
            ]);

        $contrato->tenant_id =
            $tenant->id;

        $contrato->save();

        contratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->patchJson(
                "/api/contratos/{$contrato->id}",
                [
                    'data_fim' =>
                        '2026-10-19',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'data_fim'
            );

        expect(
            $contrato
                ->fresh()
                ->data_fim
        )->toBeNull();
    }
);

test(
    'atualização não permite mover início para depois da data final existente',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Cronologia Inicio',
                'tenant-cronologia-inicio'
            );

        $user =
            contratoUsuario(
                $tenant,
                'cronologia.inicio@frotapro.test'
            );

        $contrato =
            new Contrato([
                'tipo' => 'aluguer',

                'data_inicio' =>
                    '2026-10-01',

                'data_fim' =>
                    '2026-10-20',
            ]);

        $contrato->tenant_id =
            $tenant->id;

        $contrato->save();

        contratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->patchJson(
                "/api/contratos/{$contrato->id}",
                [
                    'data_inicio' =>
                        '2026-10-21',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'data_fim'
            );

        $contrato->refresh();

        expect(
            $contrato
                ->data_inicio
                ->toDateString()
        )->toBe(
            '2026-10-01'
        );
    }
);

test(
    'contrato rejeita entidades inativas',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Entidades Inativas',
                'tenant-entidades-inativas'
            );

        $user =
            contratoUsuario(
                $tenant,
                'entidades.inativas@frotapro.test'
            );

        $motorista =
            contratoMotorista(
                $tenant,
                'Inativo'
            );

        $motorista->ativo = false;
        $motorista->save();

        $proprietario =
            contratoProprietario(
                $tenant,
                'Inativo'
            );

        $proprietario->ativo = false;
        $proprietario->save();

        $veiculo =
            contratoVeiculo(
                $tenant,
                'IN-10-AA',
                300
            );

        $veiculo->ativo = false;
        $veiculo->save();

        contratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->postJson(
                '/api/contratos',
                [
                    'tipo' => 'aluguer',

                    'motorista_id' =>
                        $motorista->id,

                    'proprietario_id' =>
                        $proprietario->id,

                    'veiculo_id' =>
                        $veiculo->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'motorista_id',
                'proprietario_id',
                'veiculo_id',
            ]);

        expect(
            Contrato::count()
        )->toBe(0);
    }
);

test(
    'atualização de contrato não aceita motorista inativo',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Update Motorista Inativo',
                'tenant-update-motorista-inativo'
            );

        $user =
            contratoUsuario(
                $tenant,
                'update.motorista.inativo@frotapro.test'
            );

        $motorista =
            contratoMotorista(
                $tenant,
                'UpdateInativo'
            );

        $motorista->ativo = false;
        $motorista->save();

        $contrato =
            new Contrato([
                'tipo' => 'aluguer',
            ]);

        $contrato->tenant_id =
            $tenant->id;

        $contrato->save();

        contratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->patchJson(
                "/api/contratos/{$contrato->id}",
                [
                    'motorista_id' =>
                        $motorista->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'motorista_id'
            );

        expect(
            $contrato
                ->fresh()
                ->motorista_id
        )->toBeNull();
    }
);

test(
    'atualização de contrato não aceita veículo inativo',
    function () {
        $tenant =
            contratoTenant(
                'Tenant Update Veiculo Inativo',
                'tenant-update-veiculo-inativo'
            );

        $user =
            contratoUsuario(
                $tenant,
                'update.veiculo.inativo@frotapro.test'
            );

        $veiculo =
            contratoVeiculo(
                $tenant,
                'IN-20-BB',
                320
            );

        $veiculo->ativo = false;
        $veiculo->save();

        $contrato =
            new Contrato([
                'tipo' => 'aluguer',
            ]);

        $contrato->tenant_id =
            $tenant->id;

        $contrato->save();

        contratoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                contratoHeaders()
            )
            ->patchJson(
                "/api/contratos/{$contrato->id}",
                [
                    'veiculo_id' =>
                        $veiculo->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'veiculo_id'
            );

        expect(
            $contrato
                ->fresh()
                ->veiculo_id
        )->toBeNull();
    }
);

// FROTAPRO_4L9_LIFECYCLE_CORRIGIDO

test('4l9 ciclo documental preserva numero na emissao incompleta',function(){

    \Illuminate\Support\Facades\Storage::fake('local');

    $tenant=contratoTenant(
        'Tenant Ciclo Documental 4L9',
        'tenant-ciclo-documental-4l9'
    );

    $user=contratoUsuario(
        $tenant,
        'ciclo.documental.4l9@frotapro.test'
    );

    $template=contratoTemplate(
        $tenant,
        '<h1>CONTRATO DE TESTE</h1>'.
        '<p>Campo A: {{CAMPO_MANUAL_A}}</p>'.
        '<p>Campo B: [[CAMPO_MANUAL_B]]</p>',
        'Contrato Ciclo Documental 4L9'
    );

    $motorista=contratoMotorista(
        $tenant,
        'CicloDocumental4L9'
    );

    $veiculo=contratoVeiculo(
        $tenant,
        'XL-49-ZZ',
        250
    );

    contratoLogin($this,$user);

    // ====================================================
    // ETAPA 1 - CRIAR RASCUNHO
    // ====================================================

    $created=$this
        ->withHeaders(contratoHeaders())
        ->postJson(
            '/api/contratos',
            [
                'template_id'=>$template->id,
                'tipo'=>'aluguer',
                'motorista_id'=>$motorista->id,
                'veiculo_id'=>$veiculo->id,
                'data_inicio'=>'2026-10-21',
                'campos_preenchidos'=>[],
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'rascunho'
        );

    $contratoId=$created->json('data.id');

    expect($contratoId)->not->toBeNull();

    // ====================================================
    // ETAPA 2 - IDENTIFICAR DOCUMENTO EXISTENTE
    // ====================================================

    /*
     * AppServiceProvider sincroniza os documentos
     * quando o Eloquent cria o contrato.
     *
     * Portanto o documento e o numero ja existem
     * antes do primeiro pedido de geracao PDF.
     */

    $documentoInicial=\App\Models\Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contratoId)
        ->firstOrFail();

    $documentoIdInicial=$documentoInicial->id;
    $codigoInicial=$documentoInicial->codigo;

    expect($codigoInicial)
        ->toMatch('/^G\d{6}$/');

    expect(
        \Illuminate\Support\Facades\Schema::hasTable(
            'document_sequences'
        )
    )->toBeTrue();

    $numeroInicial=(int)
        \Illuminate\Support\Facades\DB::table(
            'document_sequences'
        )
        ->where('chave','documentos')
        ->value('ultimo_numero');

    expect($numeroInicial)
        ->toBeGreaterThanOrEqual(1);

    $totalDocumentosInicial=\App\Models\Documento::count();

    $ficheirosIniciais=
        \Illuminate\Support\Facades\Storage::disk(
            'local'
        )->allFiles('contract-pdfs');

    $logsPdfIniciais=
        \App\Models\LogAuditoriaContrato::query()
            ->where('contrato_id',$contratoId)
            ->where('acao','geracao_pdf')
            ->count();

    $contrato=\App\Models\Contrato::findOrFail(
        $contratoId
    );

    expect($contrato->pdf_gerado_url)->toBeNull();
    expect($contrato->hash_documento)->toBeNull();

    // ====================================================
    // ETAPA 3 - TENTAR GERAR PDF INCOMPLETO
    // ====================================================

    $failed=$this
        ->withHeaders(contratoHeaders())
        ->postJson(
            "/api/contratos/{$contratoId}/pdf"
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'campos_preenchidos'
        );

    $erros=$failed->json(
        'errors.campos_preenchidos'
    );

    $mensagem=implode(
        ' ',
        is_array($erros) ? $erros : []
    );

    expect($mensagem)
        ->toContain('CAMPO_MANUAL_A')
        ->toContain('CAMPO_MANUAL_B');

    // ====================================================
    // ETAPA 4 - VERIFICAR AUSENCIA DE ALTERACOES
    // ====================================================

    $contrato->refresh();

    expect($contrato->pdf_gerado_url)->toBeNull();
    expect($contrato->hash_documento)->toBeNull();

    $documentoDepoisFalha=
        \App\Models\Documento::query()
            ->where('entidade_tipo','contrato')
            ->where('entidade_id',$contratoId)
            ->firstOrFail();

    expect($documentoDepoisFalha->id)
        ->toBe($documentoIdInicial);

    expect($documentoDepoisFalha->codigo)
        ->toBe($codigoInicial);

    expect(\App\Models\Documento::count())
        ->toBe($totalDocumentosInicial);

    $numeroDepoisFalha=(int)
        \Illuminate\Support\Facades\DB::table(
            'document_sequences'
        )
        ->where('chave','documentos')
        ->value('ultimo_numero');

    expect($numeroDepoisFalha)
        ->toBe($numeroInicial);

    expect(
        \Illuminate\Support\Facades\Storage::disk(
            'local'
        )->allFiles('contract-pdfs')
    )->toBe($ficheirosIniciais);

    expect(
        \App\Models\LogAuditoriaContrato::query()
            ->where('contrato_id',$contratoId)
            ->where('acao','geracao_pdf')
            ->count()
    )->toBe($logsPdfIniciais);

    // ====================================================
    // ETAPA 5 - CORRIGIR OS CAMPOS MANUAIS
    // ====================================================

    $this
        ->withHeaders(contratoHeaders())
        ->patchJson(
            "/api/contratos/{$contratoId}",
            [
                'campos_preenchidos'=>[
                    'CAMPO_MANUAL_A'=>
                        'Valor contratual preenchido',
                    'CAMPO_MANUAL_B'=>
                        'Segundo campo preenchido',
                ],
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'rascunho'
        );

    /*
     * A atualizacao do rascunho pode sincronizar
     * novamente os metadados do documento.
     * Nao deve atribuir outro codigo.
     */

    $documentoDepoisEdicao=
        \App\Models\Documento::query()
            ->where('entidade_tipo','contrato')
            ->where('entidade_id',$contratoId)
            ->firstOrFail();

    expect($documentoDepoisEdicao->id)
        ->toBe($documentoIdInicial);

    expect($documentoDepoisEdicao->codigo)
        ->toBe($codigoInicial);

    $numeroDepoisEdicao=(int)
        \Illuminate\Support\Facades\DB::table(
            'document_sequences'
        )
        ->where('chave','documentos')
        ->value('ultimo_numero');

    expect($numeroDepoisEdicao)
        ->toBe($numeroInicial);

    // ====================================================
    // ETAPA 6 - EMITIR O PDF DEFINITIVO
    // ====================================================

    $issued=$this
        ->withHeaders(contratoHeaders())
        ->postJson(
            "/api/contratos/{$contratoId}/pdf"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.pdf_disponivel',
            true
        )
        ->assertJsonPath(
            'data.codigo_documento',
            $codigoInicial
        );

    expect($issued->json('data.codigo_documento'))
        ->toBe($codigoInicial);

    // ====================================================
    // ETAPA 7 - CONFIRMAR NUMERACAO ESTAVEL
    // ====================================================

    $documentoFinal=\App\Models\Documento::query()
        ->where('entidade_tipo','contrato')
        ->where('entidade_id',$contratoId)
        ->firstOrFail();

    expect($documentoFinal->id)
        ->toBe($documentoIdInicial);

    expect($documentoFinal->codigo)
        ->toBe($codigoInicial);

    expect(\App\Models\Documento::count())
        ->toBe($totalDocumentosInicial);

    $numeroFinal=(int)
        \Illuminate\Support\Facades\DB::table(
            'document_sequences'
        )
        ->where('chave','documentos')
        ->value('ultimo_numero');

    expect($numeroFinal)
        ->toBe($numeroInicial);

    // ====================================================
    // ETAPA 8 - VALIDAR O FICHEIRO PDF E O HASH
    // ====================================================

    $contrato->refresh();

    expect($contrato->pdf_gerado_url)
        ->not->toBeNull();

    expect($contrato->hash_documento)
        ->toMatch('/^[a-f0-9]{64}$/');

    \Illuminate\Support\Facades\Storage::disk('local')
        ->assertExists(
            $contrato->pdf_gerado_url
        );

    $binary=
        \Illuminate\Support\Facades\Storage::disk(
            'local'
        )->get($contrato->pdf_gerado_url);

    expect($binary)->toStartWith('%PDF-');

    $texto=(new \Smalot\PdfParser\Parser())
        ->parseContent($binary)
        ->getText();

    expect($texto)
        ->toContain('Valor contratual preenchido')
        ->toContain('Segundo campo preenchido')
        ->toContain($codigoInicial);

    expect(hash('sha256',$binary))
        ->toBe($contrato->hash_documento);

    expect(
        \App\Models\LogAuditoriaContrato::query()
            ->where('contrato_id',$contratoId)
            ->where('acao','geracao_pdf')
            ->count()
    )->toBe($logsPdfIniciais+1);
});

/*
 * FROTAPRO 4N26
 * Assinaturas por versao e emissao definitiva.
 *
 * Os testes usam SQLite isolado e Storage::fake.
 * Nenhum contrato da base operacional e alterado.
 */

function frotaPro4N26Fixture(
    ?int $signatureVersion,
    bool $pendingRetification=false
): array {
    $tenant=contratoTenant(
        'Tenant 4N26',
        'tenant-seguranca-4n26'
    );

    $user=contratoUsuario(
        $tenant,
        'validacao.4n26@frotapro.test'
    );

    $template=contratoTemplate(
        $tenant,
        '<h1>Contrato de validacao 4N26</h1>'.
        '<p>Inicio: {{DATA_INICIO}}</p>'.
        '<p>Fim: {{DATA_FIM}}</p>'.
        '<p>Motorista: {{ASSINATURA_MOTORISTA}}</p>'.
        '<p>Empresa: {{ASSINATURA_EMPRESA}}</p>'
    );

    $fields=$pendingRetification
        ? ['FROTAPRO_RETIFICACAO_PENDENTE'=>'v2']
        : [];

    /*
     * Simula campos de assinatura que ficaram
     * guardados historicamente no contrato.
     * Nunca devem substituir a validacao da versao.
     */
    $image='data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'.
        'AAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

    $fields['ASSINATURA_MOTORISTA']=$image;
    $fields['ASSINATURA_EMPRESA']=$image;

    $contract=new Contrato([
        'template_id'=>$template->id,
        'tipo'=>'aluguer',
        'data_inicio'=>'2026-11-01',
        'data_fim'=>'2027-11-01',
        'campos_preenchidos'=>$fields,
    ]);

    $contract->tenant_id=$tenant->id;
    $contract->versao_atual=2;

    $contract->status=$pendingRetification
        ? 'rascunho'
        : 'assinado';

    $contract->data_assinatura=$pendingRetification
        ? null
        : now();

    $contract->save();

    foreach([
        'ASSINATURA_MOTORISTA'=>'motorista',
        'ASSINATURA_EMPRESA'=>'empresa',
    ] as $placeholder=>$type){
        $signature=new AssinaturaDigital([
            'signatario_tipo'=>$type,
            'signatario_nome'=>'Signatario Teste',
            'signatario_email'=>'assinatura.4n26@frotapro.test',
            'placeholder'=>$placeholder,
            'assinatura_url'=>$image,
            'status'=>'assinado',
        ]);

        $signature->tenant_id=$tenant->id;
        $signature->contrato_id=$contract->id;
        $signature->contrato_versao=$signatureVersion;
        $signature->verificado=true;
        $signature->assinado_em=now();

        $signature->save();
    }

    return [$tenant,$user,$contract];
}

test('4n26 retificacao pendente impede emissao definitiva',function(){
    Storage::fake('local');

    [$tenant,$user,$contract]=frotaPro4N26Fixture(
        1,
        true
    );

    contratoLogin($this,$user);

    $before=Documento::count();

    $this->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$contract->id}/pdf")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['contrato']);

    expect(Documento::count())->toBe($before);

    $contract->refresh();

    expect($contract->pdf_gerado_url)->toBeNull();
    expect($contract->hash_documento)->toBeNull();
    expect($contract->status)->toBe('rascunho');
});

test('4n26 versao anterior nao permite emissao definitiva',function(){
    Storage::fake('local');

    /*
     * Retiramos propositadamente o marcador de
     * retificacao para testar a seguranca real
     * da vinculacao das assinaturas a V2.
     */
    [$tenant,$user,$contract]=frotaPro4N26Fixture(1,false);

    contratoLogin($this,$user);

    $before=Documento::count();

    $this->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$contract->id}/pdf")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['contrato']);

    expect(Documento::count())->toBe($before);

    $contract->refresh();

    expect($contract->pdf_gerado_url)->toBeNull();
    expect($contract->hash_documento)->toBeNull();
});

test('4n26 assinaturas atuais permitem emissao definitiva',function(){
    Storage::fake('local');

    [$tenant,$user,$contract]=frotaPro4N26Fixture(2,false);

    contratoLogin($this,$user);

    $this->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$contract->id}/pdf")
        ->assertOk()
        ->assertJsonPath('data.pdf_disponivel',true);

    $contract->refresh();

    expect($contract->pdf_gerado_url)->not->toBeNull();
    expect($contract->hash_documento)->toMatch(
        '/^[a-f0-9]{64}$/'
    );

    Storage::disk('local')->assertExists(
        $contract->pdf_gerado_url
    );
});

test('4n26 outra empresa nao emite pdf do contrato',function(){
    Storage::fake('local');

    [$tenant,$user,$contract]=frotaPro4N26Fixture(2,false);

    $otherTenant=contratoTenant(
        'Outro Tenant 4N26',
        'outro-tenant-4n26'
    );

    $otherUser=contratoUsuario(
        $otherTenant,
        'outro.tenant.4n26@frotapro.test'
    );

    contratoLogin($this,$otherUser);

    $this->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$contract->id}/pdf")
        ->assertNotFound();

    expect($contract->fresh()->pdf_gerado_url)->toBeNull();
});

test('4n26 uma assinatura antiga e outra atual nao permitem emissao',function(){
    Storage::fake('local');

    [$tenant,$user,$contract]=frotaPro4N26Fixture(
        2,
        false
    );

    AssinaturaDigital::query()
        ->where('contrato_id',$contract->id)
        ->where(
            'placeholder',
            'ASSINATURA_EMPRESA'
        )
        ->update([
            'contrato_versao'=>1,
        ]);

    contratoLogin($this,$user);

    $before=Documento::count();

    $this->withHeaders(contratoHeaders())
        ->postJson("/api/contratos/{$contract->id}/pdf")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['contrato']);

    expect(Documento::count())->toBe($before);

    $contract->refresh();

    expect($contract->pdf_gerado_url)->toBeNull();
    expect($contract->hash_documento)->toBeNull();
});
