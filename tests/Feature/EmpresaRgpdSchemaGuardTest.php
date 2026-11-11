<?php

declare(strict_types=1);

use App\Services\EmpresaRgpdSchemaGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

test(
    '4r14b4x reconhece as dezoito colunas RGPD',
    function (): void {
        $guard = app(EmpresaRgpdSchemaGuard::class);

        expect(EmpresaRgpdSchemaGuard::COLUMNS)
            ->toHaveCount(18);

        expect($guard->available())->toBeTrue();
    }
);

test(
    '4r14b4x cadastro legado remove campos vazios',
    function (): void {
        $guard = app(EmpresaRgpdSchemaGuard::class);

        $payload = [
            'nome_empresa' => 'Empresa Ficticia',
            'privacidade_contacto_email' => null,
            'privacidade_prazo_contratos' => '',
        ];

        $result = $guard->filterForAvailability(
            $payload,
            false
        );

        expect($result)->toBe([
            'nome_empresa' => 'Empresa Ficticia',
        ]);
    }
);

test(
    '4r14b4x nunca descarta informacao RGPD preenchida',
    function (): void {
        $guard = app(EmpresaRgpdSchemaGuard::class);

        expect(
            fn () => $guard->filterForAvailability(
                [
                    'nome_empresa' => 'Empresa Ficticia',
                    'privacidade_contacto_email' =>
                        'privacidade@example.invalid',
                ],
                false
            )
        )->toThrow(ValidationException::class);
    }
);

test(
    '4r14b4x schema completo preserva dados RGPD',
    function (): void {
        $guard = app(EmpresaRgpdSchemaGuard::class);

        $payload = [
            'nome_empresa' => 'Empresa Ficticia',
            'privacidade_contacto_email' =>
                'privacidade@example.invalid',
            'privacidade_prazo_contratos' =>
                'Prazo ficticio para teste',
        ];

        expect(
            $guard->filterForAvailability(
                $payload,
                true
            )
        )->toBe($payload);
    }
);