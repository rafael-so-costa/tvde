<?php

use App\Models\Documento;
use App\Models\DocumentoAcesso;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed(
        RoleSeeder::class
    );
});

function backofficeDocumentoHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function backofficeDocumentoTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function backofficeDocumentoSuperAdmin(): User
{
    $user=User::factory()->create([
        'email'=>'documentos.admin@frotapro.test',
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);

    $role=Role::query()
        ->where('codigo','super_admin')
        ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>null,
    ]);

    return $user;
}

function backofficeDocumentoGestor(
    Tenant $tenant
): User {
    $user=User::factory()->create([
        'email'=>'documentos.gestor@frotapro.test',
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $role=Role::query()
        ->where('codigo','admin_empresa')
        ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function backofficeDocumentoLogin(
    $test,
    User $user
): void {
    $test
        ->withHeaders(
            backofficeDocumentoHeaders()
        )
        ->postJson(
            '/login',
            [
                'email'=>$user->email,
                'password'=>'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function backofficeDocumentoRecord(
    Tenant $tenant,
    int $numero,
    string $origem,
    string $categoria,
    string $tipo,
    string $titulo,
    array $extra=[]
): Documento {
    $documento=new Documento(
        array_merge(
            [
                'numero_global'=>$numero,
                'codigo'=>$origem==='anexado'
                    ? 'A'.str_pad(
                        (string)$numero,
                        6,
                        '0',
                        STR_PAD_LEFT
                    )
                    : str_pad(
                        (string)$numero,
                        6,
                        '0',
                        STR_PAD_LEFT
                    ),
                'origem'=>$origem,
                'categoria'=>$categoria,
                'tipo'=>$tipo,
                'titulo'=>$titulo,
                'entidade_tipo'=>'teste',
                'entidade_id'=>(string)Str::uuid(),
                'status'=>'ativo',
            ],
            $extra
        )
    );

    $documento->tenant_id=$tenant->id;
    $documento->save();

    return $documento;
}

test(
    'backoffice documental exige autenticacao',
    function(){
        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos/resumo'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador que nao e super admin nao consulta base documental global',
    function(){
        $tenant=backofficeDocumentoTenant(
            'Frota Gestor',
            'frota-gestor-documentos'
        );

        $gestor=backofficeDocumentoGestor(
            $tenant
        );

        backofficeDocumentoLogin(
            $this,
            $gestor
        );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos'
            )
            ->assertForbidden();
    }
);

test(
    'super admin recebe resumo e metadados de todos os tenants',
    function(){
        $tenantA=backofficeDocumentoTenant(
            'Frota Alfa',
            'documentos-alfa'
        );

        $tenantB=backofficeDocumentoTenant(
            'Frota Beta',
            'documentos-beta'
        );

        backofficeDocumentoRecord(
            $tenantA,
            1001,
            'gerado',
            'contratos',
            'aluguer',
            'Contrato Alfa',
            [
                'arquivo_path'=>'documentos/alfa.pdf',
                'finalizado_em'=>now(),
            ]
        );

        backofficeDocumentoRecord(
            $tenantA,
            1002,
            'anexado',
            'motoristas',
            'registo_criminal',
            'Registo criminal Alfa'
        );

        backofficeDocumentoRecord(
            $tenantB,
            1003,
            'gerado',
            'declaracoes',
            'declaracao',
            'Declaração Beta'
        );

        $admin=backofficeDocumentoSuperAdmin();

        backofficeDocumentoLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos/resumo'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.total',
                3
            )
            ->assertJsonPath(
                'data.gerados',
                2
            )
            ->assertJsonPath(
                'data.anexados',
                1
            )
            ->assertJsonPath(
                'data.com_arquivo',
                1
            )
            ->assertJsonPath(
                'data.finalizados',
                1
            )
            ->assertJsonPath(
                'data.tenants',
                2
            );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos/meta'
            )
            ->assertOk()
            ->assertJsonFragment([
                'value'=>$tenantA->id,
                'label'=>'Frota Alfa',
                'total'=>2,
            ])
            ->assertJsonFragment([
                'value'=>$tenantB->id,
                'label'=>'Frota Beta',
                'total'=>1,
            ])
            ->assertJsonFragment([
                'value'=>'contratos',
                'label'=>'Contratos',
                'total'=>1,
            ]);
    }
);

test(
    'super admin pesquisa por numero global e filtra por tenant',
    function(){
        $tenantA=backofficeDocumentoTenant(
            'Frota Pesquisa A',
            'documentos-pesquisa-a'
        );

        $tenantB=backofficeDocumentoTenant(
            'Frota Pesquisa B',
            'documentos-pesquisa-b'
        );

        backofficeDocumentoRecord(
            $tenantA,
            2001,
            'gerado',
            'contratos',
            'aluguer',
            'Documento 2001'
        );

        $target=backofficeDocumentoRecord(
            $tenantB,
            2002,
            'anexado',
            'motoristas',
            'registo_criminal',
            'Documento procurado'
        );

        $admin=backofficeDocumentoSuperAdmin();

        backofficeDocumentoLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos?'.
                http_build_query([
                    'q'=>'2002',
                ])
            )
            ->assertOk()
            ->assertJsonPath(
                'total',
                1
            )
            ->assertJsonPath(
                'data.0.id',
                $target->id
            )
            ->assertJsonPath(
                'data.0.numero_global',
                2002
            );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                '/api/backoffice/documentos?'.
                http_build_query([
                    'tenant_id'=>$tenantA->id,
                ])
            )
            ->assertOk()
            ->assertJsonPath(
                'total',
                1
            )
            ->assertJsonPath(
                'data.0.tenant.id',
                $tenantA->id
            );
    }
);

test(
    'super admin consulta ficheiro e acesso fica auditado como backoffice',
    function(){
        Storage::fake(
            'local'
        );

        $tenant=backofficeDocumentoTenant(
            'Frota Auditoria Global',
            'documentos-auditoria-global'
        );

        $path=
            'documentos/teste/'.
            Str::uuid().
            '.pdf';

        Storage::disk('local')->put(
            $path,
            '%PDF-1.4 documento global'
        );

        $documento=backofficeDocumentoRecord(
            $tenant,
            3001,
            'gerado',
            'contratos',
            'aluguer',
            'Documento auditado',
            [
                'arquivo_path'=>$path,
                'arquivo_nome'=>'documento-global.pdf',
                'arquivo_mime'=>'application/pdf',
                'arquivo_tamanho'=>24,
                'hash_arquivo'=>hash(
                    'sha256',
                    '%PDF-1.4 documento global'
                ),
            ]
        );

        $admin=backofficeDocumentoSuperAdmin();

        backofficeDocumentoLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->getJson(
                "/api/backoffice/documentos/{$documento->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.numero_global',
                3001
            )
            ->assertJsonPath(
                'data.tenant.id',
                $tenant->id
            );

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->get(
                "/api/backoffice/documentos/{$documento->id}/arquivo"
            )
            ->assertOk();

        $this
            ->withHeaders(
                backofficeDocumentoHeaders()
            )
            ->get(
                "/api/backoffice/documentos/{$documento->id}/download"
            )
            ->assertOk();

        expect(
            DocumentoAcesso::query()
                ->where(
                    'documento_id',
                    $documento->id
                )
                ->where(
                    'user_id',
                    $admin->id
                )
                ->where(
                    'contexto',
                    'backoffice'
                )
                ->whereNull(
                    'tenant_context_id'
                )
                ->count()
        )->toBe(3);
    }
);