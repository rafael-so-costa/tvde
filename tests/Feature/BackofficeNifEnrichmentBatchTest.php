<?php

use App\Models\NifEnrichmentBatch;
use App\Models\Role;
use App\Models\TvdeOperator;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(
        RoleSeeder::class
    );

    config()->set(
        'services.nif_pt.key',
        'fake-backoffice-batch-key'
    );

    config()->set(
        'services.nif_pt.base_url',
        'https://www.nif.pt/'
    );

    config()->set(
        'services.nif_pt.cache_days',
        30
    );
});

function backofficeBatchHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function backofficeBatchAdmin(): User
{
    $user = User::factory()->create([
        'email' => 'nif.batch.admin@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $role = Role::query()
        ->where('codigo', 'super_admin')
        ->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => null,
    ]);

    return $user;
}

function backofficeBatchLogin(
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

test('lotes nif pt exigem autenticação', function () {
    $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->getJson(
            '/api/backoffice/crm/enriquecimento/lotes'
        )
        ->assertUnauthorized();
});

test('super admin cria e consulta lote nif pt', function () {
    $operator = TvdeOperator::create([
        'nif' => '509442013',
        'display_name' => 'Operador Batch',
    ]);

    $admin = backofficeBatchAdmin();

    backofficeBatchLogin(
        $this,
        $admin
    );

    $response = $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->postJson(
            '/api/backoffice/crm/enriquecimento/lotes',
            [
                'name' => 'Lote Comercial',
                'operator_ids' => [
                    $operator->id,
                ],
                'force_refresh' => false,
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.name',
            'Lote Comercial'
        )
        ->assertJsonPath(
            'data.total_items',
            1
        )
        ->assertJsonCount(
            1,
            'data.items'
        );

    $batchId = $response->json(
        'data.id'
    );

    $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->getJson(
            "/api/backoffice/crm/enriquecimento/lotes/{$batchId}"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.items.0.nif',
            '509442013'
        );
});

test('processamento via backoffice resolve nif inválido sem chamar fornecedor', function () {
    Http::fake();

    $operator = TvdeOperator::create([
        'nif' => '123456780',
        'display_name' => 'Operador Inválido',
    ]);

    $admin = backofficeBatchAdmin();

    backofficeBatchLogin(
        $this,
        $admin
    );

    $response = $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->postJson(
            '/api/backoffice/crm/enriquecimento/lotes',
            [
                'operator_ids' => [
                    $operator->id,
                ],
                'force_refresh' => false,
            ]
        )
        ->assertCreated();

    $batchId = $response->json(
        'data.id'
    );

    $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->postJson(
            "/api/backoffice/crm/enriquecimento/lotes/{$batchId}/processar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            NifEnrichmentBatch::STATUS_COMPLETED
        )
        ->assertJsonPath(
            'data.skipped_items',
            1
        )
        ->assertJsonPath(
            'data.external_lookups',
            0
        );

    Http::assertNothingSent();
});

test('lote pendente pode ser cancelado', function () {
    $operator = TvdeOperator::create([
        'nif' => '509442013',
        'display_name' => 'Operador Cancelamento',
    ]);

    $admin = backofficeBatchAdmin();

    backofficeBatchLogin(
        $this,
        $admin
    );

    $response = $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->postJson(
            '/api/backoffice/crm/enriquecimento/lotes',
            [
                'operator_ids' => [
                    $operator->id,
                ],
                'force_refresh' => false,
            ]
        )
        ->assertCreated();

    $batchId = $response->json(
        'data.id'
    );

    $this
        ->withHeaders(
            backofficeBatchHeaders()
        )
        ->postJson(
            "/api/backoffice/crm/enriquecimento/lotes/{$batchId}/cancelar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            NifEnrichmentBatch::STATUS_CANCELED
        )
        ->assertJsonPath(
            'data.skipped_items',
            1
        );
});
