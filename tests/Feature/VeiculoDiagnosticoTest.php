<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use App\Models\VeiculoDiagnostico;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function vdgHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function vdgTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function vdgLogin(
    $test,
    User $user
): void {
    $test->postJson('/login', [
        'email' => $user->email,
        'password' => 'SenhaTeste123!',
    ])->assertOk();
}

function vdgFuncionario(
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
        ['codigo' => 'manutencao'],
        [
            'modulo' => 'manutencao',
            'nome' => 'Manutenção',
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

function vdgVeiculo(
    Tenant $tenant,
    string $matricula
): Veiculo {
    $veiculo = new Veiculo([
        'matricula' => $matricula,
        'marca' => 'Tesla',
        'modelo' => 'Model 3',
    ]);

    $veiculo->tenant_id = $tenant->id;
    $veiculo->km_atual = 50000;
    $veiculo->disponibilidade = 'disponivel';
    $veiculo->save();

    return $veiculo;
}

function vdgDiagnostico(
    Tenant $tenant,
    Veiculo $veiculo,
    ?User $user = null,
    array $overrides = []
): VeiculoDiagnostico {
    $diagnostico = new VeiculoDiagnostico();

    $diagnostico->tenant_id = $tenant->id;
    $diagnostico->veiculo_id = $veiculo->id;

    $diagnostico->fonte =
        $overrides['fonte']
        ?? 'manual';

    $diagnostico->external_id =
        $overrides['external_id']
        ?? null;

    $diagnostico->codigo_dtc =
        $overrides['codigo_dtc']
        ?? 'P0001';

    $diagnostico->severidade =
        $overrides['severidade']
        ?? 'media';

    $diagnostico->status =
        $overrides['status']
        ?? 'aberto';

    $diagnostico->titulo =
        $overrides['titulo']
        ?? 'Falha de diagnóstico';

    $diagnostico->descricao =
        $overrides['descricao']
        ?? 'Falha detetada no veículo.';

    $diagnostico->detectado_em =
        $overrides['detectado_em']
        ?? now();

    $diagnostico->created_by = $user?->id;
    $diagnostico->updated_by = $user?->id;

    $diagnostico->save();

    return $diagnostico;
}

test('rotas de diagnosticos exigem autenticacao', function () {
    $this
        ->withHeaders(vdgHeaders())
        ->getJson('/api/diagnosticos')
        ->assertUnauthorized();

    $this
        ->withHeaders(vdgHeaders())
        ->postJson('/api/diagnosticos', [])
        ->assertUnauthorized();
});

test('gestor cria diagnostico manual com tenant e autoria definidos pelo servidor', function () {
    $tenant = vdgTenant(
        'Tenant Criar Diagnóstico',
        'tenant-criar-diagnostico'
    );

    $user = vdgFuncionario(
        $tenant,
        'criar@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'AA-51-AA'
    );

    vdgLogin($this, $user);

    $response = $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            '/api/diagnosticos',
            [
                'veiculo_id' => $veiculo->id,
                'fonte' => 'manual',
                'codigo_dtc' => 'P0420',
                'severidade' => 'alta',
                'titulo' =>
                'Eficiência do catalisador',
                'descricao' =>
                'Código detetado durante diagnóstico.',
                'detectado_em' => now()
                    ->toDateTimeString(),
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.tenant_id',
            $tenant->id
        )
        ->assertJsonPath(
            'data.veiculo_id',
            $veiculo->id
        )
        ->assertJsonPath(
            'data.fonte',
            'manual'
        )
        ->assertJsonPath(
            'data.codigo_dtc',
            'P0420'
        )
        ->assertJsonPath(
            'data.severidade',
            'alta'
        )
        ->assertJsonPath(
            'data.status',
            'aberto'
        );

    $diagnostico =
        VeiculoDiagnostico::findOrFail(
            $response->json('data.id')
        );

    expect($diagnostico->created_by)
        ->toBe($user->id);

    expect($diagnostico->updated_by)
        ->toBe($user->id);
});

test('diagnostico nao aceita veiculo de outro tenant', function () {
    $tenantA = vdgTenant(
        'Tenant Diagnóstico A',
        'tenant-diagnostico-a'
    );

    $tenantB = vdgTenant(
        'Tenant Diagnóstico B',
        'tenant-diagnostico-b'
    );

    $user = vdgFuncionario(
        $tenantA,
        'cross@diagnosticos.test'
    );

    $veiculoB = vdgVeiculo(
        $tenantB,
        'BB-51-BB'
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            '/api/diagnosticos',
            [
                'veiculo_id' => $veiculoB->id,
                'fonte' => 'manual',
                'codigo_dtc' => 'P0300',
                'severidade' => 'alta',
                'titulo' => 'Falha de ignição',
                'descricao' => 'Cross tenant.',
                'detectado_em' => now()
                    ->toDateTimeString(),
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'veiculo_id'
        );

    expect(
        VeiculoDiagnostico::count()
    )->toBe(0);
});

test('fonte severidade e campos invalidos sao rejeitados', function () {
    $tenant = vdgTenant(
        'Tenant Validação Diagnóstico',
        'tenant-validacao-diagnostico'
    );

    $user = vdgFuncionario(
        $tenant,
        'validacao@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'CC-51-CC'
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            '/api/diagnosticos',
            [
                'veiculo_id' => $veiculo->id,
                'fonte' => 'fonte_invalida',
                'severidade' => 'absurda',
                'titulo' => '',
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'fonte',
            'severidade',
            'titulo',
        ]);

    expect(
        VeiculoDiagnostico::count()
    )->toBe(0);
});

test('listagem de diagnosticos respeita tenant filtros pesquisa e prioridade', function () {
    $tenantA = vdgTenant(
        'Tenant Lista Diagnóstico A',
        'tenant-lista-diagnostico-a'
    );

    $tenantB = vdgTenant(
        'Tenant Lista Diagnóstico B',
        'tenant-lista-diagnostico-b'
    );

    $user = vdgFuncionario(
        $tenantA,
        'lista@diagnosticos.test',
        'visualizar'
    );

    $veiculoA = vdgVeiculo(
        $tenantA,
        'DD-51-DD'
    );

    $veiculoB = vdgVeiculo(
        $tenantB,
        'EE-51-EE'
    );

    $critico = vdgDiagnostico(
        $tenantA,
        $veiculoA,
        null,
        [
            'fonte' => 'obd',
            'codigo_dtc' => 'P0217',
            'severidade' => 'critica',
            'status' => 'aberto',
            'titulo' => 'Sobreaquecimento Lisboa',
        ]
    );

    vdgDiagnostico(
        $tenantA,
        $veiculoA,
        null,
        [
            'fonte' => 'manual',
            'codigo_dtc' => 'P0002',
            'severidade' => 'baixa',
            'status' => 'resolvido',
            'titulo' => 'Outro diagnóstico',
        ]
    );

    vdgDiagnostico(
        $tenantB,
        $veiculoB,
        null,
        [
            'fonte' => 'obd',
            'codigo_dtc' => 'P0217',
            'severidade' => 'critica',
            'status' => 'aberto',
            'titulo' => 'Lisboa outro tenant',
        ]
    );

    vdgLogin($this, $user);

    $response = $this
        ->withHeaders(vdgHeaders())
        ->getJson(
            '/api/diagnosticos' .
                '?fonte=obd' .
                '&severidade=critica' .
                '&status=aberto' .
                '&search=Lisboa'
        )
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath(
            'data.0.id',
            $critico->id
        );

    expect(
        collect(
            $response->json('data')
        )->pluck('veiculo_id')
    )->toContain($veiculoA->id);

    expect(
        collect(
            $response->json('data')
        )->pluck('veiculo_id')
    )->not->toContain($veiculoB->id);
});

test('gestor consulta detalhe do diagnostico apenas do proprio tenant', function () {
    $tenantA = vdgTenant(
        'Tenant Show Diagnóstico A',
        'tenant-show-diagnostico-a'
    );

    $tenantB = vdgTenant(
        'Tenant Show Diagnóstico B',
        'tenant-show-diagnostico-b'
    );

    $user = vdgFuncionario(
        $tenantA,
        'show@diagnosticos.test',
        'visualizar'
    );

    $veiculoA = vdgVeiculo(
        $tenantA,
        'FF-51-FF'
    );

    $veiculoB = vdgVeiculo(
        $tenantB,
        'GG-51-GG'
    );

    $diagnosticoA = vdgDiagnostico(
        $tenantA,
        $veiculoA
    );

    $diagnosticoB = vdgDiagnostico(
        $tenantB,
        $veiculoB
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->getJson(
            "/api/diagnosticos/{$diagnosticoA->id}"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.id',
            $diagnosticoA->id
        );

    $this
        ->withHeaders(vdgHeaders())
        ->getJson(
            "/api/diagnosticos/{$diagnosticoB->id}"
        )
        ->assertNotFound();
});

test('gestor resolve diagnostico aberto', function () {
    $tenant = vdgTenant(
        'Tenant Resolver Diagnóstico',
        'tenant-resolver-diagnostico'
    );

    $user = vdgFuncionario(
        $tenant,
        'resolver@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'HH-51-HH'
    );

    $diagnostico = vdgDiagnostico(
        $tenant,
        $veiculo,
        $user
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnostico->id}/resolver"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'resolvido'
        );

    $diagnostico->refresh();

    expect($diagnostico->status)
        ->toBe('resolvido');

    expect($diagnostico->resolvido_em)
        ->not->toBeNull();

    expect($diagnostico->updated_by)
        ->toBe($user->id);
});

test('diagnostico de outro tenant nao pode ser resolvido', function () {
    $tenantA = vdgTenant(
        'Tenant Resolver Cross A',
        'tenant-resolver-cross-a'
    );

    $tenantB = vdgTenant(
        'Tenant Resolver Cross B',
        'tenant-resolver-cross-b'
    );

    $user = vdgFuncionario(
        $tenantA,
        'resolver.cross@diagnosticos.test'
    );

    $veiculoB = vdgVeiculo(
        $tenantB,
        'II-51-II'
    );

    $diagnosticoB = vdgDiagnostico(
        $tenantB,
        $veiculoB
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnosticoB->id}/resolver"
        )
        ->assertNotFound();

    expect(
        $diagnosticoB
            ->fresh()
            ->status
    )->toBe('aberto');
});

test('permissao visualizar permite consulta mas bloqueia criacao resolucao e ignorar', function () {
    $tenant = vdgTenant(
        'Tenant Diagnóstico Visualizar',
        'tenant-diagnostico-visualizar'
    );

    $user = vdgFuncionario(
        $tenant,
        'visualizar@diagnosticos.test',
        'visualizar'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'JJ-51-JJ'
    );

    $diagnostico = vdgDiagnostico(
        $tenant,
        $veiculo
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->getJson('/api/diagnosticos')
        ->assertOk();

    $this
        ->withHeaders(vdgHeaders())
        ->getJson(
            "/api/diagnosticos/{$diagnostico->id}"
        )
        ->assertOk();

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            '/api/diagnosticos',
            [
                'veiculo_id' => $veiculo->id,
                'fonte' => 'manual',
                'severidade' => 'media',
                'titulo' => 'Bloqueado',
            ]
        )
        ->assertForbidden();

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnostico->id}/ignorar"
        )
        ->assertForbidden();

    expect(
        $diagnostico
            ->fresh()
            ->status
    )->toBe('aberto');
});

test('gestor ignora diagnostico aberto', function () {
    $tenant = vdgTenant(
        'Tenant Ignorar Diagnóstico',
        'tenant-ignorar-diagnostico'
    );

    $user = vdgFuncionario(
        $tenant,
        'ignorar@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'KK-51-KK'
    );

    $diagnostico = vdgDiagnostico(
        $tenant,
        $veiculo,
        $user
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnostico->id}/ignorar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'ignorado'
        );

    $diagnostico->refresh();

    expect($diagnostico->status)
        ->toBe('ignorado');

    expect($diagnostico->resolvido_em)
        ->toBeNull();

    expect($diagnostico->updated_by)
        ->toBe($user->id);
});

test('ignorar diagnostico novamente e idempotente', function () {
    $tenant = vdgTenant(
        'Tenant Ignorar Idempotente',
        'tenant-ignorar-idempotente'
    );

    $user = vdgFuncionario(
        $tenant,
        'ignorar.idempotente@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'LL-51-LL'
    );

    $diagnostico = vdgDiagnostico(
        $tenant,
        $veiculo,
        $user,
        [
            'status' => 'ignorado',
        ]
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnostico->id}/ignorar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'ignorado'
        );

    expect(
        $diagnostico
            ->fresh()
            ->status
    )->toBe('ignorado');
});

test('diagnostico resolvido nao pode ser ignorado', function () {
    $tenant = vdgTenant(
        'Tenant Resolvido Não Ignorar',
        'tenant-resolvido-nao-ignorar'
    );

    $user = vdgFuncionario(
        $tenant,
        'resolvido.nao.ignorar@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'MM-51-MM'
    );

    $diagnostico = vdgDiagnostico(
        $tenant,
        $veiculo,
        $user,
        [
            'status' => 'resolvido',
        ]
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnostico->id}/ignorar"
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'status'
        );

    expect(
        $diagnostico
            ->fresh()
            ->status
    )->toBe('resolvido');
});

test('diagnostico ignorado nao pode ser resolvido', function () {
    $tenant = vdgTenant(
        'Tenant Ignorado Não Resolver',
        'tenant-ignorado-nao-resolver'
    );

    $user = vdgFuncionario(
        $tenant,
        'ignorado.nao.resolver@diagnosticos.test'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'NN-51-NN'
    );

    $diagnostico = vdgDiagnostico(
        $tenant,
        $veiculo,
        $user,
        [
            'status' => 'ignorado',
        ]
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnostico->id}/resolver"
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'status'
        );

    expect(
        $diagnostico
            ->fresh()
            ->status
    )->toBe('ignorado');
});

test('diagnostico de outro tenant nao pode ser ignorado', function () {
    $tenantA = vdgTenant(
        'Tenant Ignorar Cross A',
        'tenant-ignorar-cross-a'
    );

    $tenantB = vdgTenant(
        'Tenant Ignorar Cross B',
        'tenant-ignorar-cross-b'
    );

    $user = vdgFuncionario(
        $tenantA,
        'ignorar.cross@diagnosticos.test'
    );

    $veiculoB = vdgVeiculo(
        $tenantB,
        'OO-51-OO'
    );

    $diagnosticoB = vdgDiagnostico(
        $tenantB,
        $veiculoB
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            "/api/diagnosticos/{$diagnosticoB->id}/ignorar"
        )
        ->assertNotFound();

    expect(
        $diagnosticoB
            ->fresh()
            ->status
    )->toBe('aberto');
});

test('listagem permite filtrar diagnosticos ignorados', function () {
    $tenant = vdgTenant(
        'Tenant Filtro Ignorado',
        'tenant-filtro-ignorado'
    );

    $user = vdgFuncionario(
        $tenant,
        'filtro.ignorado@diagnosticos.test',
        'visualizar'
    );

    $veiculo = vdgVeiculo(
        $tenant,
        'PP-51-PP'
    );

    $ignorado = vdgDiagnostico(
        $tenant,
        $veiculo,
        null,
        [
            'status' => 'ignorado',
            'titulo' => 'Diagnóstico ignorado',
        ]
    );

    vdgDiagnostico(
        $tenant,
        $veiculo,
        null,
        [
            'status' => 'aberto',
            'titulo' => 'Diagnóstico aberto',
        ]
    );

    vdgLogin($this, $user);

    $this
        ->withHeaders(vdgHeaders())
        ->getJson(
            '/api/diagnosticos?status=ignorado'
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data'
        )
        ->assertJsonPath(
            'data.0.id',
            $ignorado->id
        )
        ->assertJsonPath(
            'data.0.status',
            'ignorado'
        );
});



test('nao existe endpoint publico de ingestao de telemetria', function () {
    $this
        ->withHeaders(vdgHeaders())
        ->postJson(
            '/api/diagnosticos/ingest',
            [
                'fonte' => 'tesla',
                'external_id' => 'telemetry-001',
            ]
        )
        ->assertMethodNotAllowed();
});
