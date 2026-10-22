<?php

use App\Models\Contrato;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function previewHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function previewTenant(): Tenant
{
    return Tenant::create([
        'nome'=>'Tenant Preview',
        'slug'=>'tenant-preview',
        'ativo'=>true,
    ]);
}

function previewUser(
    Tenant $tenant
): User {
    $user=
        User::factory()->create([
            'email'=>
                'preview@frotapro.test',

            'password'=>
                Hash::make(
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

    $role=
        Role::firstOrCreate(
            [
                'codigo'=>
                    'funcionario',
            ],
            [
                'nome'=>
                    'Funcionário',

                'sistema'=>true,
            ]
        );

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    $permission=
        Permission::firstOrCreate(
            [
                'codigo'=>
                    'contratos',
            ],
            [
                'modulo'=>
                    'contratos',

                'nome'=>
                    'Contratos',
            ]
        );

    RolePermission::updateOrCreate(
        [
            'role_id'=>$role->id,
            'permission_id'=>$permission->id,
        ],
        [
            'nivel'=>'configurar',
        ]
    );

    return $user;
}

function previewLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email'=>$user->email,
                'password'=>'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

test(
    'preview de contrato exige autenticacao',
    function(){
        $this
            ->withHeaders(
                previewHeaders()
            )
            ->postJson(
                '/api/contratos/preview',
                []
            )
            ->assertUnauthorized();
    }
);

test(
    'preview usa documento formal sem persistir contrato',
    function(){
        $tenant=
            previewTenant();

        $user=
            previewUser(
                $tenant
            );

        $template=
            new TemplateContrato([
                'nome'=>
                    'Contrato Preview',

                'tipo_arquivo'=>
                    'txt',

                'conteudo_original'=>
                    "CONTRATO DE TESTE\n\nMotorista: {{MOTORISTA_NOME_COMPLETO}}\nMatrícula: {{VEICULO_MATRICULA}}\n\nCLÁUSULA PRIMEIRA\nObjeto\n\n1. O presente documento destina-se a teste.",
            ]);

        $template->tenant_id=
            $tenant->id;

        $template->save();

        $motorista=
            new Motorista([
                'nome_completo'=>
                    'Motorista Preview',

                'email'=>
                    'motorista.preview@teste.pt',
            ]);

        $motorista->tenant_id=
            $tenant->id;

        $motorista->save();

        $veiculo=
            new Veiculo([
                'matricula'=>
                    'AA-10-BB',

                'marca'=>'Tesla',
                'modelo'=>'Model 3',
            ]);

        $veiculo->tenant_id=
            $tenant->id;

        $veiculo->save();

        previewLogin(
            $this,
            $user
        );

        $response=
            $this
                ->withHeaders(
                    previewHeaders()
                )
                ->postJson(
                    '/api/contratos/preview',
                    [
                        'template_id'=>
                            $template->id,

                        'tipo'=>
                            'aluguer',

                        'motorista_id'=>
                            $motorista->id,

                        'veiculo_id'=>
                            $veiculo->id,

                        'data_inicio'=>
                            '2026-10-20',
                    ]
                )
                ->assertOk();

        $html=
            $response->json(
                'data.html'
            );

        expect($html)
            ->toContain(
                'preview-mode'
            )
            ->toContain(
                'DejaVu Serif'
            )
            ->toContain(
                'CONTRATO DE TESTE'
            )
            ->toContain(
                'Motorista Preview'
            )
            ->toContain(
                'AA-10-BB'
            )
            ->toContain(
                'clause-title'
            );

        expect(
            Contrato::query()
                ->count()
        )->toBe(0);
    }
);

test(
    'preview nao aceita entidades de outro tenant',
    function(){
        $tenant=
            previewTenant();

        $other=
            Tenant::create([
                'nome'=>
                    'Outro Tenant',

                'slug'=>
                    'outro-tenant-preview',

                'ativo'=>true,
            ]);

        $user=
            previewUser(
                $tenant
            );

        $template=
            new TemplateContrato([
                'nome'=>
                    'Template Seguro',

                'tipo_arquivo'=>
                    'txt',

                'conteudo_original'=>
                    'CONTRATO SEGURO',
            ]);

        $template->tenant_id=
            $tenant->id;

        $template->save();

        $motorista=
            new Motorista([
                'nome_completo'=>
                    'Motorista Externo',
            ]);

        $motorista->tenant_id=
            $other->id;

        $motorista->save();

        previewLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                previewHeaders()
            )
            ->postJson(
                '/api/contratos/preview',
                [
                    'template_id'=>
                        $template->id,

                    'tipo'=>'aluguer',

                    'motorista_id'=>
                        $motorista->id,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'motorista_id'
            );

        expect(
            Contrato::query()
                ->count()
        )->toBe(0);
    }
);
