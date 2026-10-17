<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function motoristaSpaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function criarTenantMotorista(string $nome, string $slug): Tenant
{
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function criarUsuarioMotorista(
    string $email,
    Tenant $tenant,
    string $nivel
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = Role::create([
        'codigo' => 'funcionario',
        'nome' => 'Funcionário',
        'sistema' => true,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $permission = Permission::create([
        'codigo' => 'motoristas',
        'modulo' => 'motoristas',
        'nome' => 'Motoristas',
    ]);

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => $nivel,
    ]);

    return $user;
}

function autenticarUsuarioMotorista($test, User $user): void
{
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function dadosMotoristaCompleto(array $overrides = []): array
{
    return array_merge([
        'nome_completo' => 'Motorista Teste',
        'nif' => '245123458',
        'email' => 'motorista@example.test',
        'telemovel' => '+351912345678',
        'data_nascimento' => '1990-05-10',
        'filhos' => 1,
        'estado_civil' => 'solteiro',

        'tipo_documento' => 'cartao_cidadao',
        'numero_documento' => '12345678',
        'documento_valid_until' => '2030-01-01',

        'carta_numero' => 'L-1234567',
        'carta_valid_until' => '2030-02-01',

        'registo_criminal_valid_until' => '2030-03-01',

        'endereco_rua' => 'Rua do Motorista',
        'endereco_numero' => '10',
        'endereco_complemento' => '2.º Esq.',
        'endereco_cidade' => 'Lisboa',
        'endereco_cep' => '1000-100',

        'iban' => 'PT50000201231234567890154',

        'bolt_email' => 'bolt@example.test',
        'bolt_telemovel' => '+351911111111',
        'uber_email' => 'uber@example.test',
        'uber_telemovel' => '+351922222222',

        'certificado_tvde' => 'TVDE-123456',
        'certificado_tvde_valid_until' => '2030-04-01',

        'cartao_frota' => 'FROTA-123',

        'contato_urgencia_nome' => 'Contacto Urgência',
        'contato_urgencia_telemovel' => '+351933333333',

        'fotos_galeria' => [
            'https://example.test/foto-1.jpg',
            'https://example.test/foto-2.jpg',
        ],

        'documentos_upload' => [
            [
                'url' => 'https://example.test/carta.pdf',
                'tipo' => 'Carta de Condução',
                'nome_arquivo' => 'carta.pdf',
                'data_validade' => '2030-02-01',
            ],
            [
                'url' => 'https://example.test/iban.pdf',
                'tipo' => 'Comprovativo de IBAN',
                'nome_arquivo' => 'iban.pdf',
            ],
        ],
    ], $overrides);
}

function criarMotoristaDireto(
    Tenant $tenant,
    array $dados = []
): Motorista {
    $motorista = new Motorista(
        dadosMotoristaCompleto($dados)
    );

    $motorista->tenant_id = $tenant->id;

    if (
        blank(
            $motorista->getRawOriginal(
                'foto_perfil_url'
            )
        )
    ) {
        $motorista->foto_perfil_url =
            'motoristas/testes/perfil.jpg';
    }

    $motorista->sincronizarCadastro();
    $motorista->save();

    return $motorista;
}

test('rotas de motoristas exigem autenticação', function () {
    $this->withHeaders(motoristaSpaHeaders())
        ->getJson('/api/motoristas')
        ->assertUnauthorized();
});

test('cliente não pode definir tenant user ativo ou status do motorista', function () {
    $tenant = criarTenantMotorista(
        'Tenant Segurança Motorista',
        'tenant-seguranca-motorista'
    );

    $outroTenant = criarTenantMotorista(
        'Tenant Malicioso Motorista',
        'tenant-malicioso-motorista'
    );

    $outroUser = User::factory()->create();

    $user = criarUsuarioMotorista(
        'seguranca.motorista@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $payload = dadosMotoristaCompleto([
        'tenant_id' => $outroTenant->id,
        'user_id' => $outroUser->id,
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(motoristaSpaHeaders())
        ->postJson('/api/motoristas', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'user_id',
            'ativo',
            'status_cadastro',
        ]);

    $this->assertDatabaseMissing('motoristas', [
        'nif' => '245123458',
    ]);
});

test('motorista incompleto é guardado inativo', function () {
    $tenant = criarTenantMotorista(
        'Tenant Incompleto Motorista',
        'tenant-incompleto-motorista'
    );

    $user = criarUsuarioMotorista(
        'incompleto.motorista@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $response = $this->withHeaders(motoristaSpaHeaders())
        ->postJson('/api/motoristas', [
            'nome_completo' => 'Motorista Incompleto',
        ])
        ->assertCreated();

    $response
        ->assertJsonPath(
            'data.nome_completo',
            'Motorista Incompleto'
        )
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath(
            'data.status_cadastro',
            'incompleto'
        );

    $this->assertDatabaseHas('motoristas', [
        'tenant_id' => $tenant->id,
        'nome_completo' => 'Motorista Incompleto',
        'ativo' => false,
        'status_cadastro' => 'incompleto',
    ]);
});

test('motorista sem fotografia fica incompleto mesmo com restantes dados completos', function () {
    $tenant = criarTenantMotorista(
        'Tenant Completo Motorista',
        'tenant-completo-motorista'
    );

    $user = criarUsuarioMotorista(
        'completo.motorista@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $response = $this->withHeaders(motoristaSpaHeaders())
        ->postJson(
            '/api/motoristas',
            dadosMotoristaCompleto()
        )
        ->assertCreated();

    $response
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath('data.status_cadastro', 'incompleto')
        ->assertJsonPath('data.nif', '245123458')
        ->assertJsonPath(
            'data.bolt_email',
            'bolt@example.test'
        )
        ->assertJsonPath(
            'data.uber_email',
            'uber@example.test'
        )
        ->assertJsonPath(
            'data.certificado_tvde',
            'TVDE-123456'
        )
        ->assertJsonPath(
            'data.cartao_frota',
            'FROTA-123'
        )
        ->assertJsonPath(
            'data.documentos_upload.0.tipo',
            'Carta de Condução'
        )
        ->assertJsonPath(
            'data.documentos_upload.0.nome_arquivo',
            'carta.pdf'
        )
        ->assertJsonPath(
            'data.documentos_upload.1.tipo',
            'Comprovativo de IBAN'
        )
        ->assertJsonCount(
            2,
            'data.fotos_galeria'
        )
        ->assertJsonCount(
            2,
            'data.documentos_upload'
        );

    $this->assertDatabaseHas('motoristas', [
        'tenant_id' => $tenant->id,
        'nome_completo' => 'Motorista Teste',
        'nif' => '245123458',
        'ativo' => false,
        'status_cadastro' => 'incompleto',
        'certificado_tvde' => 'TVDE-123456',
        'cartao_frota' => 'FROTA-123',
    ]);
});

test('documentos enviados precisam respeitar a estrutura esperada', function () {
    $tenant = criarTenantMotorista(
        'Tenant Documentos Motorista',
        'tenant-documentos-motorista'
    );

    $user = criarUsuarioMotorista(
        'documentos.motorista@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $payload = dadosMotoristaCompleto([
        'documentos_upload' => [
            [
                'url' => 'https://example.test/documento.pdf',
            ],
        ],
    ]);

    $this->withHeaders(motoristaSpaHeaders())
        ->postJson('/api/motoristas', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'documentos_upload.0.tipo',
            'documentos_upload.0.nome_arquivo',
        ]);
});

test('nif não pode repetir dentro do mesmo tenant', function () {
    $tenant = criarTenantMotorista(
        'Tenant NIF Único Motorista',
        'tenant-nif-unico-motorista'
    );

    criarMotoristaDireto($tenant, [
        'nif' => '245999990',
        'email' => 'existente@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'nif.unico.motorista@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->postJson(
            '/api/motoristas',
            dadosMotoristaCompleto([
                'nif' => '245999990',
                'email' => 'novo@example.test',
            ])
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('nif');

    expect(
        Motorista::where('tenant_id', $tenant->id)
            ->where('nif', '245999990')
            ->count()
    )->toBe(1);
});

test('mesmo nif pode existir em tenants diferentes', function () {
    $tenantA = criarTenantMotorista(
        'Tenant A NIF Motorista',
        'tenant-a-nif-motorista'
    );

    $tenantB = criarTenantMotorista(
        'Tenant B NIF Motorista',
        'tenant-b-nif-motorista'
    );

    criarMotoristaDireto($tenantB, [
        'nif' => '245888888',
        'email' => 'motorista.b@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'motorista.a@frotapro.test',
        $tenantA,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->postJson(
            '/api/motoristas',
            dadosMotoristaCompleto([
                'nif' => '245888888',
                'email' => 'motorista.a@example.test',
            ])
        )
        ->assertCreated();

    $this->assertDatabaseHas('motoristas', [
        'tenant_id' => $tenantA->id,
        'nif' => '245888888',
    ]);

    $this->assertDatabaseHas('motoristas', [
        'tenant_id' => $tenantB->id,
        'nif' => '245888888',
    ]);
});

test('listagem retorna apenas motoristas do tenant atual', function () {
    $tenantA = criarTenantMotorista(
        'Tenant A Listagem Motorista',
        'tenant-a-listagem-motorista'
    );

    $tenantB = criarTenantMotorista(
        'Tenant B Listagem Motorista',
        'tenant-b-listagem-motorista'
    );

    criarMotoristaDireto($tenantA, [
        'nome_completo' => 'Motorista Tenant A',
        'nif' => '245111115',
        'email' => 'lista.a@example.test',
    ]);

    criarMotoristaDireto($tenantB, [
        'nome_completo' => 'Motorista Tenant B',
        'nif' => '245222227',
        'email' => 'lista.b@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'lista.motorista@frotapro.test',
        $tenantA,
        'visualizar'
    );

    autenticarUsuarioMotorista($this, $user);

    $response = $this->withHeaders(motoristaSpaHeaders())
        ->getJson('/api/motoristas')
        ->assertOk();

    $response
        ->assertJsonCount(1, 'data')
        ->assertJsonPath(
            'data.0.nome_completo',
            'Motorista Tenant A'
        );

    expect(
        collect($response->json('data'))
            ->pluck('nome_completo')
            ->contains('Motorista Tenant B')
    )->toBeFalse();
});

test('não permite ler alterar ou excluir motorista de outro tenant', function () {
    $tenantA = criarTenantMotorista(
        'Tenant A Isolamento Motorista',
        'tenant-a-isolamento-motorista'
    );

    $tenantB = criarTenantMotorista(
        'Tenant B Isolamento Motorista',
        'tenant-b-isolamento-motorista'
    );

    $motoristaB = criarMotoristaDireto($tenantB, [
        'nome_completo' => 'Motorista Protegido',
        'nif' => '245333339',
        'email' => 'protegido@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'isolamento.motorista@frotapro.test',
        $tenantA,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->getJson("/api/motoristas/{$motoristaB->id}")
        ->assertNotFound();

    $this->withHeaders(motoristaSpaHeaders())
        ->patchJson(
            "/api/motoristas/{$motoristaB->id}",
            [
                'nome_completo' => 'Tentativa de Alteração',
            ]
        )
        ->assertNotFound();

    $this->withHeaders(motoristaSpaHeaders())
        ->deleteJson("/api/motoristas/{$motoristaB->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('motoristas', [
        'id' => $motoristaB->id,
        'tenant_id' => $tenantB->id,
        'nome_completo' => 'Motorista Protegido',
    ]);
});

test('permissão visualizar permite leitura e bloqueia criação', function () {
    $tenant = criarTenantMotorista(
        'Tenant Visualizar Motorista',
        'tenant-visualizar-motorista'
    );

    criarMotoristaDireto($tenant, [
        'nif' => '245444440',
        'email' => 'visualizar@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'visualizar.motorista@frotapro.test',
        $tenant,
        'visualizar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->getJson('/api/motoristas')
        ->assertOk();

    $this->withHeaders(motoristaSpaHeaders())
        ->postJson(
            '/api/motoristas',
            dadosMotoristaCompleto([
                'nif' => '245444459',
                'email' => 'bloqueado@example.test',
            ])
        )
        ->assertForbidden();

    $this->assertDatabaseMissing('motoristas', [
        'nif' => '245444459',
    ]);
});

test('motorista incompleto não pode ser ativado manualmente', function () {
    $tenant = criarTenantMotorista(
        'Tenant Status Incompleto Motorista',
        'tenant-status-incompleto-motorista'
    );

    $motorista = new Motorista([
        'nome_completo' => 'Motorista Incompleto Status',
    ]);

    $motorista->tenant_id = $tenant->id;

    if (
        blank(
            $motorista->getRawOriginal(
                'foto_perfil_url'
            )
        )
    ) {
        $motorista->foto_perfil_url =
            'motoristas/testes/perfil.jpg';
    }

    $motorista->sincronizarCadastro();
    $motorista->save();

    $user = criarUsuarioMotorista(
        'status.incompleto@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->patchJson(
            "/api/motoristas/{$motorista->id}/status",
            ['ativo' => true]
        )
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'O motorista possui cadastro incompleto e não pode ser ativado.'
        );

    $this->assertDatabaseHas('motoristas', [
        'id' => $motorista->id,
        'ativo' => false,
        'status_cadastro' => 'incompleto',
    ]);
});

test('motorista completo pode ser inativado e reativado', function () {
    $tenant = criarTenantMotorista(
        'Tenant Status Completo Motorista',
        'tenant-status-completo-motorista'
    );

    $motorista = criarMotoristaDireto($tenant, [
        'nif' => '245555552',
        'email' => 'status.completo@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'status.completo.user@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->patchJson(
            "/api/motoristas/{$motorista->id}/status",
            ['ativo' => false]
        )
        ->assertOk()
        ->assertJsonPath('data.ativo', false)
        ->assertJsonPath(
            'data.status_cadastro',
            'ativo'
        );

    $this->assertDatabaseHas('motoristas', [
        'id' => $motorista->id,
        'ativo' => false,
        'status_cadastro' => 'ativo',
    ]);

    $this->withHeaders(motoristaSpaHeaders())
        ->patchJson(
            "/api/motoristas/{$motorista->id}/status",
            ['ativo' => true]
        )
        ->assertOk()
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath(
            'data.status_cadastro',
            'ativo'
        );

    $this->assertDatabaseHas('motoristas', [
        'id' => $motorista->id,
        'ativo' => true,
        'status_cadastro' => 'ativo',
    ]);
});

test('permissão configurar permite atualizar e excluir motorista', function () {
    $tenant = criarTenantMotorista(
        'Tenant Configurar Motorista',
        'tenant-configurar-motorista'
    );

    $motorista = criarMotoristaDireto($tenant, [
        'nif' => '245666664',
        'email' => 'configurar@example.test',
    ]);

    $user = criarUsuarioMotorista(
        'configurar.motorista@frotapro.test',
        $tenant,
        'configurar'
    );

    autenticarUsuarioMotorista($this, $user);

    $this->withHeaders(motoristaSpaHeaders())
        ->patchJson(
            "/api/motoristas/{$motorista->id}",
            [
                'nome_completo' => 'Motorista Atualizado',
                'bolt_email' => 'novo.bolt@example.test',
                'cartao_frota' => 'FROTA-999',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.nome_completo',
            'Motorista Atualizado'
        )
        ->assertJsonPath(
            'data.bolt_email',
            'novo.bolt@example.test'
        )
        ->assertJsonPath(
            'data.cartao_frota',
            'FROTA-999'
        );

    $this->assertDatabaseHas('motoristas', [
        'id' => $motorista->id,
        'tenant_id' => $tenant->id,
        'nome_completo' => 'Motorista Atualizado',
        'bolt_email' => 'novo.bolt@example.test',
        'cartao_frota' => 'FROTA-999',
    ]);

    $this->withHeaders(motoristaSpaHeaders())
        ->deleteJson("/api/motoristas/{$motorista->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('motoristas', [
        'id' => $motorista->id,
    ]);
});

test('foto privada conta como preenchida antes do primeiro save', function () {
    $tenant = criarTenantMotorista(
        'Tenant Foto Pré Save',
        'tenant-foto-pre-save'
    );

    $motorista = new Motorista(
        dadosMotoristaCompleto()
    );

    $motorista->tenant_id =
        $tenant->id;

    $motorista->foto_perfil_url =
        'motoristas/testes/perfil.jpg';

    expect(
        $motorista->exists
    )->toBeFalse();

    $motorista->sincronizarCadastro();

    expect(
        $motorista->status_cadastro
    )->toBe('ativo');

    expect(
        $motorista->ativo
    )->toBeTrue();

    $motorista->save();

    $motorista->refresh();

    expect(
        $motorista->status_cadastro
    )->toBe('ativo');

    expect(
        $motorista->ativo
    )->toBeTrue();
});

test(
    'motorista normaliza dados portugueses no cadastro',
    function () {
        $tenant =
            criarTenantMotorista(
                'Tenant Normalização Motorista',
                'tenant-normalizacao-motorista'
            );

        $user =
            criarUsuarioMotorista(
                'normalizacao.motorista@frotapro.test',
                $tenant,
                'configurar'
            );

        autenticarUsuarioMotorista(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    motoristaSpaHeaders()
                )
                ->postJson(
                    '/api/motoristas',
                    [
                        'nome_completo' =>
                            'Motorista Normalizado',

                        'nif' =>
                            'PT 245 716 297',

                        'email' =>
                            ' MOTORISTA.NORMALIZADO@EXAMPLE.TEST ',

                        'telemovel' =>
                            '+351 912 345 678',

                        'endereco_cep' =>
                            '1000 001',

                        'iban' =>
                            'PT50 1234 4321 1234 5678 9017 2',

                        'bolt_email' =>
                            ' BOLT.MOTORISTA@EXAMPLE.TEST ',

                        'bolt_telemovel' =>
                            '+351 911 111 111',

                        'uber_email' =>
                            ' UBER.MOTORISTA@EXAMPLE.TEST ',

                        'uber_telemovel' =>
                            '00351 922 222 222',

                        'contato_urgencia_nome' =>
                            'Contacto Teste',

                        'contato_urgencia_telemovel' =>
                            '+351 933 333 333',
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.nif',
                    '245716297'
                )
                ->assertJsonPath(
                    'data.email',
                    'motorista.normalizado@example.test'
                )
                ->assertJsonPath(
                    'data.telemovel',
                    '912345678'
                )
                ->assertJsonPath(
                    'data.endereco_cep',
                    '1000-001'
                )
                ->assertJsonPath(
                    'data.iban',
                    'PT50123443211234567890172'
                )
                ->assertJsonPath(
                    'data.bolt_email',
                    'bolt.motorista@example.test'
                )
                ->assertJsonPath(
                    'data.bolt_telemovel',
                    '911111111'
                )
                ->assertJsonPath(
                    'data.uber_email',
                    'uber.motorista@example.test'
                )
                ->assertJsonPath(
                    'data.uber_telemovel',
                    '922222222'
                )
                ->assertJsonPath(
                    'data.contato_urgencia_telemovel',
                    '933333333'
                );

        $id =
            $response->json(
                'data.id'
            );

        $this->assertDatabaseHas(
            'motoristas',
            [
                'id' => $id,

                'tenant_id' =>
                    $tenant->id,

                'nif' =>
                    '245716297',

                'email' =>
                    'motorista.normalizado@example.test',

                'telemovel' =>
                    '912345678',

                'endereco_cep' =>
                    '1000-001',

                'iban' =>
                    'PT50123443211234567890172',

                'bolt_email' =>
                    'bolt.motorista@example.test',

                'bolt_telemovel' =>
                    '911111111',

                'uber_email' =>
                    'uber.motorista@example.test',

                'uber_telemovel' =>
                    '922222222',

                'contato_urgencia_telemovel' =>
                    '933333333',
            ]
        );
    }
);

test(
    'motorista rejeita dados portugueses inválidos no cadastro',
    function () {
        $tenant =
            criarTenantMotorista(
                'Tenant Validação Motorista',
                'tenant-validacao-motorista'
            );

        $user =
            criarUsuarioMotorista(
                'validacao.motorista@frotapro.test',
                $tenant,
                'configurar'
            );

        autenticarUsuarioMotorista(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaSpaHeaders()
            )
            ->postJson(
                '/api/motoristas',
                [
                    'nome_completo' =>
                        'Motorista Inválido',

                    'nif' =>
                        '245716298',

                    'email' =>
                        'email-invalido',

                    'telemovel' =>
                        '+34 612 345 678',

                    'endereco_cep' =>
                        '0000-000',

                    'iban' =>
                        'PT50123443211234567890173',

                    'bolt_email' =>
                        'bolt-invalido',

                    'bolt_telemovel' =>
                        '123456789',

                    'uber_email' =>
                        'uber-invalido',

                    'uber_telemovel' =>
                        '91234567',

                    'contato_urgencia_nome' =>
                        'Contacto Inválido',

                    'contato_urgencia_telemovel' =>
                        '+34 699 999 999',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'nif',
                'email',
                'telemovel',
                'endereco_cep',
                'iban',
                'bolt_email',
                'bolt_telemovel',
                'uber_email',
                'uber_telemovel',
                'contato_urgencia_telemovel',
            ]);

        expect(
            Motorista::query()
                ->where(
                    'tenant_id',
                    $tenant->id
                )
                ->count()
        )->toBe(0);
    }
);

test(
    'motorista normaliza dados portugueses na atualização',
    function () {
        $tenant =
            criarTenantMotorista(
                'Tenant Update Normalização Motorista',
                'tenant-update-normalizacao-motorista'
            );

        $user =
            criarUsuarioMotorista(
                'update.normalizacao.motorista@frotapro.test',
                $tenant,
                'configurar'
            );

        $motorista =
            criarMotoristaDireto(
                $tenant,
                [
                    'email' =>
                        'antes.update@example.test',
                ]
            );

        autenticarUsuarioMotorista(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaSpaHeaders()
            )
            ->patchJson(
                "/api/motoristas/{$motorista->id}",
                [
                    'nif' =>
                        'PT 501 234 560',

                    'email' =>
                        ' MOTORISTA.UPDATE@EXAMPLE.TEST ',

                    'telemovel' =>
                        '00351 934 567 890',

                    'endereco_cep' =>
                        '1200 321',

                    'iban' =>
                        'PT50 1234 4321 1234 5678 9017 2',

                    'bolt_email' =>
                        ' BOLT.UPDATE@EXAMPLE.TEST ',

                    'bolt_telemovel' =>
                        '+351 935 111 111',

                    'uber_email' =>
                        ' UBER.UPDATE@EXAMPLE.TEST ',

                    'uber_telemovel' =>
                        '+351 936 222 222',

                    'contato_urgencia_telemovel' =>
                        '+351 937 333 333',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.nif',
                '501234560'
            )
            ->assertJsonPath(
                'data.email',
                'motorista.update@example.test'
            )
            ->assertJsonPath(
                'data.telemovel',
                '934567890'
            )
            ->assertJsonPath(
                'data.endereco_cep',
                '1200-321'
            )
            ->assertJsonPath(
                'data.iban',
                'PT50123443211234567890172'
            )
            ->assertJsonPath(
                'data.bolt_email',
                'bolt.update@example.test'
            )
            ->assertJsonPath(
                'data.bolt_telemovel',
                '935111111'
            )
            ->assertJsonPath(
                'data.uber_email',
                'uber.update@example.test'
            )
            ->assertJsonPath(
                'data.uber_telemovel',
                '936222222'
            )
            ->assertJsonPath(
                'data.contato_urgencia_telemovel',
                '937333333'
            );

        $this->assertDatabaseHas(
            'motoristas',
            [
                'id' =>
                    $motorista->id,

                'nif' =>
                    '501234560',

                'email' =>
                    'motorista.update@example.test',

                'telemovel' =>
                    '934567890',

                'endereco_cep' =>
                    '1200-321',

                'iban' =>
                    'PT50123443211234567890172',

                'bolt_email' =>
                    'bolt.update@example.test',

                'bolt_telemovel' =>
                    '935111111',

                'uber_email' =>
                    'uber.update@example.test',

                'uber_telemovel' =>
                    '936222222',

                'contato_urgencia_telemovel' =>
                    '937333333',
            ]
        );
    }
);

test(
    'motorista rejeita dados portugueses inválidos na atualização sem alterar registo',
    function () {
        $tenant =
            criarTenantMotorista(
                'Tenant Update Inválido Motorista',
                'tenant-update-invalido-motorista'
            );

        $user =
            criarUsuarioMotorista(
                'update.invalido.motorista@frotapro.test',
                $tenant,
                'configurar'
            );

        $motorista =
            criarMotoristaDireto(
                $tenant,
                [
                    'nif' =>
                        '245123458',

                    'email' =>
                        'original@example.test',

                    'telemovel' =>
                        '912345678',

                    'endereco_cep' =>
                        '1000-100',

                    'iban' =>
                        'PT50000201231234567890154',
                ]
            );

        autenticarUsuarioMotorista(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaSpaHeaders()
            )
            ->patchJson(
                "/api/motoristas/{$motorista->id}",
                [
                    'nif' =>
                        '245716298',

                    'email' =>
                        'email-invalido',

                    'telemovel' =>
                        '123456789',

                    'endereco_cep' =>
                        '0000-000',

                    'iban' =>
                        'PT50123443211234567890173',

                    'bolt_email' =>
                        'bolt-invalido',

                    'bolt_telemovel' =>
                        '123456789',

                    'uber_email' =>
                        'uber-invalido',

                    'uber_telemovel' =>
                        '123456789',

                    'contato_urgencia_telemovel' =>
                        '123456789',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'nif',
                'email',
                'telemovel',
                'endereco_cep',
                'iban',
                'bolt_email',
                'bolt_telemovel',
                'uber_email',
                'uber_telemovel',
                'contato_urgencia_telemovel',
            ]);

        $motorista->refresh();

        expect(
            $motorista->nif
        )->toBe(
            '245123458'
        );

        expect(
            $motorista->email
        )->toBe(
            'original@example.test'
        );

        expect(
            $motorista->telemovel
        )->toBe(
            '912345678'
        );

        expect(
            $motorista->endereco_cep
        )->toBe(
            '1000-100'
        );

        expect(
            $motorista->iban
        )->toBe(
            'PT50000201231234567890154'
        );
    }
);
