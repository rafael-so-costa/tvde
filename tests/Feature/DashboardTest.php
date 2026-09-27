<?php

use App\Models\Aluguer;
use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function dashboardHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function dashboardTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function dashboardUser(
    Tenant $tenant,
    string $email
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
            'codigo' => 'admin_empresa',
        ],
        [
            'nome' => 'Administrador da Empresa',
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

function dashboardLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,
                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

test(
    'dashboard exige autenticação',
    function () {
        $this
            ->withHeaders(
                dashboardHeaders()
            )
            ->getJson(
                '/api/dashboard'
            )
            ->assertUnauthorized();
    }
);

test(
    'dashboard retorna indicadores isolados pelo tenant',
    function () {
        $tenant = dashboardTenant(
            'Dashboard A',
            'dashboard-a'
        );

        $other = dashboardTenant(
            'Dashboard B',
            'dashboard-b'
        );

        $user = dashboardUser(
            $tenant,
            'dashboard@frotapro.test'
        );

        $motorista =
            new Motorista([
                'nome_completo' => 'Motorista Dashboard',

                'email' => 'motorista.dashboard@test.pt',

                /*
                 * Mesmo com vencimento próximo,
                 * Dashboard não calcula alertas.
                 */
                'carta_valid_until' => now()
                    ->addDays(10)
                    ->toDateString(),
            ]);

        $motorista->tenant_id =
            $tenant->id;

        $motorista->ativo = true;
        $motorista->save();

        $veiculo =
            new Veiculo([
                'matricula' => 'DB-10-AA',
                'marca' => 'Tesla',
                'modelo' => 'Model 3',

                'carta_verde_valid_until' => now()
                    ->addDays(15)
                    ->toDateString(),
            ]);

        $veiculo->tenant_id =
            $tenant->id;

        $veiculo->ativo = true;
        $veiculo->save();

        $proprietario =
            new Proprietario([
                'tipo' => 'pessoa_fisica',

                'nome_completo' => 'Proprietário Dashboard',

                'email' => 'proprietario.dashboard@test.pt',
            ]);

        $proprietario->tenant_id =
            $tenant->id;

        $proprietario->ativo = true;
        $proprietario->save();

        $contrato =
            new Contrato([
                'tipo' => 'aluguer',

                'motorista_id' => $motorista->id,

                'veiculo_id' => $veiculo->id,
            ]);

        $contrato->tenant_id =
            $tenant->id;

        $contrato->status =
            'enviado';

        $contrato->save();

        $aluguer =
            new Aluguer([
                'motorista_id' => $motorista->id,

                'veiculo_id' => $veiculo->id,

                'proprietario_id' => $proprietario->id,
            ]);

        $aluguer->tenant_id =
            $tenant->id;

        $aluguer->status = 'ativo';

        $aluguer->created_by =
            $user->id;

        $aluguer->save();

        $otherVehicle =
            new Veiculo([
                'matricula' => 'DB-99-ZZ',
                'marca' => 'BMW',
                'modelo' => 'i4',
            ]);

        $otherVehicle->tenant_id =
            $other->id;

        $otherVehicle->ativo = true;
        $otherVehicle->save();

        dashboardLogin(
            $this,
            $user
        );

        $response = $this
            ->withHeaders(
                dashboardHeaders()
            )
            ->getJson(
                '/api/dashboard'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.metrics.veiculos_ativos',
                1
            )
            ->assertJsonPath(
                'data.metrics.motoristas_ativos',
                1
            )
            ->assertJsonPath(
                'data.metrics.proprietarios',
                1
            )
            ->assertJsonPath(
                'data.metrics.alugueres_ativos',
                1
            )
            ->assertJsonPath(
                'data.metrics.contratos_pendentes',
                1
            )
            ->assertJsonCount(
                1,
                'data.recent_contracts'
            )
            ->assertJsonCount(
                1,
                'data.recent_rentals'
            );

        expect(
            $response->json(
                'data'
            )
        )->not->toHaveKey(
            'alerts'
        );
    }
);

test(
    'dashboard nao calcula alertas a partir de datas das entidades',
    function () {
        $tenant = dashboardTenant(
            'Dashboard Sem Alertas Sintéticos',
            'dashboard-sem-alertas'
        );

        $user = dashboardUser(
            $tenant,
            'dashboard.no.synthetic@frotapro.test'
        );

        $motorista =
            new Motorista([
                'nome_completo' => 'Motorista com documento vencido',

                'email' => 'expired@dashboard.test',

                'carta_valid_until' => now()
                    ->subDays(5)
                    ->toDateString(),
            ]);

        $motorista->tenant_id =
            $tenant->id;

        $motorista->ativo = true;
        $motorista->save();

        dashboardLogin(
            $this,
            $user
        );

        $response = $this
            ->withHeaders(
                dashboardHeaders()
            )
            ->getJson(
                '/api/dashboard'
            )
            ->assertOk();

        expect(
            $response->json('data')
        )->not->toHaveKey(
            'alerts'
        );

        /*
         * O vencimento só aparecerá no sistema
         * depois de alerts:evaluate gerar
         * uma ocorrência persistente.
         */
        $this->assertDatabaseCount(
            'alerts',
            0
        );
    }
);

test(
    'dashboard orienta administrador novo pelos primeiros passos',
    function () {
        $tenant = dashboardTenant(
            'Nova Frota',
            'nova-frota'
        );

        $user = dashboardUser(
            $tenant,
            'novo.dashboard@frotapro.test'
        );

        $empresa = new Empresa([
            'nome_empresa' => 'Nova Frota Lda',

            'nif' => '500999111',

            'ativo' => true,

            'status_cadastro' => 'ativo',
        ]);

        $empresa->tenant_id =
            $tenant->id;

        $empresa->save();

        dashboardLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                dashboardHeaders()
            )
            ->getJson(
                '/api/dashboard'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.setup.completed',
                1
            )
            ->assertJsonPath(
                'data.setup.total',
                7
            )
            ->assertJsonPath(
                'data.setup.percentage',
                14
            )
            ->assertJsonPath(
                'data.setup.complete',
                false
            )
            ->assertJsonPath(
                'data.setup.steps.0.key',
                'empresa'
            )
            ->assertJsonPath(
                'data.setup.steps.0.completed',
                true
            )
            ->assertJsonPath(
                'data.setup.next_step.key',
                'proprietario'
            )
            ->assertJsonPath(
                'data.setup.next_step.href',
                '/proprietarios'
            );
    }
);
