<?php

declare(strict_types=1);

use App\Models\RgpdEvento;
use App\Models\RgpdRegisto;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\FrotaProDocumentCatalog;
use App\Services\RgpdConsentimentoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function rgpd47Contexto(): array
{
    $tenant = Tenant::create([
        'nome' => 'Teste RGPD',
        'slug' => 'rgpd-' . bin2hex(random_bytes(4)),
        'ativo' => true,
    ]);

    $ator = User::factory()->create([
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $ator->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    return [$tenant, $ator];
}

function rgpd47Escolhas(): array
{
    return [
        'imagem' => 'autorizo',
        'voz' => 'nao_autorizo',
        'localizacao' => 'nao_aplicavel',
        'dados_sensiveis' => 'nao_aplicavel',
    ];
}

test(
    '4r7 rascunho guarda quatro escolhas e versao sem assinatura',
    function (): void {
        [$tenant, $ator] = rgpd47Contexto();

        $registo = app(
            RgpdConsentimentoService::class
        )->criarRascunho(
            $tenant->id,
            $ator->id,
            'outro',
            null,
            'Titular Exemplo',
            rgpd47Escolhas()
        );

        expect($registo->estado)
            ->toBe('rascunho');

        expect($registo->eventos)
            ->toHaveCount(4);

        expect($registo->versao_documento)
            ->toBe('1.0');

        $conteudo = app(
            FrotaProDocumentCatalog::class
        )->content(
            'informacao_tratamento_dados_rgpd'
        );

        expect($registo->documento_sha256)
            ->toBe(hash('sha256', $conteudo));

        expect(
            $registo->eventos
                ->pluck('finalidade')
                ->sort()
                ->values()
                ->all()
        )->toBe([
            'dados_sensiveis',
            'imagem',
            'localizacao',
            'voz',
        ]);
    }
);

test(
    '4r7 rejeita escolhas omitidas ou incompletas',
    function (): void {
        [$tenant, $ator] = rgpd47Contexto();

        $escolhas = rgpd47Escolhas();

        unset($escolhas['voz']);

        expect(
            fn () => app(
                RgpdConsentimentoService::class
            )->criarRascunho(
                $tenant->id,
                $ator->id,
                'outro',
                null,
                'Titular Exemplo',
                $escolhas
            )
        )->toThrow(
            ValidationException::class
        );

        expect(RgpdRegisto::count())->toBe(0);
        expect(RgpdEvento::count())->toBe(0);
    }
);

test(
    '4r7 exige finalidade especifica quando aplicavel',
    function (): void {
        [$tenant, $ator] = rgpd47Contexto();

        $escolhas = rgpd47Escolhas();

        $escolhas['localizacao'] = 'autorizo';

        expect(
            fn () => app(
                RgpdConsentimentoService::class
            )->criarRascunho(
                $tenant->id,
                $ator->id,
                'outro',
                null,
                'Titular Exemplo',
                $escolhas
            )
        )->toThrow(
            ValidationException::class
        );

        $escolhas['localizacao'] = 'nao_autorizo';

        $escolhas['dados_sensiveis'] = 'autorizo';

        expect(
            fn () => app(
                RgpdConsentimentoService::class
            )->criarRascunho(
                $tenant->id,
                $ator->id,
                'outro',
                null,
                'Titular Exemplo',
                $escolhas
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r7 revogacao do rascunho preserva decisao original',
    function (): void {
        [$tenant, $ator] = rgpd47Contexto();

        $service = app(
            RgpdConsentimentoService::class
        );

        $registo = $service->criarRascunho(
            $tenant->id,
            $ator->id,
            'outro',
            null,
            'Titular Exemplo',
            rgpd47Escolhas()
        );

        $registo = $service->revogarEscolhaRascunho(
            $tenant->id,
            $ator->id,
            $registo->id,
            'imagem'
        );

        expect($registo->eventos)
            ->toHaveCount(5);

        expect(
            $registo->eventos
                ->where('tipo', 'decisao')
                ->count()
        )->toBe(4);

        expect(
            $registo->eventos
                ->where('tipo', 'revogacao')
                ->count()
        )->toBe(1);

        expect(
            fn () => $service->revogarEscolhaRascunho(
                $tenant->id,
                $ator->id,
                $registo->id,
                'imagem'
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r7 protege isolamento entre tenants',
    function (): void {
        [$tenantA, $atorA] = rgpd47Contexto();
        [$tenantB, $atorB] = rgpd47Contexto();

        $service = app(
            RgpdConsentimentoService::class
        );

        $registo = $service->criarRascunho(
            $tenantA->id,
            $atorA->id,
            'outro',
            null,
            'Titular Exemplo',
            rgpd47Escolhas()
        );

        expect(
            fn () => $service->revogarEscolhaRascunho(
                $tenantB->id,
                $atorB->id,
                $registo->id,
                'imagem'
            )
        )->toThrow(
            ModelNotFoundException::class
        );

        expect(
            fn () => $service->criarRascunho(
                $tenantB->id,
                $atorA->id,
                'outro',
                null,
                'Titular Exemplo',
                rgpd47Escolhas()
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r7 eventos sao imutaveis via eloquent',
    function (): void {
        [$tenant, $ator] = rgpd47Contexto();

        $registo = app(
            RgpdConsentimentoService::class
        )->criarRascunho(
            $tenant->id,
            $ator->id,
            'outro',
            null,
            'Titular Exemplo',
            rgpd47Escolhas()
        );

        $evento = $registo->eventos->first();

        $evento->escolha = 'nao_autorizo';

        expect(
            fn () => $evento->save()
        )->toThrow(
            LogicException::class
        );

        expect(
            fn () => $evento->delete()
        )->toThrow(
            LogicException::class
        );

        expect(RgpdEvento::count())->toBe(4);
    }
);
