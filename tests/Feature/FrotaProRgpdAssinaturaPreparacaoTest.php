<?php

declare(strict_types=1);

use App\Models\RgpdAssinatura;
use App\Models\RgpdRegisto;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdConsentimentoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function rgpd81Contexto(): array
{
    $tenant = Tenant::create([
        'nome' => 'RGPD Assinaturas Teste',
        'slug' => 'rgpd-ass-' . bin2hex(random_bytes(5)),
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

    $registo = app(
        RgpdConsentimentoService::class
    )->criarRascunho(
        $tenant->id,
        $ator->id,
        'outro',
        null,
        'Titular Exemplo',
        [
            'imagem' => 'autorizo',
            'voz' => 'nao_autorizo',
            'localizacao' => 'nao_aplicavel',
            'dados_sensiveis' => 'nao_aplicavel',
        ]
    );

    return [$tenant, $ator, $registo];
}

test(
    '4r81 prepara assinatura remota com hashes e sem OTP',
    function (): void {
        [$tenant, $ator, $registo] =
            rgpd81Contexto();

        $assinatura = app(
            RgpdAssinaturaPreparacaoService::class
        )->preparar(
            $tenant->id,
            $ator->id,
            $registo->id,
            'remota',
            'Titular Exemplo',
            'titular@example.test'
        );

        expect($assinatura->status)
            ->toBe('pendente');

        expect($assinatura->modo)
            ->toBe('remota');

        expect(
            strlen($assinatura->documento_sha256)
        )->toBe(64);

        expect(
            strlen($assinatura->escolhas_sha256)
        )->toBe(64);

        expect($assinatura->token_hash)
            ->toBeNull();

        expect($assinatura->otp_hash)
            ->toBeNull();

        expect($assinatura->assinado_em)
            ->toBeNull();

        expect(
            $registo->fresh()->estado
        )->toBe('rascunho');
    }
);

test(
    '4r81 preparar assinatura e idempotente',
    function (): void {
        [$tenant, $ator, $registo] =
            rgpd81Contexto();

        $service = app(
            RgpdAssinaturaPreparacaoService::class
        );

        $primeira = $service->preparar(
            $tenant->id,
            $ator->id,
            $registo->id,
            'presencial',
            'Titular Exemplo'
        );

        $segunda = $service->preparar(
            $tenant->id,
            $ator->id,
            $registo->id,
            'presencial',
            'Titular Exemplo'
        );

        expect($primeira->id)
            ->toBe($segunda->id);

        expect(
            RgpdAssinatura::count()
        )->toBe(1);

        expect(
            fn () => $service->preparar(
                $tenant->id,
                $ator->id,
                $registo->id,
                'remota',
                'Titular Exemplo',
                'titular@example.test'
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r81 protege registos de outros tenants',
    function (): void {
        [$tenantA, $atorA, $registo] =
            rgpd81Contexto();

        [$tenantB, $atorB] =
            rgpd81Contexto();

        expect(
            fn () => app(
                RgpdAssinaturaPreparacaoService::class
            )->preparar(
                $tenantB->id,
                $atorB->id,
                $registo->id,
                'remota',
                'Titular Exemplo',
                'titular@example.test'
            )
        )->toThrow(
            ModelNotFoundException::class
        );

        expect(
            fn () => app(
                RgpdAssinaturaPreparacaoService::class
            )->preparar(
                $tenantA->id,
                $atorB->id,
                $registo->id,
                'presencial',
                'Titular Exemplo'
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r81 impede assinatura de escolhas retiradas',
    function (): void {
        [$tenant, $ator, $registo] =
            rgpd81Contexto();

        app(
            RgpdConsentimentoService::class
        )->revogarEscolhaRascunho(
            $tenant->id,
            $ator->id,
            $registo->id,
            'imagem'
        );

        expect(
            fn () => app(
                RgpdAssinaturaPreparacaoService::class
            )->preparar(
                $tenant->id,
                $ator->id,
                $registo->id,
                'presencial',
                'Titular Exemplo'
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            RgpdAssinatura::count()
        )->toBe(0);
    }
);

test(
    '4r81 bloqueia documento ou versao alterados',
    function (): void {
        [$tenant, $ator, $registo] =
            rgpd81Contexto();

        $registo->documento_sha256 =
            str_repeat('0', 64);

        $registo->save();

        expect(
            fn () => app(
                RgpdAssinaturaPreparacaoService::class
            )->preparar(
                $tenant->id,
                $ator->id,
                $registo->id,
                'presencial',
                'Titular Exemplo'
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            RgpdAssinatura::count()
        )->toBe(0);
    }
);

test(
    '4r81 rejeita identidade ou modo invalidos',
    function (): void {
        [$tenant, $ator, $registo] =
            rgpd81Contexto();

        $service = app(
            RgpdAssinaturaPreparacaoService::class
        );

        expect(
            fn () => $service->preparar(
                $tenant->id,
                $ator->id,
                $registo->id,
                'remota',
                'Titular Exemplo'
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            fn () => $service->preparar(
                $tenant->id,
                $ator->id,
                $registo->id,
                'presencial',
                'Outra Pessoa'
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            fn () => $service->preparar(
                $tenant->id,
                $ator->id,
                $registo->id,
                'invalido',
                'Titular Exemplo'
            )
        )->toThrow(
            ValidationException::class
        );
    }
);
