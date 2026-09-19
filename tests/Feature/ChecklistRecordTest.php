<?php

use App\Models\ChecklistRecord;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function checklistHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function checklistSignaturePng(): string
{
    return 'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'.
        'CAQAAAC1HAwCAAAAC0lEQVR42mNk+A8A'.
        'AQUBAScY42YAAAAASUVORK5CYII=';
}

function checklistTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function checklistUsuario(
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
        [
            'codigo' => 'funcionario',
        ],
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
        [
            'codigo' => 'checklist',
        ],
        [
            'modulo' => 'checklist',
            'nome' => 'Checklists',
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

function checklistLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function checklistEntidades(
    Tenant $tenant,
    string $sufixo
): array {
    $motorista = new Motorista([
        'nome_completo' =>
            "Motorista {$sufixo}",
    ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->save();

    $veiculo = new Veiculo([
        'matricula' =>
            "CK-{$sufixo}-01",
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
    ]);

    $veiculo->tenant_id =
        $tenant->id;

    $veiculo->save();

    return compact(
        'motorista',
        'veiculo'
    );
}

function checklistPayload(
    Motorista $motorista,
    Veiculo $veiculo,
    array $extra = []
): array {
    return array_merge([
        'tipo' => 'entrega',
        'motorista_id' =>
            $motorista->id,
        'veiculo_id' =>
            $veiculo->id,
        'data_operacao' =>
            '2026-09-19',
        'hora_operacao' =>
            '10:30',
        'quilometragem' =>
            25000,
        'nivel_combustivel' =>
            'cheio',
        'itens' => [
            'carta_verde' => true,
            'triangulo' => true,
            'colete' => true,
        ],
        'campos_especiais' => [
            'carta_verde_validade' =>
                '2027-09-19',
        ],
        'danos' => [],
        'observacoes' =>
            'Checklist de teste',
    ], $extra);
}

function checklistCriarDireto(
    Tenant $tenant,
    User $user,
    Motorista $motorista,
    Veiculo $veiculo,
    array $dados = []
): ChecklistRecord {
    $estado =
        $dados['estado'] ??
        'rascunho';

    $finalizadoEm =
        $dados['finalizado_em'] ??
        null;

    unset(
        $dados['estado'],
        $dados['finalizado_em']
    );

    $checklist =
        new ChecklistRecord(
            array_merge([
                'tipo' =>
                    'entrega',
                'motorista_id' =>
                    $motorista->id,
                'veiculo_id' =>
                    $veiculo->id,
                'data_operacao' =>
                    '2026-09-19',
                'hora_operacao' =>
                    '10:30',
                'quilometragem' =>
                    25000,
                'nivel_combustivel' =>
                    'cheio',
            ], $dados)
        );

    $checklist->tenant_id =
        $tenant->id;

    $checklist->estado =
        $estado;

    $checklist->finalizado_em =
        $finalizadoEm;

    $checklist->realizado_por =
        $user->id;

    $checklist
        ->motorista_nome_snapshot =
        $motorista->nome_completo;

    $checklist
        ->matricula_snapshot =
        $veiculo->matricula;

    $checklist
        ->modelo_snapshot =
        "{$veiculo->marca} {$veiculo->modelo}";

    $checklist->save();

    return $checklist;
}

test(
    'rotas de checklists exigem autenticação',
    function () {
        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->getJson(
                '/api/checklists'
            )
            ->assertUnauthorized();
    }
);

test(
    'cliente não pode controlar tenant estado autoria snapshots ou assinaturas',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Checklist Proteção',
                'tenant-checklist-protecao'
            );

        $user =
            checklistUsuario(
                $tenant,
                'checklist.protecao@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'PR'
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                array_merge(
                    checklistPayload(
                        $entidades[
                            'motorista'
                        ],
                        $entidades[
                            'veiculo'
                        ]
                    ),
                    [
                        'tenant_id' =>
                            $tenant->id,
                        'estado' =>
                            'finalizado',
                        'finalizado_em' =>
                            now()
                                ->toISOString(),
                        'realizado_por' =>
                            $user->id,
                        'motorista_nome_snapshot' =>
                            'Ataque',
                        'matricula_snapshot' =>
                            'ATAQUE',
                        'modelo_snapshot' =>
                            'Ataque',
                        'assinatura_empresa_path' =>
                            'ataque.png',
                        'assinatura_motorista_path' =>
                            'ataque.png',
                    ]
                )
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'tenant_id',
                'estado',
                'finalizado_em',
                'realizado_por',
                'motorista_nome_snapshot',
                'matricula_snapshot',
                'modelo_snapshot',
                'assinatura_empresa_path',
                'assinatura_motorista_path',
            ]);

        expect(
            ChecklistRecord::count()
        )->toBe(0);
    }
);

test(
    'entrega é criada no tenant atual com snapshots e autoria do servidor',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Checklist Criação',
                'tenant-checklist-criacao'
            );

        $user =
            checklistUsuario(
                $tenant,
                'checklist.criacao@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'CR'
            );

        checklistLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    checklistHeaders()
                )
                ->postJson(
                    '/api/checklists',
                    checklistPayload(
                        $entidades[
                            'motorista'
                        ],
                        $entidades[
                            'veiculo'
                        ]
                    )
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.tipo',
                    'entrega'
                )
                ->assertJsonPath(
                    'data.estado',
                    'rascunho'
                )
                ->assertJsonPath(
                    'data.motorista_id',
                    $entidades[
                        'motorista'
                    ]->id
                )
                ->assertJsonPath(
                    'data.veiculo_id',
                    $entidades[
                        'veiculo'
                    ]->id
                )
                ->assertJsonPath(
                    'data.motorista_nome_snapshot',
                    $entidades[
                        'motorista'
                    ]->nome_completo
                )
                ->assertJsonPath(
                    'data.matricula_snapshot',
                    $entidades[
                        'veiculo'
                    ]->matricula
                )
                ->assertJsonPath(
                    'data.realizado_por',
                    $user->id
                );

        $id =
            $response->json(
                'data.id'
            );

        $this->assertDatabaseHas(
            'checklist_records',
            [
                'id' => $id,
                'tenant_id' =>
                    $tenant->id,
                'tipo' =>
                    'entrega',
                'estado' =>
                    'rascunho',
                'realizado_por' =>
                    $user->id,
            ]
        );
    }
);

test(
    'checklist não aceita motorista ou veículo de outro tenant',
    function () {
        $tenantA =
            checklistTenant(
                'Tenant Checklist A',
                'tenant-checklist-a'
            );

        $tenantB =
            checklistTenant(
                'Tenant Checklist B',
                'tenant-checklist-b'
            );

        $user =
            checklistUsuario(
                $tenantA,
                'checklist.tenant@frotapro.test'
            );

        $entidadesB =
            checklistEntidades(
                $tenantB,
                'TB'
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                checklistPayload(
                    $entidadesB[
                        'motorista'
                    ],
                    $entidadesB[
                        'veiculo'
                    ]
                )
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'motorista_id',
                'veiculo_id',
            ]);

        expect(
            ChecklistRecord::count()
        )->toBe(0);
    }
);

test(
    'recolha exige entrega finalizada vinculada',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Recolha Obrigatória',
                'tenant-recolha-obrigatoria'
            );

        $user =
            checklistUsuario(
                $tenant,
                'recolha.obrigatoria@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'RO'
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                checklistPayload(
                    $entidades[
                        'motorista'
                    ],
                    $entidades[
                        'veiculo'
                    ],
                    [
                        'tipo' =>
                            'recolha',
                    ]
                )
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'entrega_vinculada_id'
            );

        $entrega =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                checklistPayload(
                    $entidades[
                        'motorista'
                    ],
                    $entidades[
                        'veiculo'
                    ],
                    [
                        'tipo' =>
                            'recolha',
                        'entrega_vinculada_id' =>
                            $entrega->id,
                    ]
                )
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'entrega_vinculada_id'
            );
    }
);

test(
    'recolha usa o mesmo motorista e veículo da entrega',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Recolha Entidades',
                'tenant-recolha-entidades'
            );

        $user =
            checklistUsuario(
                $tenant,
                'recolha.entidades@frotapro.test'
            );

        $entidadesA =
            checklistEntidades(
                $tenant,
                'EA'
            );

        $entidadesB =
            checklistEntidades(
                $tenant,
                'EB'
            );

        $entrega =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidadesA[
                    'motorista'
                ],
                $entidadesA[
                    'veiculo'
                ],
                [
                    'estado' =>
                        'finalizado',
                    'finalizado_em' =>
                        now(),
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                checklistPayload(
                    $entidadesB[
                        'motorista'
                    ],
                    $entidadesB[
                        'veiculo'
                    ],
                    [
                        'tipo' =>
                            'recolha',
                        'entrega_vinculada_id' =>
                            $entrega->id,
                    ]
                )
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'A recolha deve utilizar o mesmo motorista e veículo da entrega vinculada.'
            );

        expect(
            ChecklistRecord::query()
                ->where(
                    'tipo',
                    'recolha'
                )
                ->count()
        )->toBe(0);
    }
);

test(
    'entrega finalizada pode receber uma única recolha',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Recolha Única',
                'tenant-recolha-unica'
            );

        $user =
            checklistUsuario(
                $tenant,
                'recolha.unica@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'RU'
            );

        $entrega =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                [
                    'estado' =>
                        'finalizado',
                    'finalizado_em' =>
                        now(),
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $payload =
            checklistPayload(
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                [
                    'tipo' =>
                        'recolha',
                    'entrega_vinculada_id' =>
                        $entrega->id,
                    'quilometragem' =>
                        26000,
                    'nivel_combustivel' =>
                        '3/4',
                ]
            );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                $payload
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.tipo',
                'recolha'
            )
            ->assertJsonPath(
                'data.entrega_vinculada_id',
                $entrega->id
            );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                $payload
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Esta entrega já possui uma recolha vinculada.'
            );

        expect(
            ChecklistRecord::query()
                ->where(
                    'tipo',
                    'recolha'
                )
                ->where(
                    'entrega_vinculada_id',
                    $entrega->id
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'listagem respeita tenant e filtros de tipo e estado',
    function () {
        $tenantA =
            checklistTenant(
                'Tenant Lista Checklist A',
                'tenant-lista-checklist-a'
            );

        $tenantB =
            checklistTenant(
                'Tenant Lista Checklist B',
                'tenant-lista-checklist-b'
            );

        $userA =
            checklistUsuario(
                $tenantA,
                'lista.checklist@frotapro.test',
                'visualizar'
            );

        $entidadesA =
            checklistEntidades(
                $tenantA,
                'LA'
            );

        $entrega =
            checklistCriarDireto(
                $tenantA,
                $userA,
                $entidadesA[
                    'motorista'
                ],
                $entidadesA[
                    'veiculo'
                ],
                [
                    'estado' =>
                        'finalizado',
                    'finalizado_em' =>
                        now(),
                ]
            );

        checklistCriarDireto(
            $tenantA,
            $userA,
            $entidadesA[
                'motorista'
            ],
            $entidadesA[
                'veiculo'
            ],
            [
                'tipo' =>
                    'recolha',
                'entrega_vinculada_id' =>
                    $entrega->id,
            ]
        );

        $userB =
            User::factory()->create();

        $entidadesB =
            checklistEntidades(
                $tenantB,
                'LB'
            );

        checklistCriarDireto(
            $tenantB,
            $userB,
            $entidadesB[
                'motorista'
            ],
            $entidadesB[
                'veiculo'
            ]
        );

        checklistLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->getJson(
                '/api/checklists'
            )
            ->assertOk()
            ->assertJsonCount(
                2,
                'data'
            );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->getJson(
                '/api/checklists?tipo=entrega&estado=finalizado'
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.id',
                $entrega->id
            );
    }
);

test(
    'checklist de outro tenant não pode ser consultado alterado ou eliminado',
    function () {
        $tenantA =
            checklistTenant(
                'Tenant Isolamento A',
                'tenant-isolamento-checklist-a'
            );

        $tenantB =
            checklistTenant(
                'Tenant Isolamento B',
                'tenant-isolamento-checklist-b'
            );

        $userA =
            checklistUsuario(
                $tenantA,
                'isolamento.checklist@frotapro.test'
            );

        $userB =
            User::factory()->create();

        $entidadesB =
            checklistEntidades(
                $tenantB,
                'IB'
            );

        $checklistB =
            checklistCriarDireto(
                $tenantB,
                $userB,
                $entidadesB[
                    'motorista'
                ],
                $entidadesB[
                    'veiculo'
                ]
            );

        checklistLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->getJson(
                "/api/checklists/{$checklistB->id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->patchJson(
                "/api/checklists/{$checklistB->id}",
                [
                    'quilometragem' =>
                        999999,
                ]
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->deleteJson(
                "/api/checklists/{$checklistB->id}"
            )
            ->assertNotFound();
    }
);

test(
    'permissão visualizar permite leitura mas bloqueia escrita',
    function () {
        Storage::fake('local');

        $tenant =
            checklistTenant(
                'Tenant Permissão Checklist',
                'tenant-permissao-checklist'
            );

        $user =
            checklistUsuario(
                $tenant,
                'visualizar.checklist@frotapro.test',
                'visualizar'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'PV'
            );

        $checklist =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->getJson(
                '/api/checklists'
            )
            ->assertOk();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->getJson(
                "/api/checklists/{$checklist->id}"
            )
            ->assertOk();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                '/api/checklists',
                checklistPayload(
                    $entidades[
                        'motorista'
                    ],
                    $entidades[
                        'veiculo'
                    ]
                )
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->patchJson(
                "/api/checklists/{$checklist->id}",
                [
                    'quilometragem' =>
                        30000,
                ]
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                "/api/checklists/{$checklist->id}/finalizar",
                [
                    'assinatura_empresa' =>
                        checklistSignaturePng(),
                    'assinatura_motorista' =>
                        checklistSignaturePng(),
                ]
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->deleteJson(
                "/api/checklists/{$checklist->id}"
            )
            ->assertForbidden();

        expect(
            Storage::disk('local')
                ->allFiles()
        )->toBe([]);
    }
);

test(
    'rascunho pode ser atualizado',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Atualiza Checklist',
                'tenant-atualiza-checklist'
            );

        $user =
            checklistUsuario(
                $tenant,
                'atualiza.checklist@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'AT'
            );

        $checklist =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->patchJson(
                "/api/checklists/{$checklist->id}",
                [
                    'quilometragem' =>
                        26000,
                    'nivel_combustivel' =>
                        '3/4',
                    'observacoes' =>
                        'Atualizado',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.quilometragem',
                26000
            )
            ->assertJsonPath(
                'data.nivel_combustivel',
                '3/4'
            )
            ->assertJsonPath(
                'data.observacoes',
                'Atualizado'
            );
    }
);

test(
    'finalização exige duas assinaturas e torna checklist imutável',
    function () {
        Storage::fake('local');

        $tenant =
            checklistTenant(
                'Tenant Finaliza Checklist',
                'tenant-finaliza-checklist'
            );

        $user =
            checklistUsuario(
                $tenant,
                'finaliza.checklist@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'FI'
            );

        $checklist =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                "/api/checklists/{$checklist->id}/finalizar",
                [
                    'assinatura_empresa' =>
                        checklistSignaturePng(),
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'assinatura_motorista'
            );

        expect(
            Storage::disk('local')
                ->allFiles()
        )->toBe([]);

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                "/api/checklists/{$checklist->id}/finalizar",
                [
                    'assinatura_empresa' =>
                        checklistSignaturePng(),
                    'assinatura_motorista' =>
                        checklistSignaturePng(),
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.estado',
                'finalizado'
            );

        $checklist->refresh();

        $empresaPath =
            'checklist-signatures/' .
            $tenant->id .
            '/' .
            $checklist->id .
            '/empresa.png';

        $motoristaPath =
            'checklist-signatures/' .
            $tenant->id .
            '/' .
            $checklist->id .
            '/motorista.png';

        expect(
            $checklist
                ->assinatura_empresa_path
        )->toBe(
            $empresaPath
        );

        expect(
            $checklist
                ->assinatura_motorista_path
        )->toBe(
            $motoristaPath
        );

        Storage::disk('local')
            ->assertExists(
                $empresaPath
            );

        Storage::disk('local')
            ->assertExists(
                $motoristaPath
            );

        expect(
            $checklist->finalizado_em
        )->not->toBeNull();

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->patchJson(
                "/api/checklists/{$checklist->id}",
                [
                    'quilometragem' =>
                        999999,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Checklists finalizados não podem ser alterados.'
            );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->deleteJson(
                "/api/checklists/{$checklist->id}"
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Checklists finalizados não podem ser eliminados.'
            );
    }
);

test(
    'checklist já finalizado não pode ser finalizado novamente',
    function () {
        Storage::fake('local');

        $tenant =
            checklistTenant(
                'Tenant Dupla Finalização',
                'tenant-dupla-finalizacao'
            );

        $user =
            checklistUsuario(
                $tenant,
                'dupla.finalizacao@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'DF'
            );

        $checklist =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                [
                    'estado' =>
                        'finalizado',
                    'finalizado_em' =>
                        now(),
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->postJson(
                "/api/checklists/{$checklist->id}/finalizar",
                [
                    'assinatura_empresa' =>
                        checklistSignaturePng(),
                    'assinatura_motorista' =>
                        checklistSignaturePng(),
                ]
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'O checklist já está finalizado.'
            );

        expect(
            Storage::disk('local')
                ->allFiles()
        )->toBe([]);
    }
);

test(
    'rascunho pode ser eliminado',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Elimina Checklist',
                'tenant-elimina-checklist'
            );

        $user =
            checklistUsuario(
                $tenant,
                'elimina.checklist@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'EL'
            );

        $checklist =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistHeaders()
            )
            ->deleteJson(
                "/api/checklists/{$checklist->id}"
            )
            ->assertNoContent();

        $this->assertDatabaseMissing(
            'checklist_records',
            [
                'id' =>
                    $checklist->id,
            ]
        );
    }
);

test(
    'penalização da recolha é calculada pelo servidor',
    function () {
        $tenant =
            checklistTenant(
                'Tenant Penalização Segura',
                'tenant-penalizacao-segura'
            );

        $user =
            checklistUsuario(
                $tenant,
                'penalizacao.segura@frotapro.test'
            );

        $entidades =
            checklistEntidades(
                $tenant,
                'PS'
            );

        $entrega =
            checklistCriarDireto(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                [
                    'estado' =>
                        'finalizado',

                    'finalizado_em' =>
                        now(),
                ]
            );

        checklistLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    checklistHeaders()
                )
                ->postJson(
                    '/api/checklists',
                    checklistPayload(
                        $entidades[
                            'motorista'
                        ],
                        $entidades[
                            'veiculo'
                        ],
                        [
                            'tipo' =>
                                'recolha',

                            'entrega_vinculada_id' =>
                                $entrega->id,

                            'penalizacao_total' =>
                                999999,

                            'itens_faltantes' => [
                                'colete' =>
                                    true,

                                'triangulo' =>
                                    true,
                            ],

                            'novos_danos' => [
                                [
                                    'part' =>
                                        'Para-choque Dianteiro',

                                    'types' => [
                                        'riscado',
                                    ],

                                    'status' =>
                                        'riscado',

                                    'value' =>
                                        999999,
                                ],
                            ],
                        ]
                    )
                )
                ->assertCreated();

        $id =
            $response->json(
                'data.id'
            );

        $checklist =
            ChecklistRecord::findOrFail(
                $id
            );

        expect(
            (float)
            $checklist
                ->penalizacao_total
        )->toBe(
            335.0
        );

        expect(
            (float)
            $checklist
                ->novos_danos[0][
                    'value'
                ]
        )->toBe(
            300.0
        );
    }
);
