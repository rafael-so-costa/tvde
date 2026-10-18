<?php

use App\Models\ChecklistMedia;
use App\Models\ChecklistRecord;
use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function checklistMediaHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function checklistMediaTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome'=>$nome,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function checklistMediaUser(
    Tenant $tenant,
    string $email,
    string $nivel='configurar'
): User {
    $user=
        User::factory()->create([
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

    $role=
        Role::firstOrCreate(
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

    $permission=
        Permission::firstOrCreate(
            [
                'codigo'=>'checklist',
            ],
            [
                'modulo'=>'checklist',
                'nome'=>'Checklists',
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

function checklistMediaLogin(
    $test,
    User $user
): void {
    $test
        ->withHeaders(
            checklistMediaHeaders()
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

function checklistMediaRecord(
    Tenant $tenant,
    User $user,
    string $estado='rascunho'
): ChecklistRecord {
    $motorista=
        new Motorista([
            'nome_completo'=>
                'Motorista Evidência',
        ]);

    $motorista->tenant_id=
        $tenant->id;

    $motorista->save();

    $veiculo=
        new Veiculo([
            'matricula'=>
                'EV-10-26',

            'marca'=>'Tesla',
            'modelo'=>'Model 3',
        ]);

    $veiculo->tenant_id=
        $tenant->id;

    $veiculo->save();

    $record=
        new ChecklistRecord([
            'tipo'=>'entrega',
            'motorista_id'=>$motorista->id,
            'veiculo_id'=>$veiculo->id,
            'data_operacao'=>'2026-10-17',
            'quilometragem'=>10000,
            'nivel_combustivel'=>'cheio',
        ]);

    $record->tenant_id=
        $tenant->id;

    $record->estado=
        $estado;

    $record->realizado_por=
        $user->id;

    $record->motorista_nome_snapshot=
        $motorista->nome_completo;

    $record->matricula_snapshot=
        $veiculo->matricula;

    $record->modelo_snapshot=
        'Tesla Model 3';

    if(
        $estado==='finalizado'
    ){
        $record->finalizado_em=
            now();
    }

    $record->save();

    return $record;
}

test(
    'rotas de evidencias exigem autenticacao',
    function(){
        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->getJson(
                '/api/checklists/00000000-0000-4000-8000-000000000001/media'
            )
            ->assertUnauthorized();
    }
);

test(
    'fotografia e guardada com hash e metadados da parte do veiculo',
    function(){
        Storage::fake('local');

        $tenant=
            checklistMediaTenant(
                'Frota Evidência Foto',
                'frota-evidencia-foto'
            );

        $user=
            checklistMediaUser(
                $tenant,
                'media.foto@frotapro.test'
            );

        $record=
            checklistMediaRecord(
                $tenant,
                $user
            );

        checklistMediaLogin(
            $this,
            $user
        );

        $response=
            $this
                ->withHeaders(
                    checklistMediaHeaders()
                )
                ->post(
                    "/api/checklists/{$record->id}/media",
                    [
                        'arquivo'=>
                            UploadedFile::fake()
                                ->create(
                                    'porta-esquerda.jpg',
                                    200,
                                    'image/jpeg'
                                ),

                        'contexto'=>'dano',

                        'titulo'=>
                            'Porta dianteira esquerda',

                        'metadados'=>[
                            'parte_id'=>'porta_de',

                            'parte_nome'=>
                                'Porta Dianteira Esquerda',

                            'vista'=>
                                'lateral_esquerda',

                            'dano_tipo'=>'riscado',
                        ],
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.tipo',
                    'foto'
                )
                ->assertJsonPath(
                    'data.contexto',
                    'dano'
                )
                ->assertJsonPath(
                    'data.metadados.parte_id',
                    'porta_de'
                );

        $media=
            ChecklistMedia::query()
                ->findOrFail(
                    $response->json(
                        'data.id'
                    )
                );

        expect(
            $media->tenant_id
        )->toBe(
            $tenant->id
        );

        expect(
            $media->checklist_record_id
        )->toBe(
            $record->id
        );

        expect(
            $media->uploaded_by
        )->toBe(
            $user->id
        );

        expect(
            $media->hash_arquivo
        )->toHaveLength(
            64
        );

        Storage::disk('local')
            ->assertExists(
                $media->arquivo_path
            );
    }
);

test(
    'video pode ser listado visualizado e descarregado',
    function(){
        Storage::fake('local');

        $tenant=
            checklistMediaTenant(
                'Frota Evidência Vídeo',
                'frota-evidencia-video'
            );

        $user=
            checklistMediaUser(
                $tenant,
                'media.video@frotapro.test'
            );

        $record=
            checklistMediaRecord(
                $tenant,
                $user
            );

        checklistMediaLogin(
            $this,
            $user
        );

        $response=
            $this
                ->withHeaders(
                    checklistMediaHeaders()
                )
                ->post(
                    "/api/checklists/{$record->id}/media",
                    [
                        'arquivo'=>
                            UploadedFile::fake()
                                ->create(
                                    'volta-veiculo.mp4',
                                    512,
                                    'video/mp4'
                                ),

                        'contexto'=>'exterior',
                        'titulo'=>'Vídeo exterior',
                    ]
                )
                ->assertCreated()
                ->assertJsonPath(
                    'data.tipo',
                    'video'
                );

        $mediaId=
            $response->json(
                'data.id'
            );

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->getJson(
                "/api/checklists/{$record->id}/media"
            )
            ->assertOk()
            ->assertJsonCount(
                1,
                'data'
            )
            ->assertJsonPath(
                'data.0.id',
                $mediaId
            );

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->get(
                "/api/checklists/{$record->id}/media/{$mediaId}/arquivo"
            )
            ->assertOk();

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->get(
                "/api/checklists/{$record->id}/media/{$mediaId}/download"
            )
            ->assertOk();
    }
);

test(
    'evidencias sao isoladas entre tenants',
    function(){
        Storage::fake('local');

        $tenantA=
            checklistMediaTenant(
                'Frota Media A',
                'frota-media-a'
            );

        $tenantB=
            checklistMediaTenant(
                'Frota Media B',
                'frota-media-b'
            );

        $userA=
            checklistMediaUser(
                $tenantA,
                'media.a@frotapro.test'
            );

        $userB=
            User::factory()->create();

        $recordB=
            checklistMediaRecord(
                $tenantB,
                $userB
            );

        checklistMediaLogin(
            $this,
            $userA
        );

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->getJson(
                "/api/checklists/{$recordB->id}/media"
            )
            ->assertNotFound();

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->post(
                "/api/checklists/{$recordB->id}/media",
                [
                    'arquivo'=>
                        UploadedFile::fake()
                            ->create(
                                'ataque.jpg',
                                100,
                                'image/jpeg'
                            ),
                ]
            )
            ->assertNotFound();
    }
);

test(
    'permissao visualizar permite leitura mas bloqueia upload',
    function(){
        Storage::fake('local');

        $tenant=
            checklistMediaTenant(
                'Frota Media Read',
                'frota-media-read'
            );

        $user=
            checklistMediaUser(
                $tenant,
                'media.read@frotapro.test',
                'visualizar'
            );

        $record=
            checklistMediaRecord(
                $tenant,
                $user
            );

        checklistMediaLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->getJson(
                "/api/checklists/{$record->id}/media"
            )
            ->assertOk();

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->post(
                "/api/checklists/{$record->id}/media",
                [
                    'arquivo'=>
                        UploadedFile::fake()
                            ->create(
                                'bloqueado.jpg',
                                100,
                                'image/jpeg'
                            ),
                ]
            )
            ->assertForbidden();
    }
);

test(
    'checklist finalizado nao aceita novas evidencias',
    function(){
        Storage::fake('local');

        $tenant=
            checklistMediaTenant(
                'Frota Media Final',
                'frota-media-final'
            );

        $user=
            checklistMediaUser(
                $tenant,
                'media.final@frotapro.test'
            );

        $record=
            checklistMediaRecord(
                $tenant,
                $user,
                'finalizado'
            );

        checklistMediaLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->post(
                "/api/checklists/{$record->id}/media",
                [
                    'arquivo'=>
                        UploadedFile::fake()
                            ->create(
                                'finalizado.jpg',
                                100,
                                'image/jpeg'
                            ),
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'checklist'
            );
    }
);

test(
    'eliminar evidencia remove registo e ficheiro',
    function(){
        Storage::fake('local');

        $tenant=
            checklistMediaTenant(
                'Frota Media Delete',
                'frota-media-delete'
            );

        $user=
            checklistMediaUser(
                $tenant,
                'media.delete@frotapro.test'
            );

        $record=
            checklistMediaRecord(
                $tenant,
                $user
            );

        checklistMediaLogin(
            $this,
            $user
        );

        $response=
            $this
                ->withHeaders(
                    checklistMediaHeaders()
                )
                ->post(
                    "/api/checklists/{$record->id}/media",
                    [
                        'arquivo'=>
                            UploadedFile::fake()
                                ->create(
                                    'apagar.jpg',
                                    100,
                                    'image/jpeg'
                                ),
                    ]
                )
                ->assertCreated();

        $media=
            ChecklistMedia::query()
                ->findOrFail(
                    $response->json(
                        'data.id'
                    )
                );

        $path=
            $media->arquivo_path;

        $this
            ->withHeaders(
                checklistMediaHeaders()
            )
            ->delete(
                "/api/checklists/{$record->id}/media/{$media->id}"
            )
            ->assertNoContent();

        $this->assertDatabaseMissing(
            'checklist_media',
            [
                'id'=>$media->id,
            ]
        );

        Storage::disk('local')
            ->assertMissing(
                $path
            );
    }
);