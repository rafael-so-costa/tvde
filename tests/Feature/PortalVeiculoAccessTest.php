<?php

use App\Models\ContratoAtivoVeiculo;
use App\Models\Motorista;
use App\Models\Proprietario;
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

beforeEach(fn()=>$this->seed(RoleSeeder::class));

function pvaHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function pvaTenant(string $slug): Tenant
{
    return Tenant::create([
        'nome'=>'Tenant '.$slug,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function pvaUser(string $email,Tenant $tenant,string $role): User
{
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $roleModel=Role::query()->where('codigo',$role)->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$roleModel->id,
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function pvaLogin($test,User $user): void
{
    $test->withHeaders(pvaHeaders())->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function pvaProprietario(Tenant $tenant,?User $user,string $nome): Proprietario
{
    $proprietario=new Proprietario([
        'tipo'=>'pessoa_fisica',
        'nome_completo'=>$nome,
        'email'=>$user?->email,
    ]);

    $proprietario->tenant_id=$tenant->id;
    $proprietario->user_id=$user?->id;
    $proprietario->ativo=true;
    $proprietario->status_cadastro='ativo';
    $proprietario->save();

    return $proprietario;
}

function pvaMotorista(Tenant $tenant,User $user): Motorista
{
    $motorista=new Motorista([
        'nome_completo'=>'Motorista Portal',
        'email'=>$user->email,
    ]);

    $motorista->tenant_id=$tenant->id;
    $motorista->user_id=$user->id;
    $motorista->ativo=true;
    $motorista->status_cadastro='ativo';
    $motorista->save();

    return $motorista;
}

function pvaVeiculo(Tenant $tenant,Proprietario $proprietario,string $matricula): Veiculo
{
    $veiculo=new Veiculo([
        'proprietario_id'=>$proprietario->id,
        'matricula'=>$matricula,
        'marca'=>'Tesla',
        'modelo'=>'Model 3',
    ]);

    $veiculo->tenant_id=$tenant->id;
    $veiculo->ativo=true;
    $veiculo->status_cadastro='ativo';
    $veiculo->save();

    return $veiculo;
}

test('leitura de veículos exige autenticação',function(){
    $this->withHeaders(pvaHeaders())
        ->getJson('/api/veiculos')
        ->assertUnauthorized();
});

test('proprietário vê apenas os próprios veículos',function(){
    $tenant=pvaTenant('portal-proprietario-veiculos');
    $user=pvaUser('proprietario.portal@frotapro.test',$tenant,'proprietario');

    $proprietario=pvaProprietario($tenant,$user,'Proprietário Portal');
    $outro=pvaProprietario($tenant,null,'Outro Proprietário');

    $proprio=pvaVeiculo($tenant,$proprietario,'11-AA-11');
    $alheio=pvaVeiculo($tenant,$outro,'22-BB-22');

    pvaLogin($this,$user);

    $response=$this->withHeaders(pvaHeaders())
        ->getJson('/api/veiculos')
        ->assertOk()
        ->assertJsonCount(1,'data');

    expect(collect($response->json('data'))->pluck('id')->all())
        ->toBe([$proprio->id]);

    $this->withHeaders(pvaHeaders())
        ->getJson("/api/veiculos/{$proprio->id}")
        ->assertOk();

    $this->withHeaders(pvaHeaders())
        ->getJson("/api/veiculos/{$alheio->id}")
        ->assertNotFound();
});

test('motorista vê apenas veículos com vínculo ativo',function(){
    $tenant=pvaTenant('portal-motorista-veiculos');
    $user=pvaUser('motorista.portal@frotapro.test',$tenant,'motorista');

    $motorista=pvaMotorista($tenant,$user);
    $proprietario=pvaProprietario($tenant,null,'Proprietário da Frota');

    $ativo=pvaVeiculo($tenant,$proprietario,'33-CC-33');
    $inativo=pvaVeiculo($tenant,$proprietario,'44-DD-44');
    $alheio=pvaVeiculo($tenant,$proprietario,'55-EE-55');

    foreach([
        [$ativo,true],
        [$inativo,false],
    ] as [$veiculo,$status]){
        $vinculo=new ContratoAtivoVeiculo([
            'data_inicio'=>now()->subDays(5),
            'ativo'=>$status,
        ]);
        $vinculo->tenant_id=$tenant->id;
        $vinculo->motorista_id=$motorista->id;
        $vinculo->veiculo_id=$veiculo->id;
        $vinculo->save();
    }

    pvaLogin($this,$user);

    $response=$this->withHeaders(pvaHeaders())
        ->getJson('/api/veiculos')
        ->assertOk()
        ->assertJsonCount(1,'data');

    expect(collect($response->json('data'))->pluck('id')->all())
        ->toBe([$ativo->id]);

    $this->withHeaders(pvaHeaders())
        ->getJson("/api/veiculos/{$ativo->id}")
        ->assertOk();

    $this->withHeaders(pvaHeaders())
        ->getJson("/api/veiculos/{$inativo->id}")
        ->assertNotFound();

    $this->withHeaders(pvaHeaders())
        ->getJson("/api/veiculos/{$alheio->id}")
        ->assertNotFound();
});

test('role sem vínculo de domínio não recebe acesso a veículos',function(){
    $tenant=pvaTenant('portal-sem-vinculo-veiculos');
    $user=pvaUser('sem.vinculo@frotapro.test',$tenant,'proprietario');

    pvaLogin($this,$user);

    $this->withHeaders(pvaHeaders())
        ->getJson('/api/veiculos')
        ->assertForbidden();
});

test('utilizador multi-role recebe união dos veículos legitimamente vinculados',function(){
    $tenant=pvaTenant('portal-multirole-veiculos');

    $user=pvaUser('multi.role.veiculos@frotapro.test',$tenant,'proprietario');

    $motoristaRole=Role::query()->where('codigo','motorista')->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$motoristaRole->id,
        'tenant_id'=>$tenant->id,
    ]);

    $proprietario=pvaProprietario($tenant,$user,'Proprietário Multi');
    $outro=pvaProprietario($tenant,null,'Outro Proprietário');

    $proprio=pvaVeiculo($tenant,$proprietario,'66-FF-66');
    $comoMotorista=pvaVeiculo($tenant,$outro,'77-GG-77');
    $alheio=pvaVeiculo($tenant,$outro,'88-HH-88');

    $motorista=pvaMotorista($tenant,$user);

    $vinculo=new ContratoAtivoVeiculo([
        'data_inicio'=>now(),
        'ativo'=>true,
    ]);
    $vinculo->tenant_id=$tenant->id;
    $vinculo->motorista_id=$motorista->id;
    $vinculo->veiculo_id=$comoMotorista->id;
    $vinculo->save();

    pvaLogin($this,$user);

    $response=$this->withHeaders(pvaHeaders())
        ->getJson('/api/veiculos')
        ->assertOk()
        ->assertJsonCount(2,'data');

    $ids=collect($response->json('data'))->pluck('id');

    expect($ids)
        ->toContain($proprio->id)
        ->toContain($comoMotorista->id)
        ->not->toContain($alheio->id);
});
