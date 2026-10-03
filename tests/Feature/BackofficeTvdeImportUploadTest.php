<?php

use App\Models\Role;
use App\Models\TvdeImport;
use App\Models\User;
use App\Models\UserRole;
use App\Services\TvdeImportService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );
});

function tvdeUploadHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function tvdeUploadAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'tvde.upload@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $role = Role::query()
        ->where(
            'codigo',
            'super_admin'
        )
        ->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    return $user;
}

function tvdeUploadLogin(
    $test,
    User $user
): void {
    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

test('upload tvde exige autenticação', function () {
    $this
        ->withHeaders(
            tvdeUploadHeaders()
        )
        ->post(
            '/api/backoffice/crm/importacoes',
            []
        )
        ->assertUnauthorized();
});

test('super admin importa pdf tvde pelo painel e ficheiro temporário é eliminado', function () {
    Storage::fake(
        'local'
    );

    $admin =
        tvdeUploadAdmin();

    tvdeUploadLogin(
        $this,
        $admin
    );

    $import = TvdeImport::create([
        'source' => TvdeImport::SOURCE_IMT,
        'reference_date' => '2026-10-03',
        'original_filename' => 'TVDE_Lista.pdf',
        'file_hash' => str_repeat(
            'a',
            64
        ),
        'status' => TvdeImport::STATUS_COMPLETED,
        'total_records' => 100,
        'new_records' => 10,
        'changed_records' => 2,
        'removed_records' => 1,
        'restored_records' => 0,
        'unchanged_records' => 87,
        'imported_by' => $admin->id,
        'started_at' => now(),
        'completed_at' => now(),
    ]);

    $service = Mockery::mock(
        TvdeImportService::class
    );

    $service
        ->shouldReceive(
            'import'
        )
        ->once()
        ->withArgs(
            function (
                string $path,
                string $source,
                ?string $userId,
                ?string $originalFilename
            ) use (
                $admin
            ): bool {
                return is_file(
                    $path
                ) &&
                    $source ===
                        TvdeImport::SOURCE_IMT &&
                    $userId ===
                        $admin->id &&
                    $originalFilename ===
                        'TVDE_Lista.pdf';
            }
        )
        ->andReturn(
            $import
        );

    $this->app->instance(
        TvdeImportService::class,
        $service
    );

    $file = UploadedFile::fake()
        ->create(
            'TVDE_Lista.pdf',
            100,
            'application/pdf'
        );

    $this
        ->withHeaders(
            tvdeUploadHeaders()
        )
        ->post(
            '/api/backoffice/crm/importacoes',
            [
                'source' => TvdeImport::SOURCE_IMT,
                'file' => $file,
                'confirm_full_snapshot' => '1',
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'message',
            'Importação TVDE concluída com sucesso.'
        )
        ->assertJsonPath(
            'data.id',
            $import->id
        )
        ->assertJsonPath(
            'data.original_filename',
            'TVDE_Lista.pdf'
        );

    expect(
        Storage::disk(
            'local'
        )->allFiles(
            'tvde-imports/tmp'
        )
    )->toBe([]);
});

test('upload exige confirmação de snapshot completo', function () {
    Storage::fake(
        'local'
    );

    $admin =
        tvdeUploadAdmin();

    tvdeUploadLogin(
        $this,
        $admin
    );

    $file = UploadedFile::fake()
        ->create(
            'TVDE_Lista.pdf',
            100,
            'application/pdf'
        );

    $this
        ->withHeaders(
            tvdeUploadHeaders()
        )
        ->post(
            '/api/backoffice/crm/importacoes',
            [
                'source' => TvdeImport::SOURCE_IMT,
                'file' => $file,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'confirm_full_snapshot'
        );
});
