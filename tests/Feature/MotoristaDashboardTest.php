<?php

use App\Models\Alert;
use App\Models\AlertRecipient;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Manutencao;
use App\Models\Motorista;
use App\Models\Multa;
use App\Models\RegistoExpediente;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(fn() => $this->seed(RoleSeeder::class));

function mdHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function mdUser(string $email): User
{
    return User::factory()->create([
        'email' => $email,
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);
}

function mdTenant(string $slug = 'dashboard-motorista'): Tenant
{
    return Tenant::create([
        'nome' => 'Empresa Dashboard',
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function mdAssociate(User $user, Tenant $tenant): void
{
    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);
}

function mdRole(User $user, Tenant $tenant, string $codigo = 'motorista'): void
{
    $role = Role::query()->where('codigo', $codigo)->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);
}

function mdLogin($test, User $user): void
{
    $test->withHeaders(mdHeaders())->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function mdMotorista(User $user, Tenant $tenant, string $nome = 'Motorista Dashboard'): Motorista
{
    $motorista = new Motorista([
        'nome_completo' => $nome,
        'email' => $user->email,
        'carta_valid_until' => now()->addDays(10)->toDateString(),
        'registo_criminal_valid_until' => now()->addDays(40)->toDateString(),
    ]);

    $motorista->tenant_id = $tenant->id;
    $motorista->user_id = $user->id;
    $motorista->ativo = true;
    $motorista->status_cadastro = 'ativo';
    $motorista->save();

    return $motorista;
}

function mdVeiculo(Tenant $tenant, string $matricula = '00-AA-00'): Veiculo
{
    $veiculo = new Veiculo([
        'matricula' => $matricula,
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
        'inspecao_tvde_valid_until' => now()->addDays(20)->toDateString(),
    ]);

    $veiculo->tenant_id = $tenant->id;
    $veiculo->ativo = true;
    $veiculo->status_cadastro = 'ativo';
    $veiculo->save();

    return $veiculo;
}

test('dashboard motorista exige autenticação', function () {
    $this->withHeaders(mdHeaders())
        ->getJson('/api/portal/motorista/dashboard')
        ->assertUnauthorized();
});

test('utilizador sem role motorista não acede ao dashboard', function () {
    $tenant = mdTenant('dashboard-sem-role');
    $user = mdUser('dashboard.sem.role@frotapro.test');

    mdAssociate($user, $tenant);
    mdLogin($this, $user);

    $this->getJson('/api/portal/motorista/dashboard')->assertForbidden();
});

test('motorista sem vínculo recebe 404', function () {
    $tenant = mdTenant('dashboard-sem-vinculo');
    $user = mdUser('dashboard.sem.vinculo@frotapro.test');

    mdAssociate($user, $tenant);
    mdRole($user, $tenant);
    mdLogin($this, $user);

    $this->getJson('/api/portal/motorista/dashboard')->assertNotFound();
});

test('dashboard apresenta apenas resumo operacional do próprio motorista', function () {
    $tenant = mdTenant();
    $user = mdUser('dashboard.motorista@frotapro.test');

    mdAssociate($user, $tenant);
    mdRole($user, $tenant);

    $motorista = mdMotorista($user, $tenant);
    $veiculo = mdVeiculo($tenant);

    $contrato = new Contrato([
        'tipo' => 'aluguer',
        'motorista_id' => $motorista->id,
        'veiculo_id' => $veiculo->id,
        'data_inicio' => now()->subDays(5)->toDateString(),
    ]);
    $contrato->tenant_id = $tenant->id;
    $contrato->status = 'assinado';
    $contrato->save();

    $atribuicao = new ContratoAtivoVeiculo([
        'data_inicio' => now()->subDays(5),
        'ativo' => true,
    ]);
    $atribuicao->tenant_id = $tenant->id;
    $atribuicao->motorista_id = $motorista->id;
    $atribuicao->veiculo_id = $veiculo->id;
    $atribuicao->contrato_id = $contrato->id;
    $atribuicao->save();

    $registo = new RegistoExpediente();
    $registo->tenant_id = $tenant->id;
    $registo->motorista_id = $motorista->id;
    $registo->data_hora = now()->subHour();
    $registo->data_local = now('Europe/Lisbon')->toDateString();
    $registo->tipo = 'entrada';
    $registo->origem = 'app';
    $registo->save();

    $multa = new Multa([
        'veiculo_id' => $veiculo->id,
        'motorista_id' => $motorista->id,
        'data_multa' => now()->toDateString(),
        'tipo' => 'outro',
        'valor' => 50,
        'status' => 'pendente',
    ]);
    $multa->tenant_id = $tenant->id;
    $multa->save();

    $manutencao = new Manutencao([
        'veiculo_id' => $veiculo->id,
        'motorista_id' => $motorista->id,
        'tipo_servico' => 'Revisão',
        'prioridade' => 'normal',
        'data_solicitacao' => now()->toDateString(),
        'data_agendada' => now()->addDays(3)->toDateString(),
    ]);
    $manutencao->tenant_id = $tenant->id;
    $manutencao->status = 'agendada';
    $manutencao->save();

    $alert = new Alert([
        'rule_code' => 'dashboard_test',
        'source_type' => 'motorista',
        'source_id' => $motorista->id,
        'dedup_key' => 'dashboard-test',
        'fingerprint' => hash('sha256', 'dashboard-test'),
        'active_key' => hash('sha256', 'dashboard-test-active'),
        'category' => 'document',
        'severity' => 'high',
        'status' => 'open',
        'title' => 'Documento a vencer',
        'message' => 'A carta de condução está próxima do vencimento.',
        'triggered_at' => now(),
    ]);
    $alert->tenant_id = $tenant->id;
    $alert->save();

    $recipient = new AlertRecipient([
        'alert_id' => $alert->id,
        'user_id' => $user->id,
        'active' => true,
    ]);
    $recipient->tenant_id = $tenant->id;
    $recipient->save();

    $outro = mdUser('outro.motorista@frotapro.test');
    $outroMotorista = mdMotorista($outro, $tenant, 'Outro Motorista');

    $outraMulta = new Multa([
        'veiculo_id' => $veiculo->id,
        'motorista_id' => $outroMotorista->id,
        'data_multa' => now()->toDateString(),
        'tipo' => 'outro',
        'valor' => 100,
        'status' => 'pendente',
    ]);
    $outraMulta->tenant_id = $tenant->id;
    $outraMulta->save();

    mdLogin($this, $user);

    $this->getJson('/api/portal/motorista/dashboard')
        ->assertOk()
        ->assertJsonPath('data.motorista.id', $motorista->id)
        ->assertJsonPath('data.motorista.nome', 'Motorista Dashboard')
        ->assertJsonPath('data.expediente.em_servico', true)
        ->assertJsonPath('data.veiculo.id', $veiculo->id)
        ->assertJsonPath('data.veiculo.matricula', '00-AA-00')
        ->assertJsonPath('data.contrato.id', $contrato->id)
        ->assertJsonPath('data.contrato.status', 'assinado')
        ->assertJsonPath('data.multas.pendentes', 1)
        ->assertJsonPath('data.multas.total_abertas', 1)
        ->assertJsonPath('data.manutencoes.abertas', 1)
        ->assertJsonPath('data.alertas.total', 1)
        ->assertJsonPath('data.alertas.nao_lidos', 1)
        ->assertJsonPath('data.documentos.proximo.codigo', 'carta_conducao');
});

test('dashboard sem veículo ativo devolve veículo e contrato nulos', function () {
    $tenant = mdTenant('dashboard-sem-veiculo');
    $user = mdUser('dashboard.sem.veiculo@frotapro.test');

    mdAssociate($user, $tenant);
    mdRole($user, $tenant);
    mdMotorista($user, $tenant);

    mdLogin($this, $user);

    $this->getJson('/api/portal/motorista/dashboard')
        ->assertOk()
        ->assertJsonPath('data.veiculo', null)
        ->assertJsonPath('data.contrato', null)
        ->assertJsonPath('data.multas.total_abertas', 0)
        ->assertJsonPath('data.manutencoes.abertas', 0)
        ->assertJsonPath('data.alertas.total', 0);
});
