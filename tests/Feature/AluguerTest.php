<?php

use App\Models\Aluguer;
use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Proprietario;
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
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function aluguerHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function aluguerTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function aluguerUsuario(
    Tenant $tenant,
    string $email,
    string $nivel = 'configurar'
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
        ['codigo' => 'alugueres'],
        [
            'modulo' => 'alugueres',
            'nome' => 'Alugueres',
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

function aluguerLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function aluguerEntidades(
    Tenant $tenant,
    string $sufixo = ''
): array {
    $motorista = new Motorista([
        'nome_completo' => "Motorista {$sufixo}",
    ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->save();

    $proprietario = new Proprietario([
        'tipo' => 'pessoa_fisica',
        'nome_completo' => "Proprietário {$sufixo}",
    ]);

    $proprietario->tenant_id =
        $tenant->id;

    $proprietario->save();

    $veiculo = new Veiculo([
        'matricula' =>
            'AL-' .
            str_pad(
                (string) random_int(1, 99),
                2,
                '0',
                STR_PAD_LEFT
            ) .
            '-' .
            strtoupper(
                substr(
                    preg_replace(
                        '/[^A-Za-z]/',
                        '',
                        $sufixo . 'AA'
                    ),
                    0,
                    2
                )
            ),

        'marca' => 'Tesla',
        'modelo' => 'Model 3',
        'proprietario_id' =>
            $proprietario->id,
    ]);

    $veiculo->tenant_id =
        $tenant->id;

    $veiculo->save();

    return compact(
        'motorista',
        'proprietario',
        'veiculo'
    );
}

function aluguerCriarDireto(
    Tenant $tenant,
    User $createdBy,
    array $dados = []
): Aluguer {
    $aluguer =
        new Aluguer(
            array_merge([
                'rascunho_passo' => 1,
                'rascunho_dados' => [],
            ], $dados)
        );

    $aluguer->tenant_id =
        $tenant->id;

    $aluguer->created_by =
        $createdBy->id;

    $aluguer->save();

    return $aluguer;
}

function aluguerSignaturePng(): string
{
    return 'data:image/png;base64,' .
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' .
        'CAQAAAC1HAwCAAAAC0lEQVR42mNk+A8A' .
        'AQUBAScY42YAAAAASUVORK5CYII=';
}

function aluguerContrato(
    Tenant $tenant,
    array $entidades,
    string $tipo,
    string $status = 'assinado'
): Contrato {
    $contrato =
        new Contrato([
            'tipo' =>
                $tipo,

            'motorista_id' =>
                $entidades[
                    'motorista'
                ]->id,

            'veiculo_id' =>
                $entidades[
                    'veiculo'
                ]->id,

            'proprietario_id' =>
                $entidades[
                    'proprietario'
                ]->id,

            'data_inicio' =>
                '2026-09-01',
        ]);

    $contrato->tenant_id =
        $tenant->id;

    $contrato->status =
        $status;

    $contrato->bloqueado =
        false;

    $contrato->save();

    return $contrato;
}

function aluguerChecklist(
    Tenant $tenant,
    User $user,
    Motorista $motorista,
    Veiculo $veiculo,
    string $tipo,
    ?ChecklistRecord $entrega = null,
    float $penalizacao = 0
): ChecklistRecord {
    $checklist =
        new ChecklistRecord([
            'tipo' =>
                $tipo,

            'motorista_id' =>
                $motorista->id,

            'veiculo_id' =>
                $veiculo->id,

            'entrega_vinculada_id' =>
                $entrega?->id,

            'data_operacao' =>
                '2026-09-19',

            'quilometragem' =>
                $tipo === 'entrega'
                    ? 1000
                    : 1500,

            'nivel_combustivel' =>
                'cheio',

            'penalizacao_total' =>
                $penalizacao,
        ]);

    $checklist->tenant_id =
        $tenant->id;

    $checklist->estado =
        'finalizado';

    $checklist->finalizado_em =
        now();

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

function aluguerAssociacaoAtiva(
    Tenant $tenant,
    Contrato $contrato,
    Motorista $motorista,
    Veiculo $veiculo
): ContratoAtivoVeiculo {
    $associacao =
        new ContratoAtivoVeiculo([
            'data_inicio' =>
                now(),

            'ativo' =>
                true,
        ]);

    $associacao->tenant_id =
        $tenant->id;

    $associacao->contrato_id =
        $contrato->id;

    $associacao->motorista_id =
        $motorista->id;

    $associacao->veiculo_id =
        $veiculo->id;

    $associacao->save();

    return $associacao;
}

test(
    'rotas de alugueres exigem autenticação',
    function () {
        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->getJson(
                '/api/alugueres'
            )
            ->assertUnauthorized();
    }
);

test(
    'cliente não pode controlar tenant status autoria ou devolução',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Segurança Aluguer',
                'tenant-seguranca-aluguer'
            );

        $outroTenant =
            aluguerTenant(
                'Outro Tenant Aluguer',
                'outro-tenant-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'seguranca.aluguer@frotapro.test'
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'tenant_id' =>
                        $outroTenant->id,

                    'status' =>
                        'finalizado',

                    'created_by' =>
                        Str::uuid()
                            ->toString(),

                    'data_finalizacao' =>
                        now()
                            ->toISOString(),

                    'devolucao_tipo' =>
                        'atraso',

                    'devolucao_total_pagar' =>
                        9999,

                    'devolucao_declaracao_aceite' =>
                        true,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'tenant_id',
                'status',
                'created_by',
                'data_finalizacao',
                'devolucao_tipo',
                'devolucao_total_pagar',
                'devolucao_declaracao_aceite',
            ]);

        expect(
            Aluguer::count()
        )->toBe(0);
    }
);

test(
    'criação gera rascunho no tenant e autoria atuais',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Criação Aluguer',
                'tenant-criacao-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'criacao.aluguer@frotapro.test'
            );

        aluguerLogin(
            $this,
            $user
        );

        $response =
            $this
                ->withHeaders(
                    aluguerHeaders()
                )
                ->postJson(
                    '/api/alugueres',
                    [
                        'rascunho_dados' => [
                            'template_aluguer_id' =>
                                Str::uuid()
                                    ->toString(),
                        ],

                        'observacoes' =>
                            'Primeiro rascunho',
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.status',
                    'rascunho'
                )
                ->assertJsonPath(
                    'data.rascunho_passo',
                    1
                )
                ->assertJsonPath(
                    'data.created_by',
                    $user->id
                );

        $id =
            $response->json(
                'data.id'
            );

        $this->assertDatabaseHas(
            'alugueres',
            [
                'id' =>
                    $id,

                'tenant_id' =>
                    $tenant->id,

                'status' =>
                    'rascunho',

                'created_by' =>
                    $user->id,

                'rascunho_passo' =>
                    1,

                'observacoes' =>
                    'Primeiro rascunho',
            ]
        );
    }
);

test(
    'rascunho aceita entidades do próprio tenant e retorna relações',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Relações Aluguer',
                'tenant-relacoes-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'relacoes.aluguer@frotapro.test'
            );

        $entidades =
            aluguerEntidades(
                $tenant,
                'RA'
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'motorista_id' =>
                        $entidades[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidades[
                            'veiculo'
                        ]->id,

                    'proprietario_id' =>
                        $entidades[
                            'proprietario'
                        ]->id,

                    'data_inicio' =>
                        '2026-09-20',

                    'data_fim' =>
                        '2026-10-20',

                    'rascunho_passo' =>
                        3,

                    'rascunho_dados' => [
                        'motorista_id' =>
                            $entidades[
                                'motorista'
                            ]->id,

                        'veiculo_id' =>
                            $entidades[
                                'veiculo'
                            ]->id,
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.motorista.id',
                $entidades[
                    'motorista'
                ]->id
            )
            ->assertJsonPath(
                'data.veiculo.id',
                $entidades[
                    'veiculo'
                ]->id
            )
            ->assertJsonPath(
                'data.proprietario.id',
                $entidades[
                    'proprietario'
                ]->id
            )
            ->assertJsonPath(
                'data.rascunho_passo',
                3
            );
    }
);

test(
    'não aceita entidades pertencentes a outro tenant',
    function () {
        $tenantA =
            aluguerTenant(
                'Tenant A Aluguer',
                'tenant-a-aluguer'
            );

        $tenantB =
            aluguerTenant(
                'Tenant B Aluguer',
                'tenant-b-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenantA,
                'tenant.a.aluguer@frotapro.test'
            );

        $entidadesB =
            aluguerEntidades(
                $tenantB,
                'TB'
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'motorista_id' =>
                        $entidadesB[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidadesB[
                            'veiculo'
                        ]->id,

                    'proprietario_id' =>
                        $entidadesB[
                            'proprietario'
                        ]->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'motorista_id',
                'veiculo_id',
                'proprietario_id',
            ]);

        expect(
            Aluguer::count()
        )->toBe(0);
    }
);

test(
    'contratos válidos e checklist de entrega podem ser guardados no rascunho',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant IDs Futuros',
                'tenant-ids-futuros'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'ids.futuros@frotapro.test'
            );

        $contratoAluguer =
            new Contrato([
                'tipo' =>
                    'aluguer',
            ]);

        $contratoAluguer->tenant_id =
            $tenant->id;

        $contratoAluguer->save();

        $contratoPrestacao =
            new Contrato([
                'tipo' =>
                    'prestacao_servico',
            ]);

        $contratoPrestacao->tenant_id =
            $tenant->id;

        $contratoPrestacao->save();

        $checklistEntrega =
            new ChecklistRecord([
                'tipo' =>
                    'entrega',

                'data_operacao' =>
                    '2026-09-20',

                'quilometragem' =>
                    1000,

                'nivel_combustivel' =>
                    'cheio',
            ]);

        $checklistEntrega->tenant_id =
            $tenant->id;

        $checklistEntrega->estado =
            'finalizado';

        $checklistEntrega->realizado_por =
            $user->id;

        $checklistEntrega->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'contrato_aluguer_id' =>
                        $contratoAluguer->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'checklist_entrega_id' =>
                        $checklistEntrega->id,
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.contrato_aluguer_id',
                $contratoAluguer->id
            )
            ->assertJsonPath(
                'data.contrato_prestacao_id',
                $contratoPrestacao->id
            )
            ->assertJsonPath(
                'data.checklist_entrega_id',
                $checklistEntrega->id
            );
    }
);

test(
    'não aceita contratos inexistentes de outro tenant ou de tipo incorreto',
    function () {
        $tenantA =
            aluguerTenant(
                'Tenant Contrato A',
                'tenant-contrato-a'
            );

        $tenantB =
            aluguerTenant(
                'Tenant Contrato B',
                'tenant-contrato-b'
            );

        $user =
            aluguerUsuario(
                $tenantA,
                'contratos.invalidos@frotapro.test'
            );

        $contratoOutroTenant =
            new Contrato([
                'tipo' =>
                    'aluguer',
            ]);

        $contratoOutroTenant->tenant_id =
            $tenantB->id;

        $contratoOutroTenant->save();

        $contratoTipoErrado =
            new Contrato([
                'tipo' =>
                    'prestacao_servico',
            ]);

        $contratoTipoErrado->tenant_id =
            $tenantA->id;

        $contratoTipoErrado->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'contrato_aluguer_id' =>
                        Str::uuid()
                            ->toString(),
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'contrato_aluguer_id'
            );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'contrato_aluguer_id' =>
                        $contratoOutroTenant->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'contrato_aluguer_id'
            );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                [
                    'contrato_aluguer_id' =>
                        $contratoTipoErrado->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'contrato_aluguer_id'
            );
    }
);

test(
    'listagem respeita tenant e filtro de status',
    function () {
        $tenantA =
            aluguerTenant(
                'Tenant A Listagem',
                'tenant-a-listagem-aluguer'
            );

        $tenantB =
            aluguerTenant(
                'Tenant B Listagem',
                'tenant-b-listagem-aluguer'
            );

        $userA =
            aluguerUsuario(
                $tenantA,
                'lista.aluguer@frotapro.test',
                'visualizar'
            );

        aluguerCriarDireto(
            $tenantA,
            $userA,
            [
                'status' =>
                    'rascunho',
            ]
        );

        $ativo =
            aluguerCriarDireto(
                $tenantA,
                $userA
            );

        $ativo->status =
            'ativo';

        $ativo->save();

        $userB =
            User::factory()
                ->create();

        aluguerCriarDireto(
            $tenantB,
            $userB,
            [
                'status' =>
                    'rascunho',
            ]
        );

        aluguerLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->getJson(
                '/api/alugueres'
            )
            ->assertOk()
            ->assertJsonCount(
                2,
                'data'
            );

        $response =
            $this
                ->withHeaders(
                    aluguerHeaders()
                )
                ->getJson(
                    '/api/alugueres?status=ativo'
                )
                ->assertOk()
                ->assertJsonCount(
                    1,
                    'data'
                )
                ->assertJsonPath(
                    'data.0.id',
                    $ativo->id
                );

        expect(
            collect(
                $response->json(
                    'data'
                )
            )
                ->pluck(
                    'status'
                )
                ->unique()
                ->values()
                ->all()
        )->toBe([
            'ativo',
        ]);
    }
);

test(
    'aluguer de outro tenant não pode ser consultado alterado ou eliminado',
    function () {
        $tenantA =
            aluguerTenant(
                'Tenant A Isolamento',
                'tenant-a-isolamento-aluguer'
            );

        $tenantB =
            aluguerTenant(
                'Tenant B Isolamento',
                'tenant-b-isolamento-aluguer'
            );

        $userA =
            aluguerUsuario(
                $tenantA,
                'isolamento.aluguer@frotapro.test'
            );

        $userB =
            User::factory()
                ->create();

        $aluguerB =
            aluguerCriarDireto(
                $tenantB,
                $userB
            );

        aluguerLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->getJson(
                "/api/alugueres/{$aluguerB->id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->patchJson(
                "/api/alugueres/{$aluguerB->id}",
                [
                    'observacoes' =>
                        'Ataque',
                ]
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->deleteJson(
                "/api/alugueres/{$aluguerB->id}"
            )
            ->assertNotFound();

        $this->assertDatabaseHas(
            'alugueres',
            [
                'id' =>
                    $aluguerB->id,
            ]
        );
    }
);

test(
    'apenas rascunho pode ser alterado por patch genérico',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Atualização Aluguer',
                'tenant-atualizacao-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'atualizacao.aluguer@frotapro.test'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        $aluguer->status =
            'ativo';

        $aluguer->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->patchJson(
                "/api/alugueres/{$aluguer->id}",
                [
                    'observacoes' =>
                        'Não deve alterar',
                ]
            )
            ->assertUnprocessable();

        $this->assertDatabaseMissing(
            'alugueres',
            [
                'id' =>
                    $aluguer->id,

                'observacoes' =>
                    'Não deve alterar',
            ]
        );
    }
);

test(
    'utilizador com visualizar pode ler mas não modificar alugueres',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Permissão Aluguer',
                'tenant-permissao-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'visualizar.aluguer@frotapro.test',
                'visualizar'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->getJson(
                '/api/alugueres'
            )
            ->assertOk();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres',
                []
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->patchJson(
                "/api/alugueres/{$aluguer->id}",
                [
                    'observacoes' =>
                        'Bloqueado',
                ]
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/ativar",
                []
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/finalizar"
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/finalizar-devolucao",
                []
            )
            ->assertForbidden();

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->deleteJson(
                "/api/alugueres/{$aluguer->id}"
            )
            ->assertForbidden();
    }
);

test(
    'rascunho pode ser atualizado e aluguer não finalizado pode ser eliminado',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant CRUD Aluguer',
                'tenant-crud-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'crud.aluguer@frotapro.test'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->patchJson(
                "/api/alugueres/{$aluguer->id}",
                [
                    'rascunho_passo' =>
                        4,

                    'observacoes' =>
                        'Rascunho atualizado',

                    'rascunho_dados' => [
                        'observacoes' =>
                            'Rascunho atualizado',
                    ],
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.rascunho_passo',
                4
            )
            ->assertJsonPath(
                'data.observacoes',
                'Rascunho atualizado'
            );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->deleteJson(
                "/api/alugueres/{$aluguer->id}"
            )
            ->assertNoContent();

        $this->assertDatabaseMissing(
            'alugueres',
            [
                'id' =>
                    $aluguer->id,
            ]
        );
    }
);

test(
    'aluguer finalizado não pode ser eliminado',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Finalizado Aluguer',
                'tenant-finalizado-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'finalizado.aluguer@frotapro.test'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        $aluguer->status =
            'finalizado';

        $aluguer->data_finalizacao =
            now();

        $aluguer->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->deleteJson(
                "/api/alugueres/{$aluguer->id}"
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Alugueres finalizados não podem ser eliminados.'
            );

        $this->assertDatabaseHas(
            'alugueres',
            [
                'id' =>
                    $aluguer->id,

                'status' =>
                    'finalizado',
            ]
        );
    }
);

test(
    'ativação exige motorista veículo e os dois contratos',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Ativação Obrigatória',
                'tenant-ativacao-obrigatoria'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'ativacao.obrigatoria@frotapro.test'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/ativar",
                []
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'motorista_id',
                'veiculo_id',
                'contrato_aluguer_id',
                'contrato_prestacao_id',
            ]);

        $aluguer->refresh();

        expect(
            $aluguer->status
        )->toBe(
            'rascunho'
        );
    }
);

test(
    'rascunho válido pode ser ativado',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Ativação Aluguer',
                'tenant-ativacao-aluguer'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'ativacao.aluguer@frotapro.test'
            );

        $entidades =
            aluguerEntidades(
                $tenant,
                'AC'
            );

        $contratoAluguer =
            aluguerContrato(
                $tenant,
                $entidades,
                'aluguer'
            );

        $contratoPrestacao =
            aluguerContrato(
                $tenant,
                $entidades,
                'prestacao_servico'
            );

        $checklist =
            aluguerChecklist(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                'entrega'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/ativar",
                [
                    'motorista_id' =>
                        $entidades[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidades[
                            'veiculo'
                        ]->id,

                    'contrato_aluguer_id' =>
                        $contratoAluguer->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'checklist_entrega_id' =>
                        $checklist->id,

                    'data_inicio' =>
                        '2026-09-20',

                    'observacoes' =>
                        'Aluguer ativo',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'ativo'
            )
            ->assertJsonPath(
                'data.rascunho_passo',
                4
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
                'data.proprietario_id',
                $entidades[
                    'proprietario'
                ]->id
            );

        $aluguer->refresh();

        expect(
            $aluguer->status
        )->toBe(
            'ativo'
        );

        expect(
            $aluguer->proprietario_id
        )->toBe(
            $entidades[
                'proprietario'
            ]->id
        );
    }
);

test(
    'ativação rejeita checklist de entrega pertencente a outro veículo',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Checklist Ativação',
                'tenant-checklist-ativacao'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'checklist.ativacao@frotapro.test'
            );

        $entidadesA =
            aluguerEntidades(
                $tenant,
                'CA'
            );

        $entidadesB =
            aluguerEntidades(
                $tenant,
                'CB'
            );

        $contratoAluguer =
            aluguerContrato(
                $tenant,
                $entidadesA,
                'aluguer'
            );

        $contratoPrestacao =
            aluguerContrato(
                $tenant,
                $entidadesA,
                'prestacao_servico'
            );

        $checklistOutroVeiculo =
            aluguerChecklist(
                $tenant,
                $user,
                $entidadesA[
                    'motorista'
                ],
                $entidadesB[
                    'veiculo'
                ],
                'entrega'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/ativar",
                [
                    'motorista_id' =>
                        $entidadesA[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidadesA[
                            'veiculo'
                        ]->id,

                    'contrato_aluguer_id' =>
                        $contratoAluguer->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'checklist_entrega_id' =>
                        $checklistOutroVeiculo->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'O checklist de entrega pertence a outro veículo.'
            );

        $aluguer->refresh();

        expect(
            $aluguer->status
        )->toBe(
            'rascunho'
        );
    }
);

test(
    'finalização manual encerra contratos assinados e liberta motorista do veículo',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Finalização Manual',
                'tenant-finalizacao-manual'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'finalizacao.manual@frotapro.test'
            );

        $entidades =
            aluguerEntidades(
                $tenant,
                'FM'
            );

        $contratoAluguer =
            aluguerContrato(
                $tenant,
                $entidades,
                'aluguer',
                'assinado'
            );

        $contratoPrestacao =
            aluguerContrato(
                $tenant,
                $entidades,
                'prestacao_servico',
                'assinado'
            );

        $associacao =
            aluguerAssociacaoAtiva(
                $tenant,
                $contratoAluguer,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user,
                [
                    'motorista_id' =>
                        $entidades[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidades[
                            'veiculo'
                        ]->id,

                    'proprietario_id' =>
                        $entidades[
                            'proprietario'
                        ]->id,

                    'contrato_aluguer_id' =>
                        $contratoAluguer->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,
                ]
            );

        $aluguer->status =
            'ativo';

        $aluguer->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/finalizar"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'finalizado'
            );

        $aluguer->refresh();
        $contratoAluguer->refresh();
        $contratoPrestacao->refresh();
        $associacao->refresh();

        expect(
            $aluguer->status
        )->toBe(
            'finalizado'
        );

        expect(
            $aluguer->data_finalizacao
        )->not->toBeNull();

        expect(
            $contratoAluguer->status
        )->toBe(
            'encerrado'
        );

        expect(
            $contratoAluguer->bloqueado
        )->toBeTrue();

        expect(
            $contratoPrestacao->status
        )->toBe(
            'encerrado'
        );

        expect(
            $contratoPrestacao->bloqueado
        )->toBeTrue();

        expect(
            $associacao->ativo
        )->toBeFalse();

        expect(
            $associacao->data_fim
        )->not->toBeNull();
    }
);

test(
    'apenas aluguer ativo pode ser finalizado',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Finalização Estado',
                'tenant-finalizacao-estado'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'finalizacao.estado@frotapro.test'
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/finalizar"
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Apenas alugueres ativos podem ser finalizados.'
            );
    }
);

test(
    'cliente não pode fornecer totais ou caminhos na devolução',
    function () {
        $tenant =
            aluguerTenant(
                'Tenant Segurança Devolução',
                'tenant-seguranca-devolucao'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'seguranca.devolucao@frotapro.test'
            );

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                '/api/alugueres/' .
                Str::uuid() .
                '/finalizar-devolucao',
                [
                    'devolucao_multa_atraso' =>
                        9999,

                    'devolucao_penalizacoes_checklist' =>
                        9999,

                    'devolucao_total_pagar' =>
                        9999,

                    'devolucao_assinatura_motorista_url' =>
                        'ataque.png',

                    'devolucao_assinatura_empresa_url' =>
                        'ataque.png',

                    'devolucao_pdf_url' =>
                        'ataque.pdf',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'devolucao_multa_atraso',
                'devolucao_penalizacoes_checklist',
                'devolucao_total_pagar',
                'devolucao_assinatura_motorista_url',
                'devolucao_assinatura_empresa_url',
                'devolucao_pdf_url',
            ]);
    }
);

test(
    'devolução calcula valores no servidor encerra contratos e guarda assinaturas privadas',
    function () {
        Storage::fake(
            'local'
        );

        $tenant =
            aluguerTenant(
                'Tenant Devolução Completa',
                'tenant-devolucao-completa'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'devolucao.completa@frotapro.test'
            );

        $entidades =
            aluguerEntidades(
                $tenant,
                'DC'
            );

        $contratoAluguer =
            aluguerContrato(
                $tenant,
                $entidades,
                'aluguer',
                'enviado'
            );

        $contratoPrestacao =
            aluguerContrato(
                $tenant,
                $entidades,
                'prestacao_servico',
                'enviado'
            );

        $entrega =
            aluguerChecklist(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                'entrega'
            );

        $recolha =
            aluguerChecklist(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                'recolha',
                $entrega,
                35.50
            );

        $associacao =
            aluguerAssociacaoAtiva(
                $tenant,
                $contratoAluguer,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ]
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user,
                [
                    'motorista_id' =>
                        $entidades[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidades[
                            'veiculo'
                        ]->id,

                    'proprietario_id' =>
                        $entidades[
                            'proprietario'
                        ]->id,

                    'contrato_aluguer_id' =>
                        $contratoAluguer->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'checklist_entrega_id' =>
                        $entrega->id,
                ]
            );

        $aluguer->status =
            'ativo';

        $aluguer->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/finalizar-devolucao",
                [
                    'checklist_devolucao_id' =>
                        $recolha->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'devolucao_tipo' =>
                        'atraso',

                    'devolucao_dias_atraso' =>
                        3,

                    'devolucao_valor_dia' =>
                        20,

                    'devolucao_multas_adicionais' => [
                        [
                            'nome' =>
                                'Limpeza',

                            'valor' =>
                                5.25,
                        ],

                        [
                            'nome' =>
                                'Portagem',

                            'valor' =>
                                4.75,
                        ],
                    ],

                    'devolucao_declaracao_aceite' =>
                        true,

                    'assinatura_motorista' =>
                        aluguerSignaturePng(),

                    'assinatura_empresa' =>
                        aluguerSignaturePng(),

                    'devolucao_observacoes' =>
                        'Devolução de teste',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.status',
                'finalizado'
            )
            ->assertJsonPath(
                'data.checklist_devolucao_id',
                $recolha->id
            );

        $aluguer->refresh();
        $contratoAluguer->refresh();
        $contratoPrestacao->refresh();
        $associacao->refresh();

        expect(
            (float)
            $aluguer
                ->devolucao_multa_atraso
        )->toBe(
            60.0
        );

        expect(
            (float)
            $aluguer
                ->devolucao_penalizacoes_checklist
        )->toBe(
            35.5
        );

        expect(
            (float)
            $aluguer
                ->devolucao_total_pagar
        )->toBe(
            105.5
        );

        expect(
            $aluguer
                ->devolucao_declaracao_aceite
        )->toBeTrue();

        expect(
            $aluguer
                ->devolucao_observacoes
        )->toBe(
            'Devolução de teste'
        );

        expect(
            $contratoAluguer->status
        )->toBe(
            'encerrado'
        );

        expect(
            $contratoPrestacao->status
        )->toBe(
            'encerrado'
        );

        expect(
            $associacao->ativo
        )->toBeFalse();

        $motoristaPath =
            'rental-return-signatures/' .
            $tenant->id .
            '/' .
            $aluguer->id .
            '/motorista.png';

        $empresaPath =
            'rental-return-signatures/' .
            $tenant->id .
            '/' .
            $aluguer->id .
            '/empresa.png';

        expect(
            $aluguer
                ->devolucao_assinatura_motorista_url
        )->toBe(
            $motoristaPath
        );

        expect(
            $aluguer
                ->devolucao_assinatura_empresa_url
        )->toBe(
            $empresaPath
        );

        Storage::disk('local')
            ->assertExists(
                $motoristaPath
            );

        Storage::disk('local')
            ->assertExists(
                $empresaPath
            );
    }
);

test(
    'devolução rejeita recolha de outra entrega',
    function () {
        Storage::fake(
            'local'
        );

        $tenant =
            aluguerTenant(
                'Tenant Recolha Incorreta',
                'tenant-recolha-incorreta'
            );

        $user =
            aluguerUsuario(
                $tenant,
                'recolha.incorreta@frotapro.test'
            );

        $entidades =
            aluguerEntidades(
                $tenant,
                'RI'
            );

        $contratoAluguer =
            aluguerContrato(
                $tenant,
                $entidades,
                'aluguer'
            );

        $contratoPrestacao =
            aluguerContrato(
                $tenant,
                $entidades,
                'prestacao_servico'
            );

        $entregaCorreta =
            aluguerChecklist(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                'entrega'
            );

        $outraEntrega =
            aluguerChecklist(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                'entrega'
            );

        $recolhaErrada =
            aluguerChecklist(
                $tenant,
                $user,
                $entidades[
                    'motorista'
                ],
                $entidades[
                    'veiculo'
                ],
                'recolha',
                $outraEntrega
            );

        $aluguer =
            aluguerCriarDireto(
                $tenant,
                $user,
                [
                    'motorista_id' =>
                        $entidades[
                            'motorista'
                        ]->id,

                    'veiculo_id' =>
                        $entidades[
                            'veiculo'
                        ]->id,

                    'proprietario_id' =>
                        $entidades[
                            'proprietario'
                        ]->id,

                    'contrato_aluguer_id' =>
                        $contratoAluguer->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'checklist_entrega_id' =>
                        $entregaCorreta->id,
                ]
            );

        $aluguer->status =
            'ativo';

        $aluguer->save();

        aluguerLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                aluguerHeaders()
            )
            ->postJson(
                "/api/alugueres/{$aluguer->id}/finalizar-devolucao",
                [
                    'checklist_devolucao_id' =>
                        $recolhaErrada->id,

                    'contrato_prestacao_id' =>
                        $contratoPrestacao->id,

                    'devolucao_tipo' =>
                        'no_prazo',

                    'devolucao_declaracao_aceite' =>
                        true,

                    'assinatura_motorista' =>
                        aluguerSignaturePng(),

                    'assinatura_empresa' =>
                        aluguerSignaturePng(),
                ]
            )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'A recolha não corresponde ao checklist de entrega deste aluguer.'
            );

        $aluguer->refresh();

        expect(
            $aluguer->status
        )->toBe(
            'ativo'
        );

        expect(
            Storage::disk('local')
                ->allFiles()
        )->toBe([]);
    }
);
