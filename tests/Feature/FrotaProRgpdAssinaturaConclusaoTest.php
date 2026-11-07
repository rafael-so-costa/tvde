<?php

declare(strict_types=1);

use App\Models\RgpdAssinatura;
use App\Models\RgpdEvento;
use App\Models\RgpdRegisto;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\RgpdAssinaturaConclusaoService;
use App\Services\RgpdAssinaturaPreparacaoService;
use App\Services\RgpdConsentimentoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function rgpd82Cenario(
    string $modo = 'presencial'
): array {
    $tenant = Tenant::create([
        'nome' => 'Teste RGPD conclusão',
        'slug' =>
            'rgpd82-'.bin2hex(random_bytes(5)),
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

    $assinatura = app(
        RgpdAssinaturaPreparacaoService::class
    )->preparar(
        $tenant->id,
        $ator->id,
        $registo->id,
        $modo,
        'Titular Exemplo',
        $modo === 'remota'
            ? 'titular@example.test'
            : null
    );

    return [
        $tenant,
        $ator,
        $registo,
        $assinatura,
    ];
}

function rgpd82Png(): string
{
    return
        'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'.
        'AAAAC0lEQVR42mP8/x8AAusB9Y9Zkt4AAAAASUVORK5CYII=';
}

test(
    '4r82 assinatura presencial grava evidencia privada e evento imutavel',
    function (): void {
        Storage::fake('local');

        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario();

        $final = app(
            RgpdAssinaturaConclusaoService::class
        )->confirmarPresencial(
            $tenant->id,
            $ator->id,
            $assinatura->id,
            rgpd82Png(),
            true,
            '127.0.0.1',
            'FrotaPRO Test'
        );

        expect($final->status)
            ->toBe('assinado');

        expect($final->assinado_em)
            ->not->toBeNull();

        expect($final->assinatura_sha256)
            ->toHaveLength(64);

        Storage::disk('local')->assertExists(
            $final->assinatura_path
        );

        expect(
            $registo->fresh()->estado
        )->toBe('assinado');

        expect(
            RgpdEvento::query()
                ->where(
                    'rgpd_registo_id',
                    $registo->id
                )
                ->where(
                    'tipo',
                    'assinatura'
                )
                ->count()
        )->toBe(1);

        expect(
            fn () => app(
                RgpdAssinaturaConclusaoService::class
            )->confirmarPresencial(
                $tenant->id,
                $ator->id,
                $assinatura->id,
                rgpd82Png(),
                true
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r82 nao assina escolha retirada nem modelo alterado',
    function (): void {
        Storage::fake('local');

        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario();

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
                RgpdAssinaturaConclusaoService::class
            )->confirmarPresencial(
                $tenant->id,
                $ator->id,
                $assinatura->id,
                rgpd82Png(),
                true
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            $assinatura->fresh()->status
        )->toBe('pendente');
    }
);

test(
    '4r82 rejeita confirmacao falsa imagem invalida e tenant diferente',
    function (): void {
        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario();

        [
            $outro,
            $outroAtor
        ] = rgpd82Cenario();

        $service = app(
            RgpdAssinaturaConclusaoService::class
        );

        expect(
            fn () => $service->confirmarPresencial(
                $tenant->id,
                $ator->id,
                $assinatura->id,
                rgpd82Png(),
                false
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            fn () => $service->confirmarPresencial(
                $tenant->id,
                $ator->id,
                $assinatura->id,
                'data:image/png;base64,INVALIDO',
                true
            )
        )->toThrow(
            ValidationException::class
        );

        expect(
            fn () => $service->confirmarPresencial(
                $outro->id,
                $outroAtor->id,
                $assinatura->id,
                rgpd82Png(),
                true
            )
        )->toThrow(
            ModelNotFoundException::class
        );
    }
);

test(
    '4r82 emissao remota esta desligada por defeito',
    function (): void {
        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario(
            'remota'
        );

        config([
            'rgpd.remote_issuance_enabled' => false,
        ]);

        expect(
            fn () => app(
                RgpdAssinaturaConclusaoService::class
            )->iniciarRemota(
                $tenant->id,
                $ator->id,
                $assinatura->id,
                fn () => null
            )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r82 OTP remoto fica hashed e confirma uma unica vez',
    function (): void {
        Storage::fake('local');

        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario(
            'remota'
        );

        config([
            'rgpd.remote_issuance_enabled' => true,
        ]);

        $credenciais = [];

        $service = app(
            RgpdAssinaturaConclusaoService::class
        );

        $iniciado = $service->iniciarRemota(
            $tenant->id,
            $ator->id,
            $assinatura->id,
            function (
                $email,
                $token,
                $otp,
                $expires
            ) use (
                &$credenciais
            ): void {
                $credenciais = compact(
                    'email',
                    'token',
                    'otp',
                    'expires'
                );
            }
        );

        expect($iniciado->status)
            ->toBe('pendente');

        expect($iniciado->token_hash)
            ->not->toBe(
                $credenciais['token']
            );

        expect($iniciado->otp_hash)
            ->not->toBe(
                $credenciais['otp']
            );

        expect($iniciado->otp_expira_em)
            ->not->toBeNull();

        $concluido = $service->confirmarRemota(
            $credenciais['token'],
            $credenciais['otp'],
            rgpd82Png(),
            $iniciado->documento_sha256,
            $iniciado->escolhas_sha256,
            true,
            '127.0.0.1',
            'Browser Test'
        );

        expect($concluido->status)
            ->toBe('assinado');

        expect($concluido->otp_hash)
            ->toBeNull();

        expect($concluido->token_hash)
            ->toBeNull();

        expect(
            $registo->fresh()->estado
        )->toBe('assinado');

        Storage::disk('local')->assertExists(
            $concluido->assinatura_path
        );

        expect(
            fn () => $service->confirmarRemota(
                $credenciais['token'],
                $credenciais['otp'],
                rgpd82Png(),
                $iniciado->documento_sha256,
                $iniciado->escolhas_sha256,
                true
            )
        )->toThrow(
            ModelNotFoundException::class
        );
    }
);

test(
    '4r82 limite de cinco tentativas OTP persiste no banco',
    function (): void {
        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario(
            'remota'
        );

        config([
            'rgpd.remote_issuance_enabled' => true,
        ]);

        $token = null;

        $service = app(
            RgpdAssinaturaConclusaoService::class
        );

        $iniciado = $service->iniciarRemota(
            $tenant->id,
            $ator->id,
            $assinatura->id,
            function (
                $email,
                $t,
                $otp
            ) use (
                &$token
            ): void {
                $token = $t;
            }
        );

        for ($i = 1; $i <= 5; $i++) {
            try {
                $service->confirmarRemota(
                    $token,
                    '000000',
                    rgpd82Png(),
                    $iniciado->documento_sha256,
                    $iniciado->escolhas_sha256,
                    true
                );

                throw new RuntimeException(
                    'OTP inválido aceite.'
                );
            }
            catch (ValidationException $e) {
                expect($e)
                    ->toBeInstanceOf(
                        ValidationException::class
                    );
            }

            expect(
                (int)$assinatura
                    ->fresh()
                    ->otp_tentativas
            )->toBe($i);
        }

        expect(
            $assinatura->fresh()->status
        )->toBe('bloqueado');

        expect(
            $assinatura->fresh()->token_hash
        )->toBeNull();

        expect(
            $registo->fresh()->estado
        )->toBe('rascunho');
    }
);

test(
    '4r82 despacho falhado desativa o desafio sem o confirmar',
    function (): void {
        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario(
            'remota'
        );

        config([
            'rgpd.remote_issuance_enabled' => true,
        ]);

        expect(
            fn () => app(
                RgpdAssinaturaConclusaoService::class
            )->iniciarRemota(
                $tenant->id,
                $ator->id,
                $assinatura->id,
                fn () => throw new RuntimeException(
                    'Erro transporte'
                )
            )
        )->toThrow(
            RuntimeException::class
        );

        expect(
            $assinatura->fresh()->status
        )->toBe('falha_envio');

        expect(
            $assinatura->fresh()->token_hash
        )->toBeNull();

        expect(
            $assinatura->fresh()->otp_hash
        )->toBeNull();
    }
);

test(
    '4r82 registo assinado e evidencia nao podem ser editados por Eloquent',
    function (): void {
        Storage::fake('local');

        [
            $tenant,
            $ator,
            $registo,
            $assinatura
        ] = rgpd82Cenario();

        app(
            RgpdAssinaturaConclusaoService::class
        )->confirmarPresencial(
            $tenant->id,
            $ator->id,
            $assinatura->id,
            rgpd82Png(),
            true
        );

        $registo = $registo->fresh();

        $registo->titular_nome =
            'Nome adulterado';

        expect(
            fn () => $registo->save()
        )->toThrow(
            LogicException::class
        );

        $assinatura = $assinatura->fresh();

        $assinatura->ip_address =
            '8.8.8.8';

        expect(
            fn () => $assinatura->save()
        )->toThrow(
            LogicException::class
        );

        expect(
            fn () => $assinatura->delete()
        )->toThrow(
            LogicException::class
        );
    }
);
