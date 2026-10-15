<?php

use App\Models\NifEnrichment;
use App\Models\NifLookupAttempt;
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
        'fake-backoffice-key'
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

function backofficeNifHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',

        'Referer' => 'http://localhost:8000/',

        'Accept' => 'application/json',
    ];
}

function backofficeNifAdmin(): User
{
    $user =
        User::factory()
        ->create([
            'email' => 'nif.backoffice@frotapro.test',

            'password' => Hash::make(
                'SenhaTeste123!'
            ),

            'ativo' => true,
        ]);

    $role =
        Role::query()
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

function backofficeNifLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,

                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function backofficeNifOperator(): TvdeOperator
{
    return TvdeOperator::create([
        'nif' => '509442013',

        'display_name' => 'Nexperience Lda',
    ]);
}

function backofficeNifPayload(
    string $title = 'Nexperience Lda'
): array {
    return [
        'result' => 'success',

        'records' => [
            '509442013' => [
                'nif' => 509442013,

                'title' => $title,

                'address' => 'Rua da Lionesa Nº 446',

                'pc4' => '4465',

                'pc3' => '671',

                'city' => 'Leça do Balio',

                'activity' => 'Desenvolvimento de software.',

                'status' => 'active',

                'cae' => '62010',

                'contacts' => [
                    'email' => 'info@example.test',

                    'phone' => '220000000',

                    'website' => 'example.test',
                ],
            ],
        ],

        'nif_validation' => true,

        'is_nif' => true,

        'credits' => [
            'used' => 'free',
        ],
    ];
}

test(
    'consulta de enriquecimento exige autenticação',
    function () {
        $operator =
            backofficeNifOperator();

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->getJson(
                "/api/backoffice/crm/operadores/{$operator->id}/enriquecimento"
            )
            ->assertUnauthorized();
    }
);

test(
    'abrir enriquecimento não consulta fornecedor',
    function () {
        Http::fake();

        $operator =
            backofficeNifOperator();

        $admin =
            backofficeNifAdmin();

        backofficeNifLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->getJson(
                "/api/backoffice/crm/operadores/{$operator->id}/enriquecimento"
            )
            ->assertOk()
            ->assertJsonPath(
                'data.configured',
                true
            )
            ->assertJsonPath(
                'data.enrichment',
                null
            );

        Http::assertNothingSent();
    }
);

test(
    'super admin enriquece operador através do nif pt',
    function () {
        Http::fake([
            '*' => Http::response(
                backofficeNifPayload(),
                200
            ),
        ]);

        $operator =
            backofficeNifOperator();

        $admin =
            backofficeNifAdmin();

        backofficeNifLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->postJson(
                "/api/backoffice/crm/operadores/{$operator->id}/enriquecimento",
                [
                    'force' => false,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.enrichment.lookup_status',
                NifEnrichment::STATUS_SUCCESS
            )
            ->assertJsonPath(
                'data.enrichment.title',
                'Nexperience Lda'
            )
            ->assertJsonPath(
                'data.enrichment.cae',
                '62010'
            )
            ->assertJsonPath(
                'data.enrichment.contacts.email',
                'info@example.test'
            )
            ->assertJsonPath(
                'data.enrichment.cache_is_fresh',
                true
            );

        Http::assertSentCount(
            1
        );
    }
);

test(
    'segunda consulta normal utiliza cache local',
    function () {
        Http::fake([
            '*' => Http::response(
                backofficeNifPayload(),
                200
            ),
        ]);

        $operator =
            backofficeNifOperator();

        $admin =
            backofficeNifAdmin();

        backofficeNifLogin(
            $this,
            $admin
        );

        $endpoint =
            "/api/backoffice/crm/operadores/{$operator->id}/enriquecimento";

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->postJson(
                $endpoint,
                [
                    'force' => false,
                ]
            )
            ->assertOk();

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->postJson(
                $endpoint,
                [
                    'force' => false,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Dados obtidos do cache local.'
            )
            ->assertJsonPath(
                'data.enrichment.lookup_count',
                1
            );

        Http::assertSentCount(
            1
        );

        expect(
            NifLookupAttempt::query()
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_CACHE_HIT
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'force realiza nova consulta externa',
    function () {
        Http::fakeSequence()
            ->push(
                backofficeNifPayload(),
                200
            )
            ->push(
                backofficeNifPayload(
                    'Nexperience Atualizada'
                ),
                200
            );

        $operator =
            backofficeNifOperator();

        $admin =
            backofficeNifAdmin();

        backofficeNifLogin(
            $this,
            $admin
        );

        $endpoint =
            "/api/backoffice/crm/operadores/{$operator->id}/enriquecimento";

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->postJson(
                $endpoint,
                [
                    'force' => false,
                ]
            )
            ->assertOk();

        /*
         * O force ignora o cache, mas continua sujeito
         * à quota operacional de 1 consulta externa/minuto.
         */
        $this->travel(
            49
        )->minutes();

        $this
            ->withHeaders(
                backofficeNifHeaders()
            )
            ->postJson(
                $endpoint,
                [
                    'force' => true,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.enrichment.title',
                'Nexperience Atualizada'
            )
            ->assertJsonPath(
                'data.enrichment.lookup_count',
                2
            );

        Http::assertSentCount(
            2
        );
    }
);
