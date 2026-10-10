<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function templateTextHeaders(): array
{
    return [
        'Origin' =>
            'http://localhost:8000',

        'Referer' =>
            'http://localhost:8000/',

        'Accept' =>
            'application/json',
    ];
}

function templateTextTenant(
    string $nome =
        'Tenant Templates'
): Tenant {
    return Tenant::create([
        'nome' => $nome,

        'slug' =>
            'tenant-' .
            strtolower(
                preg_replace(
                    '/[^a-z0-9]+/i',
                    '-',
                    $nome
                )
            ),

        'ativo' => true,
    ]);
}

function templateTextUser(
    Tenant $tenant,
    string $nivel =
        'configurar'
): User {
    $user =
        User::factory()
            ->create([
                'email' =>
                    uniqid(
                        'template.',
                        true
                    ) .
                    '@frotapro.test',

                'password' =>
                    Hash::make(
                        'SenhaTeste123!'
                    ),

                'ativo' => true,
            ]);

    TenantUser::create([
        'tenant_id' =>
            $tenant->id,

        'user_id' =>
            $user->id,

        'status' =>
            'ativo',

        'principal' =>
            true,
    ]);

    $role =
        Role::firstOrCreate(
            [
                'codigo' =>
                    'funcionario',
            ],
            [
                'nome' =>
                    'Funcionário',

                'sistema' =>
                    true,
            ]
        );

    UserRole::create([
        'user_id' =>
            $user->id,

        'role_id' =>
            $role->id,

        'tenant_id' =>
            $tenant->id,
    ]);

    $permission =
        Permission::firstOrCreate(
            [
                'codigo' =>
                    'templates',
            ],
            [
                'modulo' =>
                    'templates',

                'nome' =>
                    'Templates',
            ]
        );

    RolePermission::updateOrCreate(
        [
            'role_id' =>
                $role->id,

            'permission_id' =>
                $permission->id,
        ],
        [
            'nivel' =>
                $nivel,
        ]
    );

    return $user;
}

function templateTextLogin(
    $test,
    User $user
): void {
    $test->postJson(
        '/login',
        [
            'email' =>
                $user->email,

            'password' =>
                'SenhaTeste123!',
        ]
    )->assertOk();
}

test('preview de texto exige autenticação', function () {
    $this->withHeaders(
        templateTextHeaders()
    )
        ->postJson(
            '/api/templates-contrato/texto/preview',
            [
                'conteudo' =>
                    'CONTRATO {{NOME_DO_MOTORISTA}}',
            ]
        )
        ->assertUnauthorized();
});

test('preview normaliza aliases antigos para campos canónicos', function () {
    $tenant =
        templateTextTenant(
            'Aliases'
        );

    $user =
        templateTextUser(
            $tenant
        );

    templateTextLogin(
        $this,
        $user
    );

    $content = <<<'TEXT'
DENÚNCIA

{{NOME_DA_EMPRESA}},
com sede em {{MORADA_DA_ EMPRESA}},
NIF {{NIF_DA_EMPRESA}},
representada por {{NOME_DO_GERENTE_DA_EMPRESA}}.

{{NOME_DO_MOTORISTA}},
NIF {{NIF_DO_MOTORISTA}}.

Contrato iniciado em {{DATA_INICIO_CONTRATO}}
e terminado em {{DATA_FIM _CONTRATO}}.

{{ASSINATURA_EMPRESA}}
{{ASSINATURA_MOTORISTA}}
TEXT;

    $response =
        $this->withHeaders(
            templateTextHeaders()
        )
            ->postJson(
                '/api/templates-contrato/texto/preview',
                [
                    'conteudo' =>
                        $content,
                ]
            )
            ->assertOk();

    expect(
        $response->json(
            'data.conteudo_parametrizado'
        )
    )
        ->toContain(
            '{{EMPRESA_NOME_EMPRESA}}'
        )
        ->toContain(
            '{{EMPRESA_ENDERECO_COMPLETO}}'
        )
        ->toContain(
            '{{EMPRESA_NIF}}'
        )
        ->toContain(
            '{{EMPRESA_NOME_GERENTE}}'
        )
        ->toContain(
            '{{MOTORISTA_NOME_COMPLETO}}'
        )
        ->toContain(
            '{{MOTORISTA_NIF}}'
        )
        ->toContain(
            '{{DATA_INICIO}}'
        )
        ->toContain(
            '{{DATA_FIM}}'
        )
        ->toContain(
            '{{ASSINATURA_EMPRESA}}'
        )
        ->toContain(
            '{{ASSINATURA_MOTORISTA}}'
        );

    expect(
        collect(
            $response->json(
                'data.campos_detectados'
            )
        )->pluck(
            'name'
        )->all()
    )->toContain(
        'EMPRESA_NOME_EMPRESA',
        'EMPRESA_ENDERECO_COMPLETO',
        'MOTORISTA_NOME_COMPLETO',
        'DATA_INICIO',
        'DATA_FIM'
    );

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('preview recupera placeholder com chaveta de fechamento ausente', function () {
    $tenant =
        templateTextTenant(
            'Placeholder Malformado'
        );

    $user =
        templateTextUser(
            $tenant
        );

    templateTextLogin(
        $this,
        $user
    );

    $response =
        $this->withHeaders(
            templateTextHeaders()
        )
            ->postJson(
                '/api/templates-contrato/texto/preview',
                [
                    'conteudo' =>
                        'Motorista portador do documento nº {{NUMERO_DO_DOCUMENTO_DE_IDENTIFICACAO_MOTORISTA}, válido em Portugal.',
                ]
            )
            ->assertOk();

    expect(
        $response->json(
            'data.conteudo_parametrizado'
        )
    )->toContain(
        '{{MOTORISTA_NUMERO_DOCUMENTO}}'
    );

    expect(
        collect(
            $response->json(
                'data.warnings'
            )
        )->pluck(
            'code'
        )->all()
    )->toContain(
        'MALFORMED_PLACEHOLDER'
    );
});

test('preview limpa html legado e preserva os campos', function () {
    $tenant =
        templateTextTenant(
            'HTML Legado'
        );

    $user =
        templateTextUser(
            $tenant
        );

    templateTextLogin(
        $this,
        $user
    );

    $content = <<<'HTML'
CONTRATO
<span data-category="company">{{NOME_EMPRESA}}</span>
<span data-category="driver">{{NOME_MOTORISTA}}</span>
<span data-category="contract">{{DATA_INICIO_CONTRATO}}</span>
HTML;

    $response =
        $this->withHeaders(
            templateTextHeaders()
        )
            ->postJson(
                '/api/templates-contrato/texto/preview',
                [
                    'conteudo' =>
                        $content,
                ]
            )
            ->assertOk();

    expect(
        $response->json(
            'data.conteudo_parametrizado'
        )
    )
        ->not->toContain(
            '<span'
        )
        ->toContain(
            '{{EMPRESA_NOME_EMPRESA}}'
        )
        ->toContain(
            '{{MOTORISTA_NOME_COMPLETO}}'
        )
        ->toContain(
            '{{DATA_INICIO}}'
        );

    expect(
        collect(
            $response->json(
                'data.warnings'
            )
        )->pluck(
            'code'
        )->all()
    )->toContain(
        'HTML_CLEANED'
    );
});

test('preview reconhece dados preenchidos num contrato de prestação de serviços', function () {
    $tenant =
        templateTextTenant(
            'Prestação'
        );

    $user =
        templateTextUser(
            $tenant
        );

    templateTextLogin(
        $this,
        $user
    );

    $content = <<<'TEXT'
CONTRATO DE PRESTAÇÃO DE SERVIÇOS ENTRE visao seleta lda., sociedade unipessoal, com sede na Rua Pé de Mouro, com o capital social de €5000.00, matriculada na Conservatória do Registo Comercial sob o número único de pessoa coletiva 517563193, neste ato representada por joao gustavo coutinho ferreira, na qualidade de gerente, com poderes para o presente ato.

E Motorista Teste, residente em Lisboa, contribuinte fiscal nº 999999901.

O presente contrato tem início no dia 2026-10-08 e termina a 2027-10-08, com duração de 6 meses.

A Primeira Contratante pagará ao Segundo Contratante a quantia mensal, deduzindo 10%, face a custos e despesas.
TEXT;

    $response =
        $this->withHeaders(
            templateTextHeaders()
        )
            ->postJson(
                '/api/templates-contrato/texto/preview',
                [
                    'conteudo' =>
                        $content,
                ]
            )
            ->assertOk();

    $parameterized =
        $response->json(
            'data.conteudo_parametrizado'
        );

    expect(
        $parameterized
    )
        ->toContain(
            '{{EMPRESA_NOME_EMPRESA}}'
        )
        ->toContain(
            '{{EMPRESA_NIF}}'
        )
        ->toContain(
            '{{EMPRESA_NOME_GERENTE}}'
        )
        ->toContain(
            '{{MOTORISTA_NOME_COMPLETO}}'
        )
        ->toContain(
            '{{MOTORISTA_NIF}}'
        )
        ->toContain(
            '{{DATA_INICIO}}'
        )
        ->toContain(
            '{{DATA_FIM}}'
        )
        ->toContain(
            '{{DURACAO_CONTRATO}}'
        )
        ->toContain(
            '{{PERCENTAGEM_CONTRATO}}'
        );

    expect(
        collect(
            $response->json(
                'data.warnings'
            )
        )->pluck(
            'code'
        )->all()
    )->toContain(
        'DATE_DURATION_MISMATCH'
    );

    expect(
        $response->json(
            'data.campos_mapeados.MOTORISTA_NOME_COMPLETO.campo'
        )
    )->toBe(
        'motorista.nome_completo'
    );

    expect(
        $response->json(
            'data.campos_mapeados.PERCENTAGEM_CONTRATO.tipo'
        )
    )->toBe(
        'manual'
    );
});

test('preview reconhece veículo e valores num contrato de aluguer preenchido', function () {
    $tenant =
        templateTextTenant(
            'Aluguer'
        );

    $user =
        templateTextUser(
            $tenant
        );

    templateTextLogin(
        $this,
        $user
    );

    $content = <<<'TEXT'
CONTRATO DE ALUGUER DE VEÍCULOS

O veículo automóvel com a matrícula AA-AA-AA, com a data da primeira matrícula em 2026-01-20, da marca tesla, modelo model 3, chassis 23234345345GT6, com a cilindrada de 1600, e a potência de 120, combustível Elétrico, com lotação de 5 lugares, ligeiro com 4 portas, cor branco,

O presente Contrato tem início no dia 2026-10-08 e termina a 2027-10-08, com duração de 12 meses.

O Locatário obriga-se a entregar uma caução no valor de €300.00 no ato da entrega do veículo.

O valor do aluguer é de €350.00 por semana.
TEXT;

    $response =
        $this->withHeaders(
            templateTextHeaders()
        )
            ->postJson(
                '/api/templates-contrato/texto/preview',
                [
                    'conteudo' =>
                        $content,
                ]
            )
            ->assertOk();

    $content =
        $response->json(
            'data.conteudo_parametrizado'
        );

    expect(
        $content
    )
        ->toContain(
            '{{VEICULO_MATRICULA}}'
        )
        ->toContain(
            '{{VEICULO_DATA_MATRICULA}}'
        )
        ->toContain(
            '{{VEICULO_MARCA}}'
        )
        ->toContain(
            '{{VEICULO_MODELO}}'
        )
        ->toContain(
            '{{VEICULO_CHASSI}}'
        )
        ->toContain(
            '{{VEICULO_CILINDRADA}}'
        )
        ->toContain(
            '{{VEICULO_POTENCIA}}'
        )
        ->toContain(
            '{{VEICULO_COMBUSTIVEL}}'
        )
        ->toContain(
            '{{VEICULO_LUGARES}}'
        )
        ->toContain(
            '{{VEICULO_PORTAS}}'
        )
        ->toContain(
            '{{VEICULO_COR}}'
        )
        ->toContain(
            '{{VALOR_CAUCAO}}'
        )
        ->toContain(
            '{{VALOR_SEMANAL}}'
        );

    expect(
        collect(
            $response->json(
                'data.warnings'
            )
        )
            ->where(
                'code',
                'DATE_DURATION_MISMATCH'
            )
            ->count()
    )->toBe(0);
});

test('preview de texto exige permissão configurar templates', function () {
    $tenant =
        templateTextTenant(
            'Permissão'
        );

    $user =
        templateTextUser(
            $tenant,
            'visualizar'
        );

    templateTextLogin(
        $this,
        $user
    );

    $this->withHeaders(
        templateTextHeaders()
    )
        ->postJson(
            '/api/templates-contrato/texto/preview',
            [
                'conteudo' =>
                    'CONTRATO {{NOME_DO_MOTORISTA}}',
            ]
        )
        ->assertForbidden();
});
