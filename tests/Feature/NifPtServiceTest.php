<?php

use App\Models\NifEnrichment;
use App\Models\NifLookupAttempt;
use App\Services\NifPtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set(
        'services.nif_pt.key',
        'fake-test-key'
    );

    config()->set(
        'services.nif_pt.base_url',
        'https://www.nif.pt/'
    );

    config()->set(
        'services.nif_pt.timeout',
        15
    );

    config()->set(
        'services.nif_pt.cache_days',
        30
    );
});

function nifPtSuccessPayload(
    string $title = 'Nexperience Lda'
): array {
    return [
        'result' => 'success',

        'records' => [
            '509442013' => [
                'nif' => 509442013,

                'seo_url' => 'nexperience-lda',

                'title' => $title,

                'address' => 'Rua da Lionesa Nº 446, Edifício G20',

                'pc4' => '4465',

                'pc3' => '671',

                'city' => 'Leça do Balio',

                'activity' => 'Desenvolvimento de software.',

                'status' => 'active',

                'cae' => '62010',

                'contacts' => [
                    'email' => 'info@nex.pt',

                    'phone' => '220198228',

                    'website' => 'www.nex.pt',
                ],

                'structure' => [
                    'nature' => 'LDA',

                    'capital' => '5000.00',

                    'capital_currency' => 'EUR',
                ],

                'geo' => [
                    'region' => 'Porto',

                    'county' => 'Matosinhos',

                    'parish' => 'Leça do Balio',
                ],

                'place' => [
                    'address' => 'Rua da Lionesa Nº 446, Edifício G20',

                    'pc4' => '4465',

                    'pc3' => '671',

                    'city' => 'Leça do Balio',
                ],

                'racius' => 'http://www.racius.com/nexperience-lda/',

                'alias' => 'Nex - Nexperience, Lda',

                'portugalio' => 'http://www.portugalio.com/nex/',
            ],
        ],

        'nif_validation' => true,

        'is_nif' => true,

        'credits' => [
            'used' => 'free',

            'left' => [],
        ],
    ];
}

test(
    'valida nif português localmente',
    function () {
        $service =
            app(
                NifPtService::class
            );

        expect(
            $service->isValidNif(
                '509442013'
            )
        )->toBeTrue();

        expect(
            $service->isValidNif(
                '509442012'
            )
        )->toBeFalse();

        expect(
            $service->isValidNif(
                '123'
            )
        )->toBeFalse();
    }
);

test(
    'nif inválido não realiza pedido externo',
    function () {
        Http::fake();

        $service =
            app(
                NifPtService::class
            );

        $enrichment =
            $service->lookup(
                '509442012'
            );

        expect(
            $enrichment
                ->lookup_status
        )->toBe(
            NifEnrichment::STATUS_INVALID
        );

        expect(
            $enrichment
                ->lookup_count
        )->toBe(0);

        expect(
            NifLookupAttempt::query()
                ->where(
                    'nif',
                    '509442012'
                )
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_INVALID
                )
                ->count()
        )->toBe(1);

        Http::assertNothingSent();
    }
);

test(
    'consulta nif pt e guarda enriquecimento',
    function () {
        Http::fake([
            '*' => Http::response(
                nifPtSuccessPayload(),
                200
            ),
        ]);

        $service =
            app(
                NifPtService::class
            );

        $enrichment =
            $service->lookup(
                '509442013'
            );

        expect(
            $enrichment
                ->lookup_status
        )->toBe(
            NifEnrichment::STATUS_SUCCESS
        );

        expect(
            $enrichment->title
        )->toBe(
            'Nexperience Lda'
        );

        expect(
            $enrichment->city
        )->toBe(
            'Leça do Balio'
        );

        expect(
            $enrichment->cae
        )->toBe(
            '62010'
        );

        expect(
            $enrichment
                ->contacts[
                    'email'
                ]
        )->toBe(
            'info@nex.pt'
        );

        expect(
            $enrichment
                ->structure[
                    'nature'
                ]
        )->toBe(
            'LDA'
        );

        expect(
            $enrichment
                ->lookup_count
        )->toBe(1);

        expect(
            $enrichment
                ->last_success_at
        )->not->toBeNull();

        expect(
            NifLookupAttempt::query()
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_SUCCESS
                )
                ->count()
        )->toBe(1);

        Http::assertSentCount(
            1
        );

        Http::assertSent(
            function ($request): bool {
                return
                    $request[
                        'q'
                    ] ===
                    '509442013' &&
                    $request[
                        'json'
                    ] == 1 &&
                    $request[
                        'key'
                    ] ===
                    'fake-test-key';
            }
        );
    }
);

test(
    'consulta repetida utiliza cache sem novo pedido externo',
    function () {
        Http::fake([
            '*' => Http::response(
                nifPtSuccessPayload(),
                200
            ),
        ]);

        $service =
            app(
                NifPtService::class
            );

        $service->lookup(
            '509442013'
        );

        $enrichment =
            $service->lookup(
                '509442013'
            );

        expect(
            $enrichment
                ->lookup_count
        )->toBe(1);

        expect(
            NifLookupAttempt::query()
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_SUCCESS
                )
                ->count()
        )->toBe(1);

        expect(
            NifLookupAttempt::query()
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_CACHE_HIT
                )
                ->count()
        )->toBe(1);

        Http::assertSentCount(
            1
        );
    }
);

test(
    'force ignora cache e realiza nova consulta',
    function () {
        Http::fakeSequence()
            ->push(
                nifPtSuccessPayload(
                    'Nexperience Lda'
                ),
                200
            )
            ->push(
                nifPtSuccessPayload(
                    'Nexperience Lda Atualizada'
                ),
                200
            );

        $service =
            app(
                NifPtService::class
            );

        $service->lookup(
            '509442013'
        );

        $enrichment =
            $service->lookup(
                '509442013',
                true
            );

        expect(
            $enrichment
                ->lookup_count
        )->toBe(2);

        expect(
            $enrichment->title
        )->toBe(
            'Nexperience Lda Atualizada'
        );

        expect(
            NifLookupAttempt::query()
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_SUCCESS
                )
                ->count()
        )->toBe(2);

        Http::assertSentCount(
            2
        );
    }
);

test(
    'resposta sem registo marca nif como não encontrado',
    function () {
        Http::fake([
            '*' => Http::response(
                [
                    'result' => 'success',

                    'records' => [],

                    'nif_validation' => true,

                    'is_nif' => true,

                    'credits' => [
                        'used' => 'free',
                    ],
                ],
                200
            ),
        ]);

        $service =
            app(
                NifPtService::class
            );

        $enrichment =
            $service->lookup(
                '509442013'
            );

        expect(
            $enrichment
                ->lookup_status
        )->toBe(
            NifEnrichment::STATUS_NOT_FOUND
        );

        expect(
            $enrichment
                ->lookup_count
        )->toBe(1);

        expect(
            NifLookupAttempt::query()
                ->where(
                    'status',
                    NifLookupAttempt::STATUS_NOT_FOUND
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'erro http fica registado sem criar falso sucesso',
    function () {
        Http::fake([
            '*' => Http::response(
                [
                    'result' => 'error',

                    'message' => 'Too many requests',
                ],
                429
            ),
        ]);

        $service =
            app(
                NifPtService::class
            );

        $enrichment =
            $service->lookup(
                '509442013'
            );

        expect(
            $enrichment
                ->lookup_status
        )->toBe(
            NifEnrichment::STATUS_ERROR
        );

        expect(
            $enrichment
                ->lookup_count
        )->toBe(1);

        expect(
            $enrichment
                ->last_error
        )->toBe(
            'Too many requests'
        );

        $attempt =
            NifLookupAttempt::query()
                ->firstOrFail();

        expect(
            $attempt->status
        )->toBe(
            NifLookupAttempt::STATUS_ERROR
        );

        expect(
            $attempt
                ->http_status
        )->toBe(429);
    }
);
