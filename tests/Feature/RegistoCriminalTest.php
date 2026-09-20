<?php

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\RegistoCriminal;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function registoCriminalHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function registoCriminalTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function registoCriminalLogin(
    $test,
    User $user
): void {
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function registoCriminalFuncionario(
    Tenant $tenant,
    string $email,
    string $nivel='configurar'
): User {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make(
            'SenhaTeste123!'
        ),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::firstOrCreate(
        [
            'codigo'=>'funcionario',
        ],
        [
            'nome'=>'Funcionário',
            'sistema'=>true,
        ]
    );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    $permission=Permission::firstOrCreate(
        [
            'codigo'=>'registos_criminais',
        ],
        [
            'modulo'=>'registos_criminais',
            'nome'=>'Registos criminais',
        ]
    );

    RolePermission::updateOrCreate(
        [
            'role_id'=>$role->id,
            'permission_id'=>$permission->id,
        ],
        [
            'nivel'=>$nivel,
        ]
    );

    return $user;
}

function registoCriminalMotorista(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>$nif.'@motorista.test',
    ]);

    $motorista->tenant_id=$tenant->id;

    if($user){
        $motorista->user_id=$user->id;
    }

    $motorista->save();

    return $motorista;
}

function registoCriminalMotoristaUser(
    Tenant $tenant,
    string $email,
    string $nome,
    string $nif
): array {
    $user=User::factory()->create([
        'email'=>$email,
        'password'=>Hash::make(
            'SenhaTeste123!'
        ),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::firstOrCreate(
        [
            'codigo'=>'motorista',
        ],
        [
            'nome'=>'Motorista',
            'sistema'=>true,
        ]
    );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    $motorista=registoCriminalMotorista(
        $tenant,
        $nome,
        $nif,
        $user
    );

    return [
        $user,
        $motorista,
    ];
}

function registoCriminalDocumento(
    Tenant $tenant,
    Motorista $motorista,
    User $user,
    string $codigo='RC-TESTE-001'
): RegistoCriminal {
    $registo=new RegistoCriminal([
        'motorista_id'=>$motorista->id,
        'codigo_consulta'=>$codigo,
        'data_validade'=>
            now()->addMonths(2)
                ->toDateString(),
    ]);

    $registo->tenant_id=$tenant->id;
    $registo->arquivo_path=
        'registos-criminais/teste/'.
        $codigo.
        '.pdf';
    $registo->arquivo_nome='registo.pdf';
    $registo->arquivo_mime='application/pdf';
    $registo->arquivo_tamanho=100;
    $registo->hash_arquivo=str_repeat('a',64);
    $registo->enviado_por=$user->id;
    $registo->save();

    return $registo;
}

test('rotas de registos criminais exigem autenticação',function(){
    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->getJson(
            '/api/registos-criminais'
        )
        ->assertUnauthorized();
});

test('gestor envia registo criminal privado e campos protegidos pertencem ao servidor',function(){
    Storage::fake('local');

    $tenant=registoCriminalTenant(
        'Tenant RC',
        'tenant-rc'
    );

    $user=registoCriminalFuncionario(
        $tenant,
        'gestor.rc@frotapro.test'
    );

    $motorista=registoCriminalMotorista(
        $tenant,
        'Motorista RC',
        '111111111'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $response=$this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'motorista_id'=>$motorista->id,
                'codigo_consulta'=>'ABC-123-XYZ',
                'data_emissao'=>'2026-09-20',
                'data_validade'=>'2026-12-20',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'registo.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'pendente_validacao'
        )
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        );

    $id=$response->json('data.id');

    $registo=RegistoCriminal::findOrFail(
        $id
    );

    expect($registo->enviado_por)
        ->toBe($user->id);

    expect($registo->hash_arquivo)
        ->toMatch('/^[a-f0-9]{64}$/');

    expect($registo->arquivo_path)
        ->toStartWith(
            'registos-criminais/'.
            $tenant->id.'/'.
            $motorista->id.'/'
        );

    Storage::disk('local')
        ->assertExists(
            $registo->arquivo_path
        );
});

test('registo criminal não aceita motorista de outro tenant',function(){
    Storage::fake('local');

    $tenantA=registoCriminalTenant(
        'Tenant A',
        'rc-a'
    );

    $tenantB=registoCriminalTenant(
        'Tenant B',
        'rc-b'
    );

    $user=registoCriminalFuncionario(
        $tenantA,
        'rc.a@frotapro.test'
    );

    $motoristaB=registoCriminalMotorista(
        $tenantB,
        'Motorista B',
        '222222222'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'motorista_id'=>$motoristaB->id,
                'codigo_consulta'=>'OUTRO-TENANT',
                'data_validade'=>'2026-12-20',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'registo.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );
});

test('motorista envia apenas o próprio registo criminal',function(){
    Storage::fake('local');

    $tenant=registoCriminalTenant(
        'Tenant Motorista',
        'rc-motorista'
    );

    [
        $user,
        $motorista,
    ]=registoCriminalMotoristaUser(
        $tenant,
        'motorista.rc@frotapro.test',
        'Motorista Próprio',
        '333333333'
    );

    $outro=registoCriminalMotorista(
        $tenant,
        'Outro Motorista',
        '444444444'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'codigo_consulta'=>'MEU-RC',
                'data_validade'=>'2026-12-20',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'meu-registo.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.motorista_id',
            $motorista->id
        );

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'motorista_id'=>$outro->id,
                'codigo_consulta'=>'TENTATIVA',
                'data_validade'=>'2026-12-20',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'outro.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );
});

test('motorista consulta apenas os próprios registos criminais',function(){
    $tenant=registoCriminalTenant(
        'Tenant Leitura',
        'rc-leitura'
    );

    [
        $user,
        $motorista,
    ]=registoCriminalMotoristaUser(
        $tenant,
        'motorista.leitura@frotapro.test',
        'Motorista Leitura',
        '555555555'
    );

    $outro=registoCriminalMotorista(
        $tenant,
        'Motorista Alheio',
        '666666666'
    );

    $proprio=registoCriminalDocumento(
        $tenant,
        $motorista,
        $user,
        'PROPRIO'
    );

    $alheio=registoCriminalDocumento(
        $tenant,
        $outro,
        $user,
        'ALHEIO'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->getJson(
            '/api/registos-criminais'
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.id',
            $proprio->id
        );

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->getJson(
            "/api/registos-criminais/{$alheio->id}"
        )
        ->assertNotFound();
});

test('validação sincroniza validade do registo criminal no motorista',function(){
    Storage::fake('local');

    $tenant=registoCriminalTenant(
        'Tenant Validação',
        'rc-validacao'
    );

    $user=registoCriminalFuncionario(
        $tenant,
        'validacao.rc@frotapro.test'
    );

    $motorista=registoCriminalMotorista(
        $tenant,
        'Motorista Validado',
        '777777777'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $response=$this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'motorista_id'=>$motorista->id,
                'codigo_consulta'=>'VALIDAR-001',
                'data_validade'=>'2027-01-15',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'validar.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertCreated();

    $id=$response->json('data.id');

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->postJson(
            "/api/registos-criminais/{$id}/validar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'validado'
        );

    $registo=RegistoCriminal::findOrFail(
        $id
    );

    $motorista->refresh();

    expect($registo->validado_por)
        ->toBe($user->id);

    expect($registo->validado_em)
        ->not->toBeNull();

    expect(
        $motorista
            ->registo_criminal_valid_until
            ?->toDateString()
    )->toBe(
        '2027-01-15'
    );
});

test('rejeição guarda motivo e não altera validade do motorista',function(){
    Storage::fake('local');

    $tenant=registoCriminalTenant(
        'Tenant Rejeição',
        'rc-rejeicao'
    );

    $user=registoCriminalFuncionario(
        $tenant,
        'rejeicao.rc@frotapro.test'
    );

    $motorista=registoCriminalMotorista(
        $tenant,
        'Motorista Rejeitado',
        '888888888'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $response=$this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'motorista_id'=>$motorista->id,
                'codigo_consulta'=>'REJEITAR-001',
                'data_validade'=>'2027-01-15',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'rejeitar.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertCreated();

    $id=$response->json('data.id');

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->postJson(
            "/api/registos-criminais/{$id}/rejeitar",
            [
                'motivo'=>
                    'Documento ilegível.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'rejeitado'
        )
        ->assertJsonPath(
            'data.observacoes_empresa',
            'Documento ilegível.'
        );

    $motorista->refresh();

    expect(
        $motorista
            ->registo_criminal_valid_until
    )->toBeNull();
});

test('permissão visualizar permite leitura mas não valida nem envia documentos',function(){
    Storage::fake('local');

    $tenant=registoCriminalTenant(
        'Tenant Visualizar',
        'rc-visualizar'
    );

    $user=registoCriminalFuncionario(
        $tenant,
        'visualizar.rc@frotapro.test',
        'visualizar'
    );

    $motorista=registoCriminalMotorista(
        $tenant,
        'Motorista Visualizar',
        '999999999'
    );

    $registo=registoCriminalDocumento(
        $tenant,
        $motorista,
        $user,
        'VISUALIZAR'
    );

    registoCriminalLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->getJson(
            '/api/registos-criminais'
        )
        ->assertOk();

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->post(
            '/api/registos-criminais',
            [
                'motorista_id'=>$motorista->id,
                'codigo_consulta'=>'BLOQUEADO',
                'data_validade'=>'2027-01-15',
                'arquivo'=>
                    UploadedFile::fake()
                        ->create(
                            'bloqueado.pdf',
                            100,
                            'application/pdf'
                        ),
            ]
        )
        ->assertForbidden();

    $this
        ->withHeaders(
            registoCriminalHeaders()
        )
        ->postJson(
            "/api/registos-criminais/{$registo->id}/validar"
        )
        ->assertForbidden();
});
