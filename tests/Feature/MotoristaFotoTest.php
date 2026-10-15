<?php

use App\Models\Motorista;
use App\Models\Permission;
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

function motoristaFotoHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function motoristaFotoTenant(
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => 'Tenant Foto',
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function motoristaFotoUser(
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

    $role = Role::create([
        'codigo' => 'funcionario-'.
            $user->id,
        'nome' => 'Funcionário',
        'sistema' => false,
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $permission = Permission::firstOrCreate(
        [
            'codigo' => 'motoristas',
        ],
        [
            'modulo' => 'motoristas',
            'nome' => 'Motoristas',
        ]
    );

    RolePermission::create([
        'role_id' => $role->id,
        'permission_id' => $permission->id,
        'nivel' => $nivel,
    ]);

    return $user;
}

function motoristaFotoLogin(
    $test,
    User $user
): void {
    $test
        ->withHeaders(
            motoristaFotoHeaders()
        )
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

function motoristaFotoDriver(
    Tenant $tenant
): Motorista {
    $motorista = new Motorista([
        'nome_completo' => 'Motorista Foto',
    ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->sincronizarCadastro();
    $motorista->save();

    return $motorista;
}

test(
    'frota pode anexar fotografia privada ao motorista',
    function () {
        Storage::fake('local');

        $tenant =
            motoristaFotoTenant(
                'foto-upload'
            );

        $user =
            motoristaFotoUser(
                $tenant,
                'foto.upload@frotapro.test'
            );

        $motorista =
            motoristaFotoDriver(
                $tenant
            );

        motoristaFotoLogin(
            $this,
            $user
        );

        $foto =
            UploadedFile::fake()
                ->image(
                    'motorista.jpg',
                    600,
                    600
                );

        $response = $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => $foto,
                ]
            )
            ->assertOk();

        $motorista->refresh();

        $path =
            $motorista
                ->getRawOriginal(
                    'foto_perfil_url'
                );

        expect($path)
            ->not->toBeNull();

        Storage::disk('local')
            ->assertExists($path);

        $response
            ->assertJsonPath(
                'data.foto_perfil_url',
                route(
                    'motoristas.foto',
                    [
                        'id' => $motorista->id,
                    ]
                )
            );
    }
);

test(
    'substituir fotografia remove ficheiro anterior',
    function () {
        Storage::fake('local');

        $tenant =
            motoristaFotoTenant(
                'foto-replace'
            );

        $user =
            motoristaFotoUser(
                $tenant,
                'foto.replace@frotapro.test'
            );

        $motorista =
            motoristaFotoDriver(
                $tenant
            );

        motoristaFotoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => UploadedFile::fake()
                        ->image(
                            'primeira.jpg',
                            500,
                            500
                        ),
                ]
            )
            ->assertOk();

        $motorista->refresh();

        $oldPath =
            $motorista
                ->getRawOriginal(
                    'foto_perfil_url'
                );

        Storage::disk('local')
            ->assertExists($oldPath);

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => UploadedFile::fake()
                        ->image(
                            'segunda.png',
                            500,
                            500
                        ),
                ]
            )
            ->assertOk();

        $motorista->refresh();

        $newPath =
            $motorista
                ->getRawOriginal(
                    'foto_perfil_url'
                );

        expect($newPath)
            ->not->toBe($oldPath);

        Storage::disk('local')
            ->assertMissing($oldPath);

        Storage::disk('local')
            ->assertExists($newPath);
    }
);

test(
    'upload rejeita ficheiro que não seja imagem',
    function () {
        Storage::fake('local');

        $tenant =
            motoristaFotoTenant(
                'foto-invalid'
            );

        $user =
            motoristaFotoUser(
                $tenant,
                'foto.invalid@frotapro.test'
            );

        $motorista =
            motoristaFotoDriver(
                $tenant
            );

        motoristaFotoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => UploadedFile::fake()
                        ->create(
                            'foto.pdf',
                            100,
                            'application/pdf'
                        ),
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'foto'
            );
    }
);

test(
    'motorista pode visualizar mas não alterar a própria fotografia',
    function () {
        Storage::fake('local');

        $tenant =
            motoristaFotoTenant(
                'foto-self'
            );

        $self =
            User::factory()->create([
                'email' => 'motorista.self@frotapro.test',

                'password' => Hash::make(
                    'SenhaTeste123!'
                ),

                'ativo' => true,
            ]);

        TenantUser::create([
            'tenant_id' => $tenant->id,

            'user_id' => $self->id,

            'status' => 'ativo',

            'principal' => true,
        ]);

        $role =
            Role::create([
                'codigo' => 'motorista',

                'nome' => 'Motorista',

                'sistema' => true,
            ]);

        UserRole::create([
            'user_id' => $self->id,

            'role_id' => $role->id,

            'tenant_id' => $tenant->id,
        ]);

        $motorista =
            motoristaFotoDriver(
                $tenant
            );

        $motorista->user_id =
            $self->id;

        $directory =
            'motoristas/'.
            $tenant->id.
            '/'.
            $motorista->id.
            '/perfil';

        $foto =
            UploadedFile::fake()
                ->image(
                    'perfil.jpg',
                    500,
                    500
                );

        $path =
            $foto->storeAs(
                $directory,
                'perfil.jpg',
                'local'
            );

        expect($path)
            ->not->toBeFalse();

        $motorista->foto_perfil_url =
            $path;

        $motorista->save();

        motoristaFotoLogin(
            $this,
            $self
        );

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->get(
                "/api/motoristas/{$motorista->id}/foto"
            )
            ->assertOk()
            ->assertHeader(
                'Content-Type',
                'image/jpeg'
            );

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => UploadedFile::fake()
                        ->image(
                            'tentativa.jpg',
                            500,
                            500
                        ),
                ]
            )
            ->assertForbidden();
    }
);

test(
    'fotografia conclui cadastro completo e ativa motorista',
    function () {
        Storage::fake('local');

        $tenant =
            motoristaFotoTenant(
                'foto-ativacao'
            );

        $user =
            motoristaFotoUser(
                $tenant,
                'foto.ativacao@frotapro.test'
            );

        $motorista =
            new Motorista([
                'nome_completo' => 'Motorista Completo Foto',

                'nif' => '245123458',

                'email' => 'completo.foto@example.test',

                'telemovel' => '912345678',

                'data_nascimento' => '1990-05-10',

                'endereco_rua' => 'Rua do Motorista',

                'endereco_cidade' => 'Lisboa',

                'endereco_cep' => '1000-100',

                'tipo_documento' => 'cartao_cidadao',

                'numero_documento' => '12345678',

                'documento_valid_until' => '2030-01-01',

                'carta_numero' => 'L-123456',

                'carta_valid_until' => '2030-02-01',

                'registo_criminal_valid_until' => '2030-03-01',

                'certificado_tvde' => 'TVDE-123456',

                'certificado_tvde_valid_until' => '2030-04-01',
            ]);

        $motorista->tenant_id =
            $tenant->id;

        $motorista->sincronizarCadastro();
        $motorista->save();

        expect(
            $motorista->ativo
        )->toBeFalse();

        expect(
            $motorista->status_cadastro
        )->toBe('incompleto');

        motoristaFotoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => UploadedFile::fake()
                        ->image(
                            'perfil.jpg',
                            600,
                            600
                        ),
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.ativo',
                true
            )
            ->assertJsonPath(
                'data.status_cadastro',
                'ativo'
            );

        $motorista->refresh();

        expect(
            $motorista->ativo
        )->toBeTrue();

        expect(
            $motorista->status_cadastro
        )->toBe('ativo');
    }
);

test(
    'eliminar motorista remove fotografia privada',
    function () {
        Storage::fake('local');

        $tenant =
            motoristaFotoTenant(
                'foto-delete'
            );

        $user =
            motoristaFotoUser(
                $tenant,
                'foto.delete@frotapro.test'
            );

        $motorista =
            motoristaFotoDriver(
                $tenant
            );

        motoristaFotoLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->post(
                "/api/motoristas/{$motorista->id}/foto",
                [
                    'foto' => UploadedFile::fake()
                        ->image(
                            'perfil.jpg',
                            500,
                            500
                        ),
                ]
            )
            ->assertOk();

        $motorista->refresh();

        $path =
            $motorista->getRawOriginal(
                'foto_perfil_url'
            );

        Storage::disk('local')
            ->assertExists($path);

        $this
            ->withHeaders(
                motoristaFotoHeaders()
            )
            ->deleteJson(
                "/api/motoristas/{$motorista->id}"
            )
            ->assertNoContent();

        Storage::disk('local')
            ->assertMissing($path);
    }
);
