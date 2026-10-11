<?php

use App\Models\ChecklistMedia;
use App\Models\ChecklistRecord;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function portalChecklistHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function portalChecklistTenant(
    string $name,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $name,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function portalChecklistUser(
    Tenant $tenant,
    string $roleCode,
    string $email
): User {
    $user =
        User::factory()
            ->create([
                'email' => $email,
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
                'codigo' => $roleCode,
            ],
            [
                'nome' => $roleCode ===
                    'motorista'
                        ? 'Motorista'
                        : 'Proprietário',

                'sistema' => true,
            ]
        );

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    return $user;
}

function portalChecklistActAs(
    $test,
    User $user,
    Tenant $tenant
): void {
    $test->flushSession();

    $test
        ->withHeaders(
            portalChecklistHeaders()
        )
        ->actingAs(
            $user,
            'web'
        )
        ->withSession([
            'tenant_id' => $tenant->id,
        ]);
}

function portalChecklistMotorista(
    Tenant $tenant,
    User $user,
    string $name
): Motorista {
    $motorista =
        new Motorista([
            'nome_completo' => $name,
            'email' => $user->email,
        ]);

    $motorista->tenant_id =
        $tenant->id;

    $motorista->user_id =
        $user->id;

    $motorista->save();

    return $motorista;
}

function portalChecklistProprietario(
    Tenant $tenant,
    User $user,
    string $name
): Proprietario {
    $proprietario =
        new Proprietario([
            'tipo' => 'pessoa_fisica',
            'nome_completo' => $name,
            'email' => $user->email,
        ]);

    $proprietario->tenant_id =
        $tenant->id;

    $proprietario->user_id =
        $user->id;

    $proprietario->save();

    return $proprietario;
}

function portalChecklistVeiculo(
    Tenant $tenant,
    Proprietario $proprietario,
    string $matricula
): Veiculo {
    $veiculo =
        new Veiculo([
            'matricula' => $matricula,
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
            'proprietario_id' => $proprietario->id,
        ]);

    $veiculo->tenant_id =
        $tenant->id;

    $veiculo->save();

    return $veiculo;
}

function portalChecklistRecord(
    Tenant $tenant,
    Motorista $motorista,
    Veiculo $veiculo,
    string $tipo = 'entrega',
    string $estado = 'finalizado'
): ChecklistRecord {
    $record =
        new ChecklistRecord([
            'tipo' => $tipo,
            'motorista_id' => $motorista->id,
            'veiculo_id' => $veiculo->id,
            'data_operacao' => '2026-10-11',
            'hora_operacao' => '10:30',
            'quilometragem' => 50000,
            'nivel_combustivel' => 'cheio',
            'observacoes' => 'Checklist de teste',
        ]);

    $record->tenant_id =
        $tenant->id;

    $record->estado =
        $estado;

    $record->motorista_nome_snapshot =
        $motorista->nome_completo;

    $record->matricula_snapshot =
        $veiculo->matricula;

    $record->modelo_snapshot =
        trim(
            "{$veiculo->marca} {$veiculo->modelo}"
        );

    if (
        $estado ===
        'finalizado'
    ) {
        $record->finalizado_em =
            now();
    }

    $record->save();

    return $record;
}

test(
    'rotas de checklists dos portais exigem autenticacao',
    function () {
        $this
            ->withHeaders(
                portalChecklistHeaders()
            )
            ->getJson(
                '/api/portal/motorista/checklists'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders(
                portalChecklistHeaders()
            )
            ->getJson(
                '/api/portal/proprietario/checklists'
            )
            ->assertUnauthorized();
    }
);

test(
    'motorista ve apenas os proprios checklists finalizados',
    function () {
        $tenant =
            portalChecklistTenant(
                'Tenant Motoristas',
                'portal-checklist-motorista'
            );

        $ownerUser =
            portalChecklistUser(
                $tenant,
                'proprietario',
                'owner.portal.checklist@test.local'
            );

        $owner =
            portalChecklistProprietario(
                $tenant,
                $ownerUser,
                'Proprietário'
            );

        $vehicle =
            portalChecklistVeiculo(
                $tenant,
                $owner,
                'AA-11-AA'
            );

        $userA =
            portalChecklistUser(
                $tenant,
                'motorista',
                'motorista.a.checklist@test.local'
            );

        $driverA =
            portalChecklistMotorista(
                $tenant,
                $userA,
                'Motorista A'
            );

        $userB =
            portalChecklistUser(
                $tenant,
                'motorista',
                'motorista.b.checklist@test.local'
            );

        $driverB =
            portalChecklistMotorista(
                $tenant,
                $userB,
                'Motorista B'
            );

        $own =
            portalChecklistRecord(
                $tenant,
                $driverA,
                $vehicle
            );

        portalChecklistRecord(
            $tenant,
            $driverA,
            $vehicle,
            'recolha',
            'rascunho'
        );

        $other =
            portalChecklistRecord(
                $tenant,
                $driverB,
                $vehicle
            );

        portalChecklistActAs(
            $this,
            $userA,
            $tenant
        );

        $this
            ->getJson(
                '/api/portal/motorista/checklists'
            )
            ->assertOk()
            ->assertJsonPath(
                'summary.total',
                1
            )
            ->assertJsonPath(
                'data.total',
                1
            )
            ->assertJsonPath(
                'data.data.0.id',
                $own->id
            );

        $this
            ->getJson(
                "/api/portal/motorista/checklists/{$other->id}"
            )
            ->assertNotFound();
    }
);

test(
    'proprietario ve apenas checklists dos seus veiculos',
    function () {
        $tenant =
            portalChecklistTenant(
                'Tenant Proprietários',
                'portal-checklist-proprietario'
            );

        $ownerUserA =
            portalChecklistUser(
                $tenant,
                'proprietario',
                'proprietario.a.checklist@test.local'
            );

        $ownerA =
            portalChecklistProprietario(
                $tenant,
                $ownerUserA,
                'Proprietário A'
            );

        $ownerUserB =
            portalChecklistUser(
                $tenant,
                'proprietario',
                'proprietario.b.checklist@test.local'
            );

        $ownerB =
            portalChecklistProprietario(
                $tenant,
                $ownerUserB,
                'Proprietário B'
            );

        $driverUser =
            portalChecklistUser(
                $tenant,
                'motorista',
                'driver.owner.checklist@test.local'
            );

        $driver =
            portalChecklistMotorista(
                $tenant,
                $driverUser,
                'Motorista'
            );

        $vehicleA =
            portalChecklistVeiculo(
                $tenant,
                $ownerA,
                'BB-22-BB'
            );

        $vehicleB =
            portalChecklistVeiculo(
                $tenant,
                $ownerB,
                'CC-33-CC'
            );

        $own =
            portalChecklistRecord(
                $tenant,
                $driver,
                $vehicleA
            );

        $other =
            portalChecklistRecord(
                $tenant,
                $driver,
                $vehicleB
            );

        portalChecklistActAs(
            $this,
            $ownerUserA,
            $tenant
        );

        $this
            ->getJson(
                '/api/portal/proprietario/checklists'
            )
            ->assertOk()
            ->assertJsonPath(
                'summary.total',
                1
            )
            ->assertJsonPath(
                'data.data.0.id',
                $own->id
            );

        $this
            ->getJson(
                "/api/portal/proprietario/checklists/{$other->id}"
            )
            ->assertNotFound();
    }
);

test(
    'acesso ao portal exige role e cadastro vinculado',
    function () {
        $tenant =
            portalChecklistTenant(
                'Tenant sem vínculo',
                'portal-checklist-sem-vinculo'
            );

        $user =
            portalChecklistUser(
                $tenant,
                'motorista',
                'sem.vinculo.checklist@test.local'
            );

        portalChecklistActAs(
            $this,
            $user,
            $tenant
        );

        $this
            ->getJson(
                '/api/portal/motorista/checklists'
            )
            ->assertForbidden();
    }
);

test(
    'evidencia de checklist respeita vinculo do motorista',
    function () {
        Storage::fake(
            'local'
        );

        $tenant =
            portalChecklistTenant(
                'Tenant Evidências',
                'portal-checklist-evidencias'
            );

        $ownerUser =
            portalChecklistUser(
                $tenant,
                'proprietario',
                'owner.evidencia.checklist@test.local'
            );

        $owner =
            portalChecklistProprietario(
                $tenant,
                $ownerUser,
                'Proprietário Evidência'
            );

        $vehicle =
            portalChecklistVeiculo(
                $tenant,
                $owner,
                'DD-44-DD'
            );

        $userA =
            portalChecklistUser(
                $tenant,
                'motorista',
                'motorista.evidencia.a@test.local'
            );

        $driverA =
            portalChecklistMotorista(
                $tenant,
                $userA,
                'Motorista Evidência A'
            );

        $userB =
            portalChecklistUser(
                $tenant,
                'motorista',
                'motorista.evidencia.b@test.local'
            );

        $driverB =
            portalChecklistMotorista(
                $tenant,
                $userB,
                'Motorista Evidência B'
            );

        $recordA =
            portalChecklistRecord(
                $tenant,
                $driverA,
                $vehicle
            );

        $recordB =
            portalChecklistRecord(
                $tenant,
                $driverB,
                $vehicle
            );

        $pathA =
            "checklists/{$recordA->id}/foto.jpg";

        $pathB =
            "checklists/{$recordB->id}/foto.jpg";

        Storage::disk(
            'local'
        )->put(
            $pathA,
            'imagem-a'
        );

        Storage::disk(
            'local'
        )->put(
            $pathB,
            'imagem-b'
        );

        $mediaA =
            new ChecklistMedia([
                'tipo' => 'foto',
                'contexto' => 'veiculo',
                'titulo' => 'Foto A',
                'arquivo_nome' => 'foto-a.jpg',
                'arquivo_path' => $pathA,
                'arquivo_mime' => 'image/jpeg',
                'arquivo_tamanho' => 8,
                'hash_arquivo' => hash(
                    'sha256',
                    'imagem-a'
                ),
            ]);

        $mediaA->tenant_id =
            $tenant->id;

        $mediaA->checklist_record_id =
            $recordA->id;

        $mediaA->save();

        $mediaB =
            new ChecklistMedia([
                'tipo' => 'foto',
                'contexto' => 'veiculo',
                'titulo' => 'Foto B',
                'arquivo_nome' => 'foto-b.jpg',
                'arquivo_path' => $pathB,
                'arquivo_mime' => 'image/jpeg',
                'arquivo_tamanho' => 8,
                'hash_arquivo' => hash(
                    'sha256',
                    'imagem-b'
                ),
            ]);

        $mediaB->tenant_id =
            $tenant->id;

        $mediaB->checklist_record_id =
            $recordB->id;

        $mediaB->save();

        portalChecklistActAs(
            $this,
            $userA,
            $tenant
        );

        $this
            ->getJson(
                "/api/portal/motorista/checklists/{$recordA->id}"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.media_files.0.id',
                $mediaA->id
            )
            ->assertJsonMissing([
                'arquivo_path' => $pathA,
            ]);

        $this
            ->get(
                "/api/portal/motorista/checklists/{$recordA->id}/media/{$mediaA->id}"
            )
            ->assertOk();

        $this
            ->get(
                "/api/portal/motorista/checklists/{$recordB->id}/media/{$mediaB->id}"
            )
            ->assertNotFound();
    }
);
