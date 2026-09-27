<?php

use App\Models\Alert;
use App\Models\AlertRecipient;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Manutencao;
use App\Models\Motorista;
use App\Models\Multa;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Sinistro;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(fn()=>$this->seed(RoleSeeder::class));

function pdHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function pdUser(string $email): User
{
    return User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);
}

function pdTenant(string $slug='dashboard-proprietario'): Tenant
{
    return Tenant::create([
        'nome'=>'Empresa Proprietário',
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function pdAssociate(User $user,Tenant $tenant): void
{
    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);
}

function pdRole(User $user,Tenant $tenant,string $codigo='proprietario'): void
{
    $role=Role::query()->where('codigo',$codigo)->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);
}

function pdLogin($test,User $user): void
{
    $test->withHeaders(pdHeaders())->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function pdProprietario(User $user,Tenant $tenant,string $nome='Proprietário Dashboard'): Proprietario
{
    $proprietario=new Proprietario([
        'tipo'=>'pessoa_fisica',
        'nome_completo'=>$nome,
        'email'=>$user->email,
        'documento_valid_until'=>now()->addDays(5)->toDateString(),
    ]);

    $proprietario->tenant_id=$tenant->id;
    $proprietario->user_id=$user->id;
    $proprietario->ativo=true;
    $proprietario->status_cadastro='ativo';
    $proprietario->save();

    return $proprietario;
}

function pdVeiculo(Tenant $tenant,Proprietario $proprietario,string $matricula): Veiculo
{
    $veiculo=new Veiculo([
        'proprietario_id'=>$proprietario->id,
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
        'inspecao_tvde_valid_until'=>now()->addDays(15)->toDateString(),
    ]);

    $veiculo->tenant_id=$tenant->id;
    $veiculo->ativo=true;
    $veiculo->status_cadastro='ativo';
    $veiculo->save();

    return $veiculo;
}

test('dashboard proprietário exige autenticação',function(){
    $this->withHeaders(pdHeaders())
        ->getJson('/api/portal/proprietario/dashboard')
        ->assertUnauthorized();
});

test('utilizador sem role proprietário não acede ao dashboard',function(){
    $tenant=pdTenant('proprietario-sem-role');
    $user=pdUser('proprietario.sem.role@frotapro.test');

    pdAssociate($user,$tenant);
    pdLogin($this,$user);

    $this->withHeaders(pdHeaders())
        ->getJson('/api/portal/proprietario/dashboard')
        ->assertForbidden();
});

test('role proprietário sem vínculo recebe 404',function(){
    $tenant=pdTenant('proprietario-sem-vinculo');
    $user=pdUser('proprietario.sem.vinculo@frotapro.test');

    pdAssociate($user,$tenant);
    pdRole($user,$tenant);
    pdLogin($this,$user);

    $this->withHeaders(pdHeaders())
        ->getJson('/api/portal/proprietario/dashboard')
        ->assertNotFound();
});

test('dashboard apresenta apenas dados da frota do proprietário autenticado',function(){
    $tenant=pdTenant();
    $user=pdUser('proprietario.dashboard@frotapro.test');

    pdAssociate($user,$tenant);
    pdRole($user,$tenant);

    $proprietario=pdProprietario($user,$tenant);
    $veiculo=pdVeiculo($tenant,$proprietario,'11-AA-11');

    $motorista=new Motorista(['nome_completo'=>'Motorista Vinculado']);
    $motorista->tenant_id=$tenant->id;
    $motorista->ativo=true;
    $motorista->status_cadastro='ativo';
    $motorista->save();

    $contrato=new Contrato([
        'tipo'=>'aluguer',
        'proprietario_id'=>$proprietario->id,
        'motorista_id'=>$motorista->id,
        'veiculo_id'=>$veiculo->id,
        'data_inicio'=>now()->subDays(5)->toDateString(),
    ]);
    $contrato->tenant_id=$tenant->id;
    $contrato->status='assinado';
    $contrato->save();

    $atribuicao=new ContratoAtivoVeiculo([
        'data_inicio'=>now()->subDays(5),
        'ativo'=>true,
    ]);
    $atribuicao->tenant_id=$tenant->id;
    $atribuicao->motorista_id=$motorista->id;
    $atribuicao->veiculo_id=$veiculo->id;
    $atribuicao->contrato_id=$contrato->id;
    $atribuicao->save();

    $multa=new Multa([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista->id,
        'data_multa'=>now()->toDateString(),
        'tipo'=>'outro',
        'valor'=>75,
        'status'=>'pendente',
    ]);
    $multa->tenant_id=$tenant->id;
    $multa->save();

    $sinistro=new Sinistro([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista->id,
        'data_sinistro'=>now()->toDateString(),
        'status'=>'aberto',
    ]);
    $sinistro->tenant_id=$tenant->id;
    $sinistro->save();

    $manutencao=new Manutencao([
        'veiculo_id'=>$veiculo->id,
        'motorista_id'=>$motorista->id,
        'tipo_servico'=>'Revisão geral',
        'prioridade'=>'critica',
        'data_solicitacao'=>now()->toDateString(),
    ]);
    $manutencao->tenant_id=$tenant->id;
    $manutencao->status='agendada';
    $manutencao->save();

    $alert=new Alert([
        'rule_code'=>'proprietario_dashboard_test',
        'source_type'=>'veiculo',
        'source_id'=>$veiculo->id,
        'dedup_key'=>'proprietario-dashboard-test',
        'fingerprint'=>hash('sha256','proprietario-dashboard-test'),
        'active_key'=>hash('sha256','proprietario-dashboard-test-active'),
        'category'=>'document',
        'severity'=>'high',
        'status'=>'open',
        'title'=>'Documento próximo do vencimento',
        'triggered_at'=>now(),
    ]);
    $alert->tenant_id=$tenant->id;
    $alert->save();

    $recipient=new AlertRecipient([
        'alert_id'=>$alert->id,
        'user_id'=>$user->id,
        'active'=>true,
    ]);
    $recipient->tenant_id=$tenant->id;
    $recipient->save();

    $otherUser=pdUser('outro.proprietario@frotapro.test');
    $other=pdProprietario($otherUser,$tenant,'Outro Proprietário');
    $otherVehicle=pdVeiculo($tenant,$other,'99-ZZ-99');

    $otherFine=new Multa([
        'veiculo_id'=>$otherVehicle->id,
        'data_multa'=>now()->toDateString(),
        'tipo'=>'outro',
        'valor'=>200,
        'status'=>'pendente',
    ]);
    $otherFine->tenant_id=$tenant->id;
    $otherFine->save();

    pdLogin($this,$user);

    $this->withHeaders(pdHeaders())
        ->getJson('/api/portal/proprietario/dashboard')
        ->assertOk()
        ->assertJsonPath('data.proprietario.id',$proprietario->id)
        ->assertJsonPath('data.frota.total',1)
        ->assertJsonPath('data.frota.ativos',1)
        ->assertJsonPath('data.frota.items.0.matricula','11-AA-11')
        ->assertJsonPath('data.frota.items.0.motoristas.0.nome','Motorista Vinculado')
        ->assertJsonPath('data.contratos.ativos',1)
        ->assertJsonPath('data.multas.total_abertas',1)
        ->assertJsonPath('data.sinistros.total_abertos',1)
        ->assertJsonPath('data.manutencoes.abertas',1)
        ->assertJsonPath('data.manutencoes.criticas',1)
        ->assertJsonPath('data.documentos.a_vencer_30_dias',2)
        ->assertJsonPath('data.alertas.total',1)
        ->assertJsonPath('data.alertas.nao_lidos',1);
});

test('dashboard proprietário sem veículos devolve resumo vazio',function(){
    $tenant=pdTenant('proprietario-sem-frota');
    $user=pdUser('proprietario.sem.frota@frotapro.test');

    pdAssociate($user,$tenant);
    pdRole($user,$tenant);
    pdProprietario($user,$tenant);

    pdLogin($this,$user);

    $this->withHeaders(pdHeaders())
        ->getJson('/api/portal/proprietario/dashboard')
        ->assertOk()
        ->assertJsonPath('data.frota.total',0)
        ->assertJsonPath('data.contratos.ativos',0)
        ->assertJsonPath('data.multas.total_abertas',0)
        ->assertJsonPath('data.sinistros.total_abertos',0)
        ->assertJsonPath('data.manutencoes.abertas',0)
        ->assertJsonPath('data.alertas.total',0);
});
