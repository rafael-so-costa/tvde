<?php

use App\Models\AssinaturaDigital;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            'permission_id' =>
            $permission->id,
        ],
        [
            'nivel' => $nivel,
        ]
    );

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
        'nome_completo' =>
        "Motorista {$sufixo}",
        'email' =>
        strtolower($sufixo) .
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
        'nome_completo' =>
        "Proprietário {$sufixo}",
        'email' =>
        strtolower($sufixo) .
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
        'proprietario_id' =>
        $proprietario?->id,
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
            'NOME_MOTORISTA' =>
            $motorista->nome_completo,
        ],

        'assinaturas' => [
            [
                'placeholder' =>
                'ASSINATURA_MOTORISTA',
                'modo' => 'presencial',
                'assinatura_url' =>
                'data:image/png;base64,TESTE',
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
            'data_assinatura' =>
            now()->toISOString(),
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
            'motorista_id' =>
            $motorista->id,
            'veiculo_id' => $veiculo->id,
            'campos_preenchidos' => [
                'NOME_MOTORISTA' =>
                $motorista
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
            'motorista_id' =>
            $motorista->id,
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
            'motorista_id' =>
            $motorista->id,
            'veiculo_id' =>
            $veiculo->id,

            'assinaturas' => [
                [
                    'placeholder' =>
                    'ASSINATURA_MOTORISTA',
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
            'motorista_id' =>
            $motorista->id,
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
            'placeholder' =>
            'ASSINATURA_MOTORISTA',
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
                'veiculo_id' =>
                $veiculoB->id,
                'campos_preenchidos' => [
                    'CAMPO' =>
                    'Versão 2',
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
        ['Um', 'Dois', 'Tres']
        as $indice => $nome
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
            'motorista_id' =>
            $motorista->id,
            'veiculo_id' =>
            $veiculoA->id,
            'ativo' => 0,
        ]
    );

    $this->assertDatabaseHas(
        'contratos_ativos_veiculos',
        [
            'motorista_id' =>
            $motorista->id,
            'veiculo_id' =>
            $veiculoB->id,
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

    $this->withHeaders(
        contratoHeaders()
    )
        ->patchJson(
            "/api/contratos/{$id}/encerrar",
            [
                'data_fim' =>
                '2026-10-31',
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
