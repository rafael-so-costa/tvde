<?php

use App\Models\Documento;
use App\Models\DocumentoAcesso;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function documentoHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',

        'Referer' => 'http://localhost:8000/',

        'Accept' => 'application/json',
    ];
}

function documentoTenant(
    string $name,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $name,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function documentoUser(
    Tenant $tenant,
    string $email,
    ?string $permissionLevel = 'visualizar'
): User {
    $user =
        User::factory()
            ->create([
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

    $role =
        Role::firstOrCreate(
            [
                'codigo' => 'funcionario',
            ],
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

    if (
        $permissionLevel !==
        null
    ) {
        $permission =
            Permission::firstOrCreate(
                [
                    'codigo' => 'documentos',
                ],
                [
                    'modulo' => 'documentos',

                    'nome' => 'Documentos',
                ]
            );

        RolePermission::updateOrCreate(
            [
                'role_id' => $role->id,

                'permission_id' => $permission->id,
            ],
            [
                'nivel' => $permissionLevel,
            ]
        );
    }

    return $user;
}

function documentoLogin(
    $test,
    User $user
): void {
    $test
        ->withHeaders(
            documentoHeaders()
        )
        ->postJson(
            '/login',
            [
                'email' => $user->email,
                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function documentoRecord(
    Tenant $tenant,
    int $number,
    string $origem,
    string $categoria,
    string $tipo,
    string $titulo,
    array $extra = []
): Documento {
    $documento =
        new Documento(
            array_merge(
                [
                    'numero_global' => $number,

                    'codigo' => (
                        $origem ===
                        'anexado'
                            ? 'A'
                            : 'G'
                    ).
                        str_pad(
                            (string) $number,
                            6,
                            '0',
                            STR_PAD_LEFT
                        ),

                    'origem' => $origem,

                    'categoria' => $categoria,

                    'tipo' => $tipo,

                    'titulo' => $titulo,

                    'entidade_tipo' => 'teste',

                    'entidade_id' => (string) Str::uuid(),

                    'status' => 'ativo',
                ],
                $extra
            )
        );

    $documento->tenant_id =
        $tenant->id;

    $documento->save();

    return $documento;
}

test(
    'central de documentos exige autenticacao',
    function () {
        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                '/api/documentos'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                '/api/documentos/resumo'
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador sem permissao nao consulta documentos',
    function () {
        $tenant =
            documentoTenant(
                'Tenant sem documentos',
                'tenant-sem-documentos'
            );

        $user =
            documentoUser(
                $tenant,
                'sem.documentos@frotapro.test',
                null
            );

        documentoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                '/api/documentos'
            )
            ->assertForbidden();
    }
);

test(
    'listagem isola tenant e aplica pesquisa e filtros',
    function () {
        $tenantA =
            documentoTenant(
                'Frota A',
                'documentos-frota-a'
            );

        $tenantB =
            documentoTenant(
                'Frota B',
                'documentos-frota-b'
            );

        $user =
            documentoUser(
                $tenantA,
                'documentos.lista@frotapro.test'
            );

        documentoRecord(
            $tenantA,
            1,
            'gerado',
            'contratos',
            'aluguer',
            'Contrato de aluguer'
        );

        $target =
            documentoRecord(
                $tenantA,
                2,
                'anexado',
                'motoristas',
                'registo_criminal',
                'Registo criminal João'
            );

        documentoRecord(
            $tenantB,
            3,
            'anexado',
            'motoristas',
            'registo_criminal',
            'Registo criminal outro tenant'
        );

        documentoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                '/api/documentos?'.
                http_build_query([
                    'origem' => 'anexado',

                    'categoria' => 'motoristas',

                    'q' => 'João',
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
                'data.0.codigo',
                'A000002'
            );
    }
);

test(
    'resumo e metadados consideram apenas tenant atual',
    function () {
        $tenantA =
            documentoTenant(
                'Frota A',
                'documentos-meta-a'
            );

        $tenantB =
            documentoTenant(
                'Frota B',
                'documentos-meta-b'
            );

        $user =
            documentoUser(
                $tenantA,
                'documentos.meta@frotapro.test'
            );

        documentoRecord(
            $tenantA,
            10,
            'gerado',
            'contratos',
            'aluguer',
            'Contrato',
            [
                'arquivo_path' => 'docs/contrato.pdf',

                'arquivo_nome' => 'contrato.pdf',

                'finalizado_em' => now(),
            ]
        );

        documentoRecord(
            $tenantA,
            11,
            'anexado',
            'motoristas',
            'registo_criminal',
            'Registo criminal'
        );

        documentoRecord(
            $tenantB,
            12,
            'gerado',
            'contratos',
            'aluguer',
            'Documento B'
        );

        documentoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                '/api/documentos/resumo'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.total',
                2
            )
            ->assertJsonPath(
                'data.gerados',
                1
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
            );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                '/api/documentos/meta'
            )
            ->assertOk()
            ->assertJsonFragment([
                'value' => 'contratos',

                'label' => 'Contratos',

                'total' => 1,
            ])
            ->assertJsonFragment([
                'value' => 'motoristas',

                'label' => 'Motoristas',

                'total' => 1,
            ]);
    }
);

test(
    'detalhe e ficheiros de outro tenant nao podem ser consultados',
    function () {
        $tenantA =
            documentoTenant(
                'Frota A',
                'documentos-isolamento-a'
            );

        $tenantB =
            documentoTenant(
                'Frota B',
                'documentos-isolamento-b'
            );

        $user =
            documentoUser(
                $tenantA,
                'documentos.isolamento@frotapro.test'
            );

        $other =
            documentoRecord(
                $tenantB,
                20,
                'gerado',
                'contratos',
                'aluguer',
                'Contrato outro tenant',
                [
                    'arquivo_path' => 'docs/outro.pdf',

                    'arquivo_nome' => 'outro.pdf',
                ]
            );

        documentoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                "/api/documentos/{$other->id}"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->get(
                "/api/documentos/{$other->id}/arquivo"
            )
            ->assertNotFound();
    }
);

test(
    'visualizacao de metadados e ficheiro e download ficam auditados',
    function () {
        Storage::fake(
            'local'
        );

        $tenant =
            documentoTenant(
                'Frota Auditoria',
                'documentos-auditoria'
            );

        $user =
            documentoUser(
                $tenant,
                'documentos.auditoria@frotapro.test'
            );

        $path =
            'documentos/teste/'.
            Str::uuid().
            '.pdf';

        Storage::disk(
            'local'
        )->put(
            $path,
            '%PDF-1.4 teste'
        );

        $documento =
            documentoRecord(
                $tenant,
                30,
                'gerado',
                'contratos',
                'aluguer',
                'Contrato auditado',
                [
                    'arquivo_path' => $path,

                    'arquivo_nome' => 'contrato-auditado.pdf',

                    'arquivo_mime' => 'application/pdf',

                    'arquivo_tamanho' => 14,

                    'hash_arquivo' => hash(
                        'sha256',
                        '%PDF-1.4 teste'
                    ),
                ]
            );

        documentoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->getJson(
                "/api/documentos/{$documento->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.codigo',
                'G000030'
            );

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->get(
                "/api/documentos/{$documento->id}/arquivo"
            )
            ->assertOk();

        $this
            ->withHeaders(
                documentoHeaders()
            )
            ->get(
                "/api/documentos/{$documento->id}/download"
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
                    $user->id
                )
                ->where(
                    'tenant_context_id',
                    $tenant->id
                )
                ->where(
                    'acao',
                    'visualizar_metadados'
                )
                ->count()
        )->toBe(1);

        expect(
            DocumentoAcesso::query()
                ->where(
                    'documento_id',
                    $documento->id
                )
                ->where(
                    'acao',
                    'visualizar_arquivo'
                )
                ->count()
        )->toBe(1);

        expect(
            DocumentoAcesso::query()
                ->where(
                    'documento_id',
                    $documento->id
                )
                ->where(
                    'acao',
                    'download'
                )
                ->count()
        )->toBe(1);
    }
);
