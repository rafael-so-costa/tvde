<?php

declare(strict_types=1);

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Services\FrotaProRgpdV11Service;
use Illuminate\Validation\ValidationException;

test('4r14 reconhece exclusivamente template parametrizado', function (): void {
    $service = app(FrotaProRgpdV11Service::class);

    expect(
        $service->isRgpd(
            new TemplateContrato([
                'conteudo_original' =>
                    '{{RGPD_TITULAR_NOME}} {{RGPD_DECISAO_IMAGEM}}',
            ])
        )
    )->toBeTrue();

    expect(
        $service->isRgpd(
            new TemplateContrato([
                'conteudo_original' => 'Contrato comum',
            ])
        )
    )->toBeFalse();
});

test('4r14 exige assinatura do titular', function (): void {
    $service = app(FrotaProRgpdV11Service::class);

    expect(fn () => $service->assertSigner(
        [],
        ['RGPD_TITULAR_NOME' => 'Titular de Teste']
    ))->toThrow(ValidationException::class);
});

test('4r14 bloqueia signatario de outra pessoa', function (): void {
    $service = app(FrotaProRgpdV11Service::class);

    expect(fn () => $service->assertSigner(
        [[
            'placeholder' => 'ASSINATURA_TITULAR',
            'modo' => 'presencial',
            'signatario_nome' => 'Pessoa Diferente',
        ]],
        [
            'RGPD_TITULAR_NOME' => 'Titular Correto',
        ]
    ))->toThrow(ValidationException::class);
});

test('4r14 bloqueia email remoto diferente do cadastro', function (): void {
    $service = app(FrotaProRgpdV11Service::class);

    expect(fn () => $service->assertSigner(
        [[
            'placeholder' => 'ASSINATURA_TITULAR',
            'modo' => 'remota',
            'signatario_nome' => 'Titular Correto',
            'signatario_email' => 'outro@exemplo.pt',
        ]],
        [
            'RGPD_TITULAR_NOME' => 'Titular Correto',
            'RGPD_TITULAR_TIPO' => 'motorista',
            'RGPD_TITULAR_EMAIL' => 'titular@exemplo.pt',
        ]
    ))->toThrow(ValidationException::class);
});

test('4r14 renderiza escolhas independentes no preview', function (): void {
    $fields = [];

    foreach (array_keys(FrotaProRgpdV11Service::POLICY) as $field) {
        $fields[$field] = 'Definido pela organização';
    }

    $fields += [
        'RGPD_DECISAO_IMAGEM' => 'nao_autorizo',
        'RGPD_DECISAO_VOZ' => 'autorizo',
        'RGPD_DECISAO_GEO' => 'nao_aplicavel',
        'RGPD_DECISAO_SENSIVEIS' => 'nao_autorizo',
        'RGPD_TITULAR_NOME' => 'Titular de Teste',
        'RGPD_TITULAR_NIF' => '123456789',
        'RGPD_TITULAR_QUALIDADE' => 'Motorista',
        'RGPD_TITULAR_IDENTIFICADOR' => 'TESTE',
        'RGPD_TITULAR_CONTACTO' => 'teste@exemplo.pt',
        'RGPD_DATA_DECLARACAO' => '08/11/2026',
        'RGPD_DATA_ESCOLHAS' => '08/11/2026',
    ];

    $contract = new Contrato([
        'campos_preenchidos' => $fields,
    ]);

    $contract->exists = true;

    $values = app(FrotaProRgpdV11Service::class)
        ->pdfValues($contract, true);

    expect($values['RGPD_DECISAO_IMAGEM']['value'])
        ->toBe('NÃO AUTORIZO');

    expect($values['RGPD_DECISAO_VOZ']['value'])
        ->toBe('AUTORIZO');

    expect($values['RGPD_DECISAO_GEO']['value'])
        ->toBe('NÃO APLICÁVEL');
});
