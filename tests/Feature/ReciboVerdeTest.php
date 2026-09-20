<?php

use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\ReciboVerde;
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

function rvHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function rvTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function rvLogin(
    $test,
    User $user
): void {
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

function rvFuncionario(
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
            'codigo'=>'recibos_verdes',
        ],
        [
            'modulo'=>'recibos_verdes',
            'nome'=>'Recibos verdes',
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

function rvEmpresa(
    Tenant $tenant,
    string $nome,
    string $nif
): Empresa {
    $empresa=new Empresa([
        'nome_empresa'=>$nome,
        'nif'=>$nif,
    ]);

    $empresa->tenant_id=
        $tenant->id;

    $empresa->save();

    return $empresa;
}

function rvMotorista(
    Tenant $tenant,
    string $nome,
    string $nif,
    ?User $user=null
): Motorista {
    $motorista=new Motorista([
        'nome_completo'=>$nome,
        'nif'=>$nif,
        'email'=>
            $nif.'@recibo.test',
    ]);

    $motorista->tenant_id=
        $tenant->id;

    if($user){
        $motorista->user_id=
            $user->id;
    }

    $motorista->save();

    return $motorista;
}

function rvMotoristaUser(
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

    $motorista=rvMotorista(
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

function rvPayload(
    Motorista $motorista,
    string $numero='FR 2026/001',
    string $adquirente='509999999'
): array {
    return [
        'motorista_id'=>
            $motorista->id,
        'numero_documento'=>
            $numero,
        'data_emissao'=>
            '2026-09-20',
        'nif_emitente'=>
            $motorista->nif,
        'nome_emitente'=>
            $motorista->nome_completo,
        'nif_adquirente'=>
            $adquirente,
        'nome_adquirente'=>
            'Empresa TVDE',
        'valor_base'=>'100.00',
        'valor_iva'=>'23.00',
        'retencao_irs'=>'0.00',
        'valor_total'=>'123.00',
        'arquivo'=>
            UploadedFile::fake()
                ->create(
                    'recibo.pdf',
                    100,
                    'application/pdf'
                ),
    ];
}

function rvDocumento(
    Tenant $tenant,
    Motorista $motorista,
    User $user,
    string $numero='FR 2026/TESTE'
): ReciboVerde {
    $recibo=new ReciboVerde([
        'motorista_id'=>
            $motorista->id,
        'numero_documento'=>
            $numero,
        'data_emissao'=>
            '2026-09-20',
        'nif_emitente'=>
            $motorista->nif,
        'nome_emitente'=>
            $motorista->nome_completo,
        'nif_adquirente'=>
            '509999999',
        'nome_adquirente'=>
            'Empresa',
        'valor_base'=>'100.00',
        'valor_iva'=>'23.00',
        'retencao_irs'=>'0.00',
        'valor_total'=>'123.00',
    ]);

    $recibo->tenant_id=
        $tenant->id;

    $recibo->ano=2026;
    $recibo->mes=9;

    $recibo->arquivo_path=
        'recibos-verdes/teste/'.
        md5($numero).
        '.pdf';

    $recibo->arquivo_nome=
        'recibo.pdf';

    $recibo->arquivo_mime=
        'application/pdf';

    $recibo->arquivo_tamanho=
        100;

    $recibo->hash_arquivo=
        str_repeat('a',64);

    $recibo->created_by=
        $user->id;

    $recibo->avisos_validacao=
        [];

    $recibo->save();

    return $recibo;
}

test('rotas de recibos verdes exigem autenticação',function(){
    $this
        ->withHeaders(
            rvHeaders()
        )
        ->getJson(
            '/api/recibos-verdes'
        )
        ->assertUnauthorized();
});

test('gestor envia recibo privado com campos protegidos calculados pelo servidor',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Recibos',
        'tenant-recibos'
    );

    $user=rvFuncionario(
        $tenant,
        'gestor.recibos@frotapro.test'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Recibo',
        '245678901'
    );

    $empresa=rvEmpresa(
        $tenant,
        'Empresa TVDE',
        '509999999'
    );

    rvLogin(
        $this,
        $user
    );

    $response=$this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            rvPayload(
                $motorista
            )
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.status',
            'pendente_validacao'
        )
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.empresa_id',
            $empresa->id
        )
        ->assertJsonPath(
            'data.ano',
            2026
        )
        ->assertJsonPath(
            'data.mes',
            9
        );

    $recibo=ReciboVerde::findOrFail(
        $response->json(
            'data.id'
        )
    );

    expect($recibo->created_by)
        ->toBe($user->id);

    expect($recibo->hash_arquivo)
        ->toMatch(
            '/^[a-f0-9]{64}$/'
        );

    expect(
        $recibo->avisos_validacao
    )->toBe([]);

    expect(
        $recibo->arquivo_path
    )->toStartWith(
        'recibos-verdes/'.
        $tenant->id.'/'.
        $motorista->id.'/'
    );

    Storage::disk('local')
        ->assertExists(
            $recibo->arquivo_path
        );
});

test('backend gera avisos sem bloquear recibo inconsistente',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Avisos',
        'tenant-avisos'
    );

    $user=rvFuncionario(
        $tenant,
        'avisos@frotapro.test'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Avisos',
        '211111111'
    );

    rvLogin(
        $this,
        $user
    );

    $payload=rvPayload(
        $motorista,
        'FR 2026/AVISOS',
        '588888888'
    );

    $payload['nif_emitente']=
        '299999999';

    $payload['data_emissao']=
        now()
            ->addDay()
            ->toDateString();

    $payload['valor_total']=
        '999.00';

    $response=$this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            $payload
        )
        ->assertCreated();

    $avisos=$response->json(
        'data.avisos_validacao'
    );

    $codigos=collect(
        $avisos
    )->pluck('codigo');

    expect($codigos)
        ->toContain(
            'nif_emitente_divergente'
        )
        ->toContain(
            'nif_adquirente_nao_encontrado'
        )
        ->toContain(
            'data_emissao_futura'
        )
        ->toContain(
            'valor_total_incoerente'
        );
});

test('recibo duplicado do mesmo motorista é bloqueado',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Duplicado',
        'tenant-duplicado'
    );

    $user=rvFuncionario(
        $tenant,
        'duplicado@frotapro.test'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Duplicado',
        '222222222'
    );

    rvEmpresa(
        $tenant,
        'Empresa Duplicado',
        '509999999'
    );

    rvLogin(
        $this,
        $user
    );

    $payload=rvPayload(
        $motorista,
        'FR 2026/DUPLICADO'
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            $payload
        )
        ->assertCreated();

    $payload=rvPayload(
        $motorista,
        'FR 2026/DUPLICADO'
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            $payload
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'numero_documento'
        );

    expect(
        ReciboVerde::count()
    )->toBe(1);
});

test('recibo não aceita motorista de outro tenant',function(){
    Storage::fake('local');

    $tenantA=rvTenant(
        'Tenant A',
        'rv-a'
    );

    $tenantB=rvTenant(
        'Tenant B',
        'rv-b'
    );

    $user=rvFuncionario(
        $tenantA,
        'tenant.a@recibo.test'
    );

    $motoristaB=rvMotorista(
        $tenantB,
        'Motorista B',
        '233333333'
    );

    rvLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            rvPayload(
                $motoristaB
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );
});

test('motorista envia e consulta apenas os próprios recibos',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Motorista',
        'rv-motorista'
    );

    [
        $user,
        $motorista,
    ]=rvMotoristaUser(
        $tenant,
        'motorista@recibo.test',
        'Motorista Próprio',
        '244444444'
    );

    $outro=rvMotorista(
        $tenant,
        'Outro Motorista',
        '255555555'
    );

    rvEmpresa(
        $tenant,
        'Empresa',
        '509999999'
    );

    rvDocumento(
        $tenant,
        $outro,
        $user,
        'FR 2026/ALHEIO'
    );

    rvLogin(
        $this,
        $user
    );

    $payload=rvPayload(
        $motorista,
        'FR 2026/PROPRIO'
    );

    unset(
        $payload['motorista_id']
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            $payload
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.motorista_id',
            $motorista->id
        );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->getJson(
            '/api/recibos-verdes'
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.motorista_id',
            $motorista->id
        );
});

test('motorista não consegue enviar recibo para outro motorista',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Segurança',
        'rv-seguranca'
    );

    [
        $user,
        $motorista,
    ]=rvMotoristaUser(
        $tenant,
        'seguranca@recibo.test',
        'Motorista Segurança',
        '266666666'
    );

    $outro=rvMotorista(
        $tenant,
        'Motorista Alheio',
        '277777777'
    );

    rvLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            rvPayload(
                $outro,
                'FR 2026/INDEVIDO'
            )
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'motorista_id'
        );

    expect(
        ReciboVerde::count()
    )->toBe(0);
});

test('gestor valida recibo pendente',function(){
    $tenant=rvTenant(
        'Tenant Validação',
        'rv-validacao'
    );

    $user=rvFuncionario(
        $tenant,
        'validar@recibo.test'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Validar',
        '288888888'
    );

    $recibo=rvDocumento(
        $tenant,
        $motorista,
        $user,
        'FR 2026/VALIDAR'
    );

    rvLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->postJson(
            "/api/recibos-verdes/{$recibo->id}/validar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'validado'
        );

    $recibo->refresh();

    expect(
        $recibo->validado_por
    )->toBe(
        $user->id
    );

    expect(
        $recibo->validado_em
    )->not->toBeNull();
});

test('gestor rejeita recibo pendente com motivo',function(){
    $tenant=rvTenant(
        'Tenant Rejeição',
        'rv-rejeicao'
    );

    $user=rvFuncionario(
        $tenant,
        'rejeitar@recibo.test'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Rejeitar',
        '299999998'
    );

    $recibo=rvDocumento(
        $tenant,
        $motorista,
        $user,
        'FR 2026/REJEITAR'
    );

    rvLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->postJson(
            "/api/recibos-verdes/{$recibo->id}/rejeitar",
            [
                'motivo'=>
                    'Valor incorreto.',
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'rejeitado'
        )
        ->assertJsonPath(
            'data.observacoes_empresa',
            'Valor incorreto.'
        );

    $recibo->refresh();

    expect(
        $recibo->rejeitado_por
    )->toBe(
        $user->id
    );
});

test('permissão visualizar permite leitura mas não envio nem validação',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Visualizar',
        'rv-visualizar'
    );

    $user=rvFuncionario(
        $tenant,
        'visualizar@recibo.test',
        'visualizar'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Visualizar',
        '299999997'
    );

    $recibo=rvDocumento(
        $tenant,
        $motorista,
        $user,
        'FR 2026/VISUALIZAR'
    );

    rvLogin(
        $this,
        $user
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->getJson(
            '/api/recibos-verdes'
        )
        ->assertOk();

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            rvPayload(
                $motorista,
                'FR 2026/BLOQUEADO'
            )
        )
        ->assertForbidden();

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->postJson(
            "/api/recibos-verdes/{$recibo->id}/validar"
        )
        ->assertForbidden();
});

test('ficheiro privado do recibo pode ser visualizado e descarregado',function(){
    Storage::fake('local');

    $tenant=rvTenant(
        'Tenant Arquivo',
        'rv-arquivo'
    );

    $user=rvFuncionario(
        $tenant,
        'arquivo@recibo.test'
    );

    $motorista=rvMotorista(
        $tenant,
        'Motorista Arquivo',
        '299999996'
    );

    rvEmpresa(
        $tenant,
        'Empresa Arquivo',
        '509999999'
    );

    rvLogin(
        $this,
        $user
    );

    $response=$this
        ->withHeaders(
            rvHeaders()
        )
        ->post(
            '/api/recibos-verdes',
            rvPayload(
                $motorista,
                'FR 2026/ARQUIVO'
            )
        )
        ->assertCreated();

    $id=$response->json(
        'data.id'
    );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->get(
            "/api/recibos-verdes/{$id}/arquivo"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );

    $this
        ->withHeaders(
            rvHeaders()
        )
        ->get(
            "/api/recibos-verdes/{$id}/arquivo/download"
        )
        ->assertOk()
        ->assertHeader(
            'content-type',
            'application/pdf'
        );
});
