<?php

declare(strict_types=1);

use App\Models\Empresa;
use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Models\ModeloDocumentoSaasVersao;
use App\Models\Motorista;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Services\FrotaProDocumentCatalog;
use App\Services\FrotaProRgpdV11Integration;
use App\Services\FrotaProRgpdV11Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function rgpdV11IntegrationFixture(
    bool $reviewed = true
): array {
    $reflection = new ReflectionClass(
        FrotaProRgpdV11Service::class
    );

    $policyFields = array_values(
        $reflection->getConstant('POLICY')
    );

    $policy = array_fill_keys(
        $policyFields,
        'Condicao especifica definida para teste'
    );

    $tenant = Tenant::create([
        'nome' => 'RGPD Teste',
        'slug' => 'rgpd-integration-'.uniqid(),
        'ativo' => true,
        'settings' => [
            'fleet' => [
                'rgpd' => $policy,
            ],
        ],
    ]);

    $empresa = new Empresa([
        'nome_empresa' => 'Operadora Teste',
        'nif' => '509999999',
        'email' => 'empresa@example.test',
        'ativo' => true,
    ]);

    $empresa->tenant_id = $tenant->id;
    $empresa->save();

    $motorista = new Motorista([
        'nome_completo' => 'Pessoa de Teste',
        'nif' => '123456789',
        'email' => 'motorista@example.test',
        'telemovel' => '912345678',
        'ativo' => true,
    ]);

    $motorista->tenant_id = $tenant->id;
    $motorista->save();

    $categoria = ModeloDocumentoSaasCategoria::create([
        'nome' => 'Protecao de Dados',
        'slug' => 'protecao-de-dados-teste',
        'ativo' => true,
        'ordem' => 90,
    ]);

    $text = implode("\n", [
        '{{RGPD_TITULAR_NOME}}',
        '{{RGPD_DECISAO_IMAGEM}}',
        '{{RGPD_DECISAO_VOZ}}',
        '{{RGPD_DECISAO_GEO}}',
        '{{RGPD_DECISAO_SENSIVEIS}}',
        '{{ASSINATURA_TITULAR}}',
    ]);

    $model = ModeloDocumentoSaas::create([
        'categoria_id' => $categoria->id,
        'nome' => 'RGPD 1.1 de teste',
        'slug' =>
            'informacao-tratamento-dados-rgpd-v11',
        'conteudo' => $text,
        'conteudo_parametrizado' => $text,
        'status' => 'publicado',
        'versao' => '1.1',
        'versao_publicada' => '1.1',
        'tecnicamente_validado' => true,
        'juridicamente_revisto' => $reviewed,
        'publicado_em' => now(),
        'ativo' => true,
        'ordem' => 90,
    ]);

    $version = ModeloDocumentoSaasVersao::create([
        'modelo_documento_saas_id' => $model->id,
        'versao' => '1.1',
        'conteudo_original' => $text,
        'conteudo_parametrizado' => $text,
        'campos_detectados' => [],
        'campos_mapeados' => [],
        'checksum' => hash('sha256', $text),
        'juridicamente_revisto' => $reviewed,
        'publicado_em' => now(),
    ]);

    $template = new TemplateContrato([
        'nome' => 'RGPD 1.1 de teste',
        'tipo_arquivo' => 'txt',
        'conteudo_original' => $text,
    ]);

    $template->tenant_id = $tenant->id;
    $template->ativo = true;
    $template->modelo_documento_saas_id = $model->id;
    $template->modelo_documento_saas_versao_id =
        $version->id;
    $template->modelo_documento_saas_versao = '1.1';
    $template->save();

    return compact(
        'tenant',
        'empresa',
        'motorista',
        'template'
    );
}

function rgpdV11Input(): array
{
    return [
        'RGPD_TITULAR_TIPO' => 'motorista',
        'RGPD_DECISAO_IMAGEM' => 'nao_autorizo',
        'RGPD_DECISAO_VOZ' => 'autorizo',
        'RGPD_DECISAO_GEO' => 'nao_aplicavel',
        'RGPD_DECISAO_SENSIVEIS' => 'nao_aplicavel',
    ];
}

function rgpdV11Signature(
    string $email = 'motorista@example.test'
): array {
    return [[
        'placeholder' => 'ASSINATURA_TITULAR',
        'modo' => 'remota',
        'signatario_nome' => 'Pessoa de Teste',
        'signatario_email' => $email,
    ]];
}

test(
    '4r14b2 preserva catalogo RGPD 1.0 e entrada 1.1',
    function (): void {
        $catalog = app(FrotaProDocumentCatalog::class);

        expect(
            $catalog->find(
                'informacao_tratamento_dados_rgpd'
            )['versao']
        )->toBe('1.0');

        expect($catalog->all())->toHaveCount(9);

        $new = $catalog->find(
            'informacao_tratamento_dados_rgpd_v11'
        );

        expect($new)->not->toBeNull();
        expect($new['versao'])->toBe('1.1');
        expect($new['publicavel'])->toBeFalse();
    }
);

test(
    '4r14b2 bloqueia modelo RGPD sem revisao juridica',
    function (): void {
        $f = rgpdV11IntegrationFixture(false);

        expect(
            fn () =>
                app(FrotaProRgpdV11Integration::class)
                    ->prepare(
                        $f['tenant']->id,
                        $f['template'],
                        rgpdV11Input(),
                        rgpdV11Signature(),
                        $f['motorista'],
                        null,
                        $f['empresa']
                    )
        )->toThrow(ValidationException::class);
    }
);

test(
    '4r14b2 prepara snapshot com decisoes independentes',
    function (): void {
        $f = rgpdV11IntegrationFixture();

        $prepared = app(
            FrotaProRgpdV11Integration::class
        )->prepare(
            $f['tenant']->id,
            $f['template'],
            rgpdV11Input(),
            rgpdV11Signature(),
            $f['motorista'],
            null,
            $f['empresa']
        );

        expect(
            $prepared['snapshot']['RGPD_TITULAR_NOME']
        )->toBe('Pessoa de Teste');

        expect(
            $prepared['snapshot']['RGPD_TITULAR_ID']
        )->toBe($f['motorista']->id);

        expect(
            $prepared['snapshot']['RGPD_DECISAO_IMAGEM']
        )->toBe('nao_autorizo');

        expect(
            $prepared['snapshot']['RGPD_DECISAO_VOZ']
        )->toBe('autorizo');

        expect(
            $prepared['assinaturas'][0]['signatario_id']
        )->toBe($f['motorista']->id);

        expect(
            $prepared['assinaturas'][0]['placeholder']
        )->toBe('ASSINATURA_TITULAR');
    }
);

test(
    '4r14b2 recusa email remoto divergente',
    function (): void {
        $f = rgpdV11IntegrationFixture();

        expect(
            fn () =>
                app(FrotaProRgpdV11Integration::class)
                    ->prepare(
                        $f['tenant']->id,
                        $f['template'],
                        rgpdV11Input(),
                        rgpdV11Signature(
                            'outra@example.test'
                        ),
                        $f['motorista'],
                        null,
                        $f['empresa']
                    )
        )->toThrow(ValidationException::class);
    }
);

test(
    '4r14b2 recusa modelo de outra organizacao',
    function (): void {
        $f = rgpdV11IntegrationFixture();

        $other = Tenant::create([
            'nome' => 'Outra organizacao',
            'slug' => 'outra-'.uniqid(),
            'ativo' => true,
        ]);

        expect(
            fn () =>
                app(FrotaProRgpdV11Integration::class)
                    ->prepare(
                        $other->id,
                        $f['template'],
                        rgpdV11Input(),
                        rgpdV11Signature(),
                        $f['motorista'],
                        null,
                        $f['empresa']
                    )
        )->toThrow(ValidationException::class);
    }
);
/*
 * FROTAPRO_4R14B2C_RGPD_END_TO_END
 *
 * Exercitar a criacao atraves do ContratoService.
 * Nenhum PDF real, numero ou MySQL de producao
 * deve ser utilizado nos testes.
 */

test(
    '4r14b2c cria declaracao rgpd com assinatura remota',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $actor = \App\Models\User::factory()->create([
            'ativo' => true,
        ]);

        $contract = app(
            \App\Services\ContratoService::class
        )->create(
            [
                'tipo' => 'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' =>
                    rgpdV11Signature(),
            ],
            $actor,
            $fixture['tenant']->id
        );

        expect($contract->status)->toBe('enviado');

        expect(
            $contract->campos_preenchidos[
                'RGPD_DECISAO_IMAGEM'
            ]
        )->toBe('nao_autorizo');

        expect(
            $contract->campos_preenchidos[
                'RGPD_DECISAO_VOZ'
            ]
        )->toBe('autorizo');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('tenant_id', $fixture['tenant']->id)
            ->where('contrato_id', $contract->id)
            ->sole();

        expect($signature->placeholder)
            ->toBe('ASSINATURA_TITULAR');

        expect($signature->signatario_id)
            ->toBe($fixture['motorista']->id);

        expect($signature->status)
            ->toBe('pendente');

        expect((bool) $signature->verificado)
            ->toBeFalse();
    }
);

test(
    '4r14b2c bloqueia pdf antes da assinatura rgpd',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $actor = \App\Models\User::factory()->create([
            'ativo' => true,
        ]);

        $contract = app(
            \App\Services\ContratoService::class
        )->create(
            [
                'tipo' => 'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' =>
                    rgpdV11Signature(),
            ],
            $actor,
            $fixture['tenant']->id
        );

        $countBefore = \App\Models\Documento::query()
            ->where('tenant_id', $fixture['tenant']->id)
            ->count();

        expect(
            fn () => app(
                \App\Services\ContratoPdfService::class
            )->generate(
                $contract->id,
                $fixture['tenant']->id,
                $actor
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );

        $countAfter = \App\Models\Documento::query()
            ->where('tenant_id', $fixture['tenant']->id)
            ->count();

        expect($countAfter)->toBe($countBefore);
    }
);
/*
 * FROTAPRO_4R14B3B_RENDERING_REGRESSION
 *
 * Exercitar HTML e PDF temporario com
 * snapshot RGPD, sem numero documental.
 */

test(
    '4r14b3b preview rgpd renderiza decisoes',
    function (): void {
        $fixture = rgpdV11IntegrationFixture();

        $payload = [
            'tipo' => 'rgpd_informacao_autorizacoes',

            'template_id' =>
                $fixture['template']->id,

            'empresa_id' =>
                $fixture['empresa']->id,

            'motorista_id' =>
                $fixture['motorista']->id,

            'campos_preenchidos' =>
                rgpdV11Input(),

            'assinaturas' => [],
        ];

        $result = app(
            \App\Services\ContratoPreviewService::class
        )->preview(
            $payload,
            (string) $fixture['tenant']->id
        );

        $html = (string) ($result['html'] ?? '');

        expect($html)->not->toBe('');

        expect($html)
            ->toContain('Pessoa de Teste');

        expect($html)
            ->toContain('NÃO AUTORIZO');

        expect($html)
            ->toContain('AUTORIZO');

        expect($html)
            ->toContain('Assinatura a recolher');
    }
);

test(
    '4r14b3b pdf temporario rgpd nao cria documentos',
    function (): void {
        $fixture = rgpdV11IntegrationFixture();

        $before = [
            'contratos' => \App\Models\Contrato::count(),
            'documentos' => \App\Models\Documento::count(),
            'assinaturas' =>
                \App\Models\AssinaturaDigital::count(),
        ];

        $result = app(
            \App\Services\ContratoPreviewService::class
        )->preview(
            [
                'tipo' => 'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' => [],
            ],
            (string) $fixture['tenant']->id
        );

        $html = (string) ($result['html'] ?? '');

        $binary = \Barryvdh\DomPDF\Facade\Pdf::loadHTML(
            $html
        )
            ->setPaper('a4', 'portrait')
            ->output();

        expect($binary)->toBeString();

        expect(
            str_starts_with($binary, '%PDF-')
        )->toBeTrue();

        expect(
            strlen($binary)
        )->toBeGreaterThan(1000);

        $after = [
            'contratos' => \App\Models\Contrato::count(),
            'documentos' => \App\Models\Documento::count(),
            'assinaturas' =>
                \App\Models\AssinaturaDigital::count(),
        ];

        expect($after)->toBe($before);
    }
);
/*
 * FROTAPRO_4R14B3C_RGPD_OTP_PDF_NUMBERING
 *
 * Cobertura adicional:
 * - OTP incorreto
 * - OTP correto e assinatura verificada
 * - Integridade da imagem de assinatura
 * - Emissao definitiva
 * - Hash SHA-256 do PDF
 * - Numeracao global e idempotencia
 * - Preview do template RGPD 1.1 integral
 *
 * SQLite em memoria e Storage::fake('local').
 */

test(
    '4r14b3c otp incorreto nao consome numero',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $actor = \App\Models\User::factory()->create([
            'ativo' => true,
        ]);

        $sequenceBefore = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        $contract = app(
            \App\Services\ContratoService::class
        )->create(
            [
                'tipo' => 'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' =>
                    rgpdV11Signature(),
            ],
            $actor,
            (string) $fixture['tenant']->id
        );

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $contract->id)
            ->sole();

        $wrongOtp = (string) $signature->codigo_otp
            === '000000'
                ? '999999'
                : '000000';

        $png = 'data:image/png;base64,'.
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'.
            'AAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

        expect(
            fn () => app(
                \App\Services\ContratoService::class
            )->confirmRemoteSignature(
                (string) $signature->token_verificacao,
                $wrongOtp,
                $png
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );

        $signature->refresh();
        $contract->refresh();

        expect($signature->status)->toBe('pendente');
        expect((bool) $signature->verificado)->toBeFalse();

        expect($contract->status)->toBe('enviado');
        expect($contract->pdf_gerado_url)->toBeNull();

        $sequenceAfter = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        expect($sequenceAfter)->toBe($sequenceBefore);

        expect(
            \App\Models\Documento::query()
                ->where('entidade_tipo', 'contrato')
                ->where('entidade_id', $contract->id)
                ->exists()
        )->toBeFalse();

        expect(
            \Illuminate\Support\Facades\Storage::disk('local')
                ->allFiles('contract-signatures')
        )->toBe([]);
    }
);

test(
    '4r14b3c otp correto permite pdf definitivo idempotente',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $actor = \App\Models\User::factory()->create([
            'ativo' => true,
        ]);

        $sequenceBefore = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        $contract = app(
            \App\Services\ContratoService::class
        )->create(
            [
                'tipo' => 'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' =>
                    rgpdV11Signature(),
            ],
            $actor,
            (string) $fixture['tenant']->id
        );

        expect($contract->status)->toBe('enviado');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $contract->id)
            ->sole();

        $token = (string) $signature->token_verificacao;
        $otp = (string) $signature->codigo_otp;

        expect($otp)->toMatch('/^\d{6}$/');
        expect($token)->not->toBe('');

        $png = 'data:image/png;base64,'.
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'.
            'AAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

        $confirmation = app(
            \App\Services\ContratoService::class
        )->confirmRemoteSignature(
            $token,
            $otp,
            $png,
            '127.0.0.1',
            'FrotaPro RGPD Test'
        );

        expect($confirmation['contrato_status'])
            ->toBe('assinado');

        $contract->refresh();
        $signature->refresh();

        expect($contract->status)->toBe('assinado');

        expect($contract->data_assinatura)
            ->not->toBeNull();

        expect($signature->status)->toBe('assinado');

        expect((bool) $signature->verificado)
            ->toBeTrue();

        expect($signature->token_verificacao)
            ->toBeNull();

        expect($signature->codigo_otp)
            ->toBeNull();

        expect($signature->hash_documento)
            ->toMatch('/^[a-f0-9]{64}$/');

        \Illuminate\Support\Facades\Storage::disk('local')
            ->assertExists(
                (string) $signature->assinatura_url
            );

        /*
         * A assinatura nao pode consumir
         * numero global antes da emissao.
         */
        $sequenceAfterSignature = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        expect($sequenceAfterSignature)
            ->toBe($sequenceBefore);

        /*
         * Verificar o HTML definitivo:
         * deve conter imagem real de assinatura
         * e nao a mensagem de pendencia.
         */
        $contract->load([
            'template',
            'empresa',
            'motorista',
            'assinaturas',
        ]);

        $html = app(
            \App\Services\ContratoPdfService::class
        )->renderHtml(
            $contract,
            $fixture['empresa'],
            false
        );

        expect($html)
            ->toContain('data:image/png;base64,');

        expect($html)
            ->not->toContain('Assinatura a recolher');

        /*
         * Emissao definitiva: numero,
         * armazenamento, hash e auditoria.
         */
        $issued = app(
            \App\Services\ContratoPdfService::class
        )->generate(
            $contract->id,
            (string) $fixture['tenant']->id,
            $actor
        );

        $issued->refresh();

        expect($issued->pdf_gerado_url)
            ->not->toBeNull();

        expect($issued->hash_documento)
            ->toMatch('/^[a-f0-9]{64}$/');

        $disk = \Illuminate\Support\Facades\Storage::disk(
            'local'
        );

        $disk->assertExists(
            (string) $issued->pdf_gerado_url
        );

        $binary = $disk->get(
            (string) $issued->pdf_gerado_url
        );

        expect($binary)->toStartWith('%PDF-');

        expect(hash('sha256', $binary))
            ->toBe($issued->hash_documento);

        $document = \App\Models\Documento::query()
            ->where('tenant_id', $fixture['tenant']->id)
            ->where('entidade_tipo', 'contrato')
            ->where('entidade_id', $contract->id)
            ->sole();

        expect($document->codigo)
            ->toMatch('/^G\d{6}$/');

        expect($document->categoria)
            ->toBe('rgpd');

        $sequenceAfterIssuance = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        expect($sequenceAfterIssuance)
            ->toBe($sequenceBefore + 1);

        /*
         * Segunda geracao nao pode
         * reservar outro numero.
         */
        $issuedAgain = app(
            \App\Services\ContratoPdfService::class
        )->generate(
            $contract->id,
            (string) $fixture['tenant']->id,
            $actor
        );

        expect($issuedAgain->hash_documento)
            ->toBe($issued->hash_documento);

        expect($issuedAgain->pdf_gerado_url)
            ->toBe($issued->pdf_gerado_url);

        $sequenceAfterRepeat = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        expect($sequenceAfterRepeat)
            ->toBe($sequenceAfterIssuance);

        expect(
            \App\Models\Documento::query()
                ->where('tenant_id', $fixture['tenant']->id)
                ->where('entidade_tipo', 'contrato')
                ->where('entidade_id', $contract->id)
                ->count()
        )->toBe(1);

        expect(
            \App\Models\LogAuditoriaContrato::query()
                ->where('contrato_id', $contract->id)
                ->where('acao', 'geracao_pdf')
                ->count()
        )->toBe(1);
    }
);

test(
    '4r14b3c template integral rgpd sem placeholders pendentes',
    function (): void {
        $fixture = rgpdV11IntegrationFixture();

        $path = resource_path(
            'frotapro/documentos/informacao-tratamento-dados-rgpd-v1-1.txt'
        );

        expect(is_file($path))->toBeTrue();

        $content = file_get_contents($path);

        expect($content)->toBeString();

        expect($content)
            ->toContain('{{RGPD_TITULAR_NOME}}');

        expect($content)
            ->toContain('{{RGPD_DECISAO_IMAGEM}}');

        expect($content)
            ->toContain('{{ASSINATURA_TITULAR}}');

        /*
         * Substituir apenas a estrutura da
         * fixture, dentro do SQLite de teste.
         *
         * O modelo SaaS de producao nao e alterado.
         */
        $fixture['template']->conteudo_original = $content;
        $fixture['template']->save();

        /*
         * Endereco completo exigido pelo
         * documento RGPD integral.
         */
        $fixture['empresa']->endereco_rua =
            'Rua de Teste';

        $fixture['empresa']->endereco_numero = '10';

        $fixture['empresa']->endereco_cep = '1000-001';

        $fixture['empresa']->endereco_cidade = 'Lisboa';

        $fixture['empresa']->save();

        $result = app(
            \App\Services\ContratoPreviewService::class
        )->preview(
            [
                'tipo' => 'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' => [],
            ],
            (string) $fixture['tenant']->id
        );

        $html = (string) ($result['html'] ?? '');

        expect($html)->not->toBe('');

        expect($html)
            ->toContain('Pessoa de Teste');

        expect($html)
            ->toContain('Operadora Teste');

        expect($html)
            ->toContain('Assinatura a recolher');

        /*
         * Verificar se restam tokens canonicos
         * {{NOME_DO_CAMPO}} no documento.
         */
        $unresolved = [];

        $count = preg_match_all(
            '/\{\{\s*[A-Z][A-Z0-9_]*\s*\}\}/',
            $html,
            $unresolved
        );

        expect($count)
            ->toBe(0);
    }
);
/*
 * FROTAPRO_4R14B3D_INTEGRAL_RELEASE_PROVENANCE
 *
 * Apenas fixtures de teste em SQLite.
 *
 * O documento integral, o modelo SaaS e a versao
 * publicada sao sincronizados exclusivamente
 * dentro da transacao/base de teste.
 */

function rgpdV11FullOfficialFixture(): array
{
    $fixture = rgpdV11IntegrationFixture();

    $content = file_get_contents(resource_path(
        'frotapro/documentos/informacao-tratamento-dados-rgpd-v1-1.txt'
    ));

    if (!is_string($content) || trim($content) === '') {
        throw new \RuntimeException(
            'Texto integral RGPD 1.1 indisponivel.'
        );
    }

    $template = $fixture['template'];

    $modelId = (string)
        $template->modelo_documento_saas_id;

    $versionId = (string)
        $template->modelo_documento_saas_versao_id;

    if ($modelId === '' || $versionId === '') {
        throw new \RuntimeException(
            'Fixture sem proveniencia SaaS.'
        );
    }

    $model = \App\Models\ModeloDocumentoSaas::query()
        ->findOrFail($modelId);

    $version = \App\Models\ModeloDocumentoSaasVersao::query()
        ->where('modelo_documento_saas_id', $modelId)
        ->findOrFail($versionId);

    /*
     * Reconstituir uma versao de teste cujo
     * conteudo e checksum correspondem ao
     * ficheiro integral RGPD 1.1.
     *
     * Isto NAO representa aprovacao juridica.
     */
    $model->conteudo = $content;
    $model->conteudo_parametrizado = $content;
    $model->save();

    $version->conteudo_original = $content;
    $version->conteudo_parametrizado = $content;
    $version->checksum = hash('sha256', $content);
    $version->save();

    $template->conteudo_original = $content;
    $template->save();

    /*
     * Campos reais exigidos pelo documento
     * integral, preenchidos com dados ficticios.
     */
    $fixture['empresa']->endereco_rua =
        'Rua da Verificacao';

    $fixture['empresa']->endereco_numero = '12';

    $fixture['empresa']->endereco_cep = '1000-001';

    $fixture['empresa']->endereco_cidade = 'Lisboa';

    $fixture['empresa']->save();

    $fixture['full_content'] = $content;

    $fixture['full_checksum'] =
        hash('sha256', $content);

    return $fixture;
}

test(
    '4r14b3d modelo rgpd alterado sem checksum recusa emissao',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');

        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $actor = \App\Models\User::factory()->create([
            'ativo' => true,
        ]);

        $tenantId = (string) $fixture['tenant']->id;

        $beforeCount = \App\Models\Contrato::query()
            ->where('tenant_id', $tenantId)
            ->count();

        $beforeNumber = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        /*
         * Alteracao nao autorizada:
         * o template deixa de corresponder ao
         * checksum da versao SaaS publicada.
         */
        $fixture['template']->conteudo_original .=
            "\n<p>ALTERACAO SEM REVISAO</p>";

        $fixture['template']->save();

        expect(
            fn () => app(
                \App\Services\ContratoService::class
            )->create(
                [
                    'tipo' =>
                        'rgpd_informacao_autorizacoes',

                    'template_id' =>
                        $fixture['template']->id,

                    'empresa_id' =>
                        $fixture['empresa']->id,

                    'motorista_id' =>
                        $fixture['motorista']->id,

                    'campos_preenchidos' =>
                        rgpdV11Input(),

                    'assinaturas' =>
                        rgpdV11Signature(),
                ],
                $actor,
                $tenantId
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );

        expect(
            \App\Models\Contrato::query()
                ->where('tenant_id', $tenantId)
                ->count()
        )->toBe($beforeCount);

        expect(
            (int) \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero')
        )->toBe($beforeNumber);

        expect(
            \App\Models\Documento::query()
                ->where('tenant_id', $tenantId)
                ->exists()
        )->toBeFalse();
    }
);

test(
    '4r14b3d rgpd integral otp pdf hash e numero',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');

        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $actor = \App\Models\User::factory()->create([
            'ativo' => true,
        ]);

        $tenantId = (string) $fixture['tenant']->id;

        $beforeNumber = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        /*
         * Criar declaracao com o documento
         * integral e proveniencia coerente.
         */
        $contract = app(
            \App\Services\ContratoService::class
        )->create(
            [
                'tipo' =>
                    'rgpd_informacao_autorizacoes',

                'template_id' =>
                    $fixture['template']->id,

                'empresa_id' =>
                    $fixture['empresa']->id,

                'motorista_id' =>
                    $fixture['motorista']->id,

                'campos_preenchidos' =>
                    rgpdV11Input(),

                'assinaturas' =>
                    rgpdV11Signature(),
            ],
            $actor,
            $tenantId
        );

        expect($contract->status)->toBe('enviado');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $contract->id)
            ->sole();

        $png = 'data:image/png;base64,'.
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'.
            'AAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

        /*
         * Confirmacao OTP atraves do servico
         * real de assinatura remota.
         */
        app(
            \App\Services\ContratoService::class
        )->confirmRemoteSignature(
            (string) $signature->token_verificacao,
            (string) $signature->codigo_otp,
            $png,
            '127.0.0.1',
            'RGPD Full Document Test'
        );

        $contract->refresh()->load([
            'template',
            'empresa',
            'motorista',
            'assinaturas',
        ]);

        expect($contract->status)->toBe('assinado');

        /*
         * Renderizar o HTML definitivo.
         * A assinatura deve ser uma imagem e
         * nao texto de assinatura pendente.
         */
        $html = app(
            \App\Services\ContratoPdfService::class
        )->renderHtml(
            $contract,
            $fixture['empresa'],
            false
        );

        expect($html)
            ->toContain('data:image/png;base64,');

        expect($html)
            ->toContain('Pessoa de Teste');

        expect($html)
            ->not->toContain('{{');

        expect($html)
            ->not->toContain('Assinatura a recolher');

        /*
         * Emissao oficial de TESTE.
         * Storage e base de dados sao isolados.
         */
        $issued = app(
            \App\Services\ContratoPdfService::class
        )->generate(
            $contract->id,
            $tenantId,
            $actor
        );

        expect($issued->hash_documento)
            ->toMatch('/^[a-f0-9]{64}$/');

        $path = (string) $issued->pdf_gerado_url;

        \Illuminate\Support\Facades\Storage::disk('local')
            ->assertExists($path);

        $binary =
            \Illuminate\Support\Facades\Storage::disk('local')
                ->get($path);

        expect($binary)->toStartWith('%PDF-');

        expect(hash('sha256', $binary))
            ->toBe($issued->hash_documento);

        /*
         * Ler efetivamente o PDF gerado e
         * verificar o titular e as decisoes.
         */
        $text = (new \Smalot\PdfParser\Parser())
            ->parseContent($binary)
            ->getText();

        $normalized = mb_strtoupper(
            \Illuminate\Support\Str::ascii(
                (string) preg_replace(
                    '/\s+/u',
                    ' ',
                    $text
                )
            ),
            'UTF-8'
        );

        expect($normalized)
            ->toContain('PESSOA DE TESTE');

        expect($normalized)
            ->toContain('NAO AUTORIZO');

        expect($normalized)
            ->toContain('AUTORIZO');

        /*
         * A numeracao global so deve ter
         * avancado durante a emissao.
         */
        $document = \App\Models\Documento::query()
            ->where('tenant_id', $tenantId)
            ->where('entidade_tipo', 'contrato')
            ->where('entidade_id', $contract->id)
            ->sole();

        expect($document->codigo)
            ->toMatch('/^G\d{6}$/');

        expect($document->categoria)
            ->toBe('rgpd');

        $number = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        expect($number)->toBe($beforeNumber + 1);

        /*
         * Emissao repetida deve preservar
         * o ficheiro e o numero anteriores.
         */
        $again = app(
            \App\Services\ContratoPdfService::class
        )->generate(
            $contract->id,
            $tenantId,
            $actor
        );

        expect($again->pdf_gerado_url)
            ->toBe($path);

        expect($again->hash_documento)
            ->toBe($issued->hash_documento);

        expect(
            (int) \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero')
        )->toBe($number);
    }
);
/*
 * FROTAPRO_4R14B3G_HTTP_RGPD
 *
 * Cobertura HTTP real:
 * - POST preview HTML
 * - POST preview PDF
 * - POST criacao de declaracao RGPD
 * - Protecao de permissoes
 *
 * Usa login HTTP, SQLite e Storage fake.
 */

function rgpdV11HttpLogin(
    $test,
    \App\Models\Tenant $tenant,
    string $nivel = 'configurar'
): void {
    $user = \App\Models\User::factory()->create([
        'email' => 'http-rgpd-'.\Illuminate\Support\Str::uuid().
            '@frotapro.test',

        'password' =>
            \Illuminate\Support\Facades\Hash::make(
                'SenhaTeste123!'
            ),

        'ativo' => true,
    ]);

    \App\Models\TenantUser::query()->create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = \App\Models\Role::query()->firstOrCreate(
        ['codigo' => 'funcionario'],
        [
            'nome' => 'Funcionário',
            'sistema' => true,
        ]
    );

    \App\Models\UserRole::query()->create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    $permission = \App\Models\Permission::query()
        ->firstOrCreate(
            ['codigo' => 'contratos'],
            [
                'modulo' => 'contratos',
                'nome' => 'Contratos',
            ]
        );

    \App\Models\RolePermission::query()
        ->updateOrCreate(
            [
                'role_id' => $role->id,
                'permission_id' => $permission->id,
            ],
            ['nivel' => $nivel]
        );

    $test
        ->postJson('/login', [
            'email' => $user->email,
            'password' => 'SenhaTeste123!',
        ])
        ->assertOk();
}

function rgpdV11HttpHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function rgpdV11HttpPayload(array $fixture): array
{
    return [
        'tipo' => 'rgpd_informacao_autorizacoes',

        'template_id' => $fixture['template']->id,

        'empresa_id' => $fixture['empresa']->id,

        'motorista_id' => $fixture['motorista']->id,

        'proprietario_id' => null,

        'campos_preenchidos' =>
            rgpdV11Input() + [
                'RGPD_TITULAR_ID' => '',
                'RGPD_OUTRO_NOME' => '',
                'RGPD_OUTRO_NIF' => '',
                'RGPD_OUTRO_CONTACTO' => '',
                'RGPD_OUTRO_IDENTIFICADOR' => '',
            ],

        'assinaturas' => [],
    ];
}

test(
    '4r14b3g preview rgpd http html e pdf nao persistem',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');

        $fixture = rgpdV11IntegrationFixture();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpdV11HttpPayload($fixture);

        $beforeContracts = \App\Models\Contrato::count();

        $beforeDocuments = \App\Models\Documento::count();

        $beforeNumber = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        $htmlResponse = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos/preview',
                $payload
            )
            ->assertOk();

        $html = $htmlResponse->json('data.html');

        expect($html)->toBeString();

        expect($html)
            ->toContain('Pessoa de Teste');

        /*
         * Esta rota e chamada pelo modal React.
         * O PDF deve ser obtido ANTES da assinatura,
         * sem atribuir numero documental.
         */
        $pdfResponse = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos/preview-pdf',
                $payload
            )
            ->assertOk();

        $binary = $pdfResponse->getContent();

        expect($binary)->toBeString();

        expect($binary)->toStartWith('%PDF-');

        expect(strlen($binary))
            ->toBeGreaterThan(1000);

        expect(\App\Models\Contrato::count())
            ->toBe($beforeContracts);

        expect(\App\Models\Documento::count())
            ->toBe($beforeDocuments);

        expect(
            (int) \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero')
        )->toBe($beforeNumber);
    }
);

test(
    '4r14b3g criacao rgpd http gera assinatura pendente',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpdV11HttpPayload($fixture);

        $payload['assinaturas'] = rgpdV11Signature();

        $beforeNumber = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero');

        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertCreated()
            ->assertJsonPath('data.status', 'enviado');

        $id = (string) $response->json('data.id');

        expect($id)->not->toBe('');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $id)
            ->sole();

        expect($signature->placeholder)
            ->toBe('ASSINATURA_TITULAR');

        expect($signature->status)
            ->toBe('pendente');

        expect((bool) $signature->verificado)
            ->toBeFalse();

        expect(
            \App\Models\Documento::query()
                ->where('entidade_tipo', 'contrato')
                ->where('entidade_id', $id)
                ->exists()
        )->toBeFalse();

        expect(
            (int) \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
                ->where('chave', 'documentos')
                ->value('ultimo_numero')
        )->toBe($beforeNumber);
    }
);

test(
    '4r14b3g visualizador nao cria nem previsualiza pdf rgpd',
    function (): void {
        $fixture = rgpdV11IntegrationFixture();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant'],
            'visualizar'
        );

        $payload = rgpdV11HttpPayload($fixture);

        $payload['assinaturas'] = rgpdV11Signature();

        $before = \App\Models\Contrato::count();

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertForbidden();

        $payload['assinaturas'] = [];

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos/preview-pdf',
                $payload
            )
            ->assertForbidden();

        expect(\App\Models\Contrato::count())
            ->toBe($before);
    }
);
/*
 * FROTAPRO_4R14B3H_HOLDER_TYPES
 *
 * Os testes abaixo utilizam:
 * - Base SQLite de teste
 * - Storage fake
 * - Mail fake
 * - Login HTTP real
 * - Permissoes e tenant reais
 *
 * Nenhuma operacao na base operacional.
 */

function rgpdV11HolderSignature(
    string $name,
    string $email,
    string $mode = 'remota'
): array {
    $png = 'data:image/png;base64,'.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'.
        'AAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

    return [[
        'placeholder' => 'ASSINATURA_TITULAR',
        'modo' => $mode,
        'signatario_nome' => $name,
        'signatario_email' => $email,
        'assinatura_url' =>
            $mode === 'presencial' ? $png : null,
    ]];
}

test(
    '4r14b3h proprietario emite declaracao remota',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $owner = new \App\Models\Proprietario([
            'tipo' => 'pessoa_fisica',
            'nome_completo' => 'Proprietaria RGPD',
            'nif' => '123456789',
            'email' => 'proprietaria@frotapro.test',
            'telemovel' => '912345678',
        ]);

        $owner->tenant_id = $fixture['tenant']->id;
        $owner->save();

        rgpdV11HttpLogin($this, $fixture['tenant']);

        $payload = rgpdV11HttpPayload($fixture);

        $payload['motorista_id'] = null;
        $payload['proprietario_id'] = $owner->id;

        $payload['campos_preenchidos']
            ['RGPD_TITULAR_TIPO'] = 'proprietario';

        $payload['assinaturas'] =
            rgpdV11HolderSignature(
                'Proprietaria RGPD',
                'proprietaria@frotapro.test'
            );

        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson('/api/contratos', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'enviado');

        $id = $response->json('data.id');

        $contract = \App\Models\Contrato::findOrFail($id);

        expect($contract->proprietario_id)
            ->toBe($owner->id);

        expect($contract->motorista_id)
            ->toBeNull();

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $id)
            ->sole();

        expect($signature->signatario_nome)
            ->toBe('Proprietaria RGPD');

        expect($signature->signatario_email)
            ->toBe('proprietaria@frotapro.test');

        expect($signature->status)
            ->toBe('pendente');
    }
);

test(
    '4r14b3h colaborador emite declaracao remota',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $employee = new \App\Models\Funcionario([
            'nome' => 'Colaborador RGPD',
            'nif' => '123456789',
            'email' => 'colaborador@frotapro.test',
            'telefone' => '912345678',
            'estado' => 'ativo',
            'data_admissao' => '2026-11-01',
        ]);

        $employee->tenant_id = $fixture['tenant']->id;
        $employee->save();

        rgpdV11HttpLogin($this, $fixture['tenant']);

        $payload = rgpdV11HttpPayload($fixture);

        $payload['motorista_id'] = null;
        $payload['proprietario_id'] = null;

        $payload['campos_preenchidos']
            ['RGPD_TITULAR_TIPO'] = 'colaborador';

        $payload['campos_preenchidos']
            ['RGPD_TITULAR_ID'] = $employee->id;

        $payload['assinaturas'] =
            rgpdV11HolderSignature(
                'Colaborador RGPD',
                'colaborador@frotapro.test'
            );

        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson('/api/contratos', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'enviado');

        $contract = \App\Models\Contrato::findOrFail(
            $response->json('data.id')
        );

        expect($contract->motorista_id)->toBeNull();

        expect($contract->proprietario_id)->toBeNull();

        $fields = (array) $contract->campos_preenchidos;

        expect($fields['RGPD_TITULAR_ID'] ?? null)
            ->toBe($employee->id);

        expect($fields['RGPD_TITULAR_NOME'] ?? null)
            ->toBe('Colaborador RGPD');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $contract->id)
            ->sole();

        expect($signature->status)->toBe('pendente');

        expect($signature->signatario_email)
            ->toBe('colaborador@frotapro.test');
    }
);

test(
    '4r14b3h externo com email assina presencialmente',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        rgpdV11HttpLogin($this, $fixture['tenant']);

        $payload = rgpdV11HttpPayload($fixture);

        $payload['motorista_id'] = null;
        $payload['proprietario_id'] = null;

        $payload['campos_preenchidos']
            ['RGPD_TITULAR_TIPO'] = 'outro';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_NOME'] = 'Titular Externo RGPD';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_NIF'] = '123456789';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_CONTACTO'] = 'externo@frotapro.test';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_IDENTIFICADOR'] = 'EXT-001';

        $payload['assinaturas'] =
            rgpdV11HolderSignature(
                'Titular Externo RGPD',
                '',
                'presencial'
            );

        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson('/api/contratos', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'assinado');

        $id = $response->json('data.id');

        $contract = \App\Models\Contrato::findOrFail($id);

        $fields = (array) $contract->campos_preenchidos;

        expect($fields['RGPD_TITULAR_NOME'] ?? null)
            ->toBe('Titular Externo RGPD');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $id)
            ->sole();

        expect($signature->placeholder)
            ->toBe('ASSINATURA_TITULAR');

        expect($signature->status)->toBe('assinado');

        expect((bool) $signature->verificado)
            ->toBeTrue();
    }
);

test(
    '4r14b3h externo com telefone assina presencialmente',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        rgpdV11HttpLogin($this, $fixture['tenant']);

        $payload = rgpdV11HttpPayload($fixture);

        $payload['motorista_id'] = null;
        $payload['proprietario_id'] = null;

        $payload['campos_preenchidos']
            ['RGPD_TITULAR_TIPO'] = 'outro';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_NOME'] = 'Titular Contacto Telefonico';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_NIF'] = '123456789';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_CONTACTO'] = '912345678';

        $payload['campos_preenchidos']
            ['RGPD_OUTRO_IDENTIFICADOR'] = 'EXT-002';

        $payload['assinaturas'] =
            rgpdV11HolderSignature(
                'Titular Contacto Telefonico',
                '',
                'presencial'
            );

        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson('/api/contratos', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'assinado');

        $contract = \App\Models\Contrato::findOrFail(
            $response->json('data.id')
        );

        $fields = (array) $contract->campos_preenchidos;

        expect($fields['RGPD_TITULAR_CONTACTO'] ?? null)
            ->toBe('912345678');

        expect($fields['RGPD_TITULAR_TIPO'] ?? null)
            ->toBe('outro');

        $signature = \App\Models\AssinaturaDigital::query()
            ->where('contrato_id', $contract->id)
            ->sole();

        expect($signature->status)->toBe('assinado');
    }
);

test(
    '4r14b3h bloqueia titulares de outro tenant',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture();

        $otherTenant = \App\Models\Tenant::query()->create([
            'nome' => 'Organizacao Alheia RGPD',
            'slug' => 'organizacao-alheia-rgpd',
            'ativo' => true,
        ]);

        $otherOwner = new \App\Models\Proprietario([
            'tipo' => 'pessoa_fisica',
            'nome_completo' => 'Proprietario Alheio',
            'nif' => '123456789',
            'email' => 'alheio@frotapro.test',
            'telemovel' => '912345678',
        ]);

        $otherOwner->tenant_id = $otherTenant->id;
        $otherOwner->save();

        $otherEmployee = new \App\Models\Funcionario([
            'nome' => 'Colaborador Alheio',
            'nif' => '123456789',
            'email' => 'empregado.alheio@frotapro.test',
            'telefone' => '912345678',
            'estado' => 'ativo',
            'data_admissao' => '2026-11-01',
        ]);

        $otherEmployee->tenant_id = $otherTenant->id;
        $otherEmployee->save();

        rgpdV11HttpLogin($this, $fixture['tenant']);

        $before = \App\Models\Contrato::count();

        $ownerPayload = rgpdV11HttpPayload($fixture);

        $ownerPayload['motorista_id'] = null;

        $ownerPayload['proprietario_id'] =
            $otherOwner->id;

        $ownerPayload['campos_preenchidos']
            ['RGPD_TITULAR_TIPO'] = 'proprietario';

        $ownerPayload['assinaturas'] =
            rgpdV11HolderSignature(
                'Proprietario Alheio',
                'alheio@frotapro.test'
            );

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson('/api/contratos', $ownerPayload)
            ->assertUnprocessable();

        $employeePayload = rgpdV11HttpPayload($fixture);

        $employeePayload['motorista_id'] = null;

        $employeePayload['campos_preenchidos']
            ['RGPD_TITULAR_TIPO'] = 'colaborador';

        $employeePayload['campos_preenchidos']
            ['RGPD_TITULAR_ID'] = $otherEmployee->id;

        $employeePayload['assinaturas'] =
            rgpdV11HolderSignature(
                'Colaborador Alheio',
                'empregado.alheio@frotapro.test'
            );

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson('/api/contratos', $employeePayload)
            ->assertUnprocessable();

        expect(\App\Models\Contrato::count())
            ->toBe($before);
    }
);

/*
 * FROTAPRO_4R14B4I_HTTP_GLOBAL_TYPE
 *
 * Integração HTTP do RGPD pelo tipo documental.
 *
 * As aprovações jurídicas desta fixture existem
 * apenas na base SQLite isolada de testes.
 *
 * Não representa aprovação do modelo real.
 */

function rgpd4iType(array $fixture): \App\Models\TipoContrato
{
    $tenant = $fixture['tenant'];

    $workflow = new \App\Models\ChecklistProcessTemplate([
        'codigo' => 'rgpd_informacao_autorizacoes',
        'nome' => 'Workflow RGPD de teste',
        'ativo' => true,
        'versao' => 1,
    ]);

    $workflow->tenant_id = $tenant->id;
    $workflow->save();

    $item = new \App\Models\ChecklistProcessTemplateItem([
        'codigo' => 'validar_itens_rgpd',
        'ordem' => 1,
        'titulo' => 'Validar itens RGPD',
        'tipo' => 'tarefa',
        'obrigatorio' => true,
        'configuracao' => [],
    ]);

    $item->template_id = $workflow->id;
    $item->save();

    $manual = [
        'RGPD_TITULAR_TIPO' => [
            'motorista',
            'proprietario',
            'colaborador',
            'outro',
        ],

        'RGPD_DECISAO_IMAGEM' => [
            'autorizo',
            'nao_autorizo',
        ],

        'RGPD_DECISAO_VOZ' => [
            'autorizo',
            'nao_autorizo',
        ],

        'RGPD_DECISAO_GEO' => [
            'autorizo',
            'nao_autorizo',
            'nao_aplicavel',
        ],

        'RGPD_DECISAO_SENSIVEIS' => [
            'autorizo',
            'nao_autorizo',
            'nao_aplicavel',
        ],
    ];

    $fields = [];

    foreach ($manual as $name => $options) {
        $fields[] = [
            'campo' => $name,
            'origem' => 'manual',
            'tipo' => 'select',
            'obrigatorio' => true,
            'opcoes' => $options,
        ];
    }

    $type = new \App\Models\TipoContrato([
        'nome' => 'RGPD Global - Teste',
        'slug' => 'rgpd-global-4i-teste',
        'codigo' => 'rgpd_informacao_autorizacoes',

        'template_id' =>
            $fixture['template']->id,

        'checklist_process_template_id' =>
            $workflow->id,

        'entidades' => [
            'empresa' => true,
            'motorista' => true,
        ],

        'campos_configuracao' => $fields,

        'assinaturas_configuracao' => [[
            'placeholder' => 'ASSINATURA_TITULAR',
            'obrigatoria' => true,
            'modos' => [
                'presencial',
                'remota',
            ],
        ]],

        'configuracao' => [
            'associar_motorista_veiculo' => false,
        ],

        'ativo' => true,
        'mostrar_menu' => true,
        'ordem' => 1,
    ]);

    $type->tenant_id = $tenant->id;
    $type->save();

    return $type;
}

function rgpd4iPayload(
    array $fixture,
    \App\Models\TipoContrato $type
): array {
    $payload = rgpdV11HttpPayload($fixture);

    unset(
        $payload['tipo'],
        $payload['template_id']
    );

    $payload['tipo_contrato_id'] = $type->id;

    return $payload;
}

test(
    '4r14b4i rgpd pelo tipo global preview e assinatura remota',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $fixture['empresa']->privacidade_contacto_email =
            'privacidade@operadora.test';

        $fixture['empresa']->privacidade_prazo_contratos =
            'Prazo documentado da operadora';

        $fixture['empresa']->save();

        $type = rgpd4iType($fixture);

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $type
        );

        /*
         * O cliente tenta falsificar dados
         * que devem vir da entidade Empresa
         * e do cadastro do titular.
         */
        $payload['campos_preenchidos']
            ['RGPD_TITULAR_NOME'] =
                'Nome falsificado';

        $payload['campos_preenchidos']
            ['RGPD_CONTACTO_PRIVACIDADE'] =
                'falso@local.test';

        $beforeContracts = \App\Models\Contrato::count();

        $beforeDocuments = \App\Models\Documento::count();

        $beforeNumber = (int)
            \Illuminate\Support\Facades\DB::table(
                'document_sequences'
            )
            ->where('chave', 'documentos')
            ->value('ultimo_numero');

        /*
         * PREVIEW HTTP
         *
         * Deve utilizar dados reais e
         * nao criar contratos ou documentos.
         */
        $preview = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos/preview',
                $payload
            )
            ->assertOk();

        $html = (string) $preview->json('data.html');

        expect($html)
            ->toContain('Pessoa de Teste');

        expect($html)
            ->toContain(
                'privacidade@operadora.test'
            );

        expect($html)
            ->toContain(
                'Prazo documentado da operadora'
            );

        expect($html)
            ->not->toContain('Nome falsificado');

        expect($html)
            ->not->toContain('falso@local.test');

        expect(\App\Models\Contrato::count())
            ->toBe($beforeContracts);

        expect(\App\Models\Documento::count())
            ->toBe($beforeDocuments);

        /*
         * CRIACAO PELO TIPO DOCUMENTAL
         *
         * Uma assinatura remota ainda
         * pendente nao pode emitir documento.
         */
        $payload['assinaturas'] =
            rgpdV11Signature();

        $created = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.status',
                'enviado'
            );

        $contract = \App\Models\Contrato::query()
            ->findOrFail(
                $created->json('data.id')
            );

        expect(
            (string) $contract->tipo_contrato_id
        )->toBe(
            (string) $type->id
        );

        expect(
            (string) $contract->template_id
        )->toBe(
            (string) $fixture['template']->id
        );

        $fields = (array)
            $contract->campos_preenchidos;

        expect(
            $fields['RGPD_TITULAR_NOME']
        )->toBe('Pessoa de Teste');

        expect(
            $fields['RGPD_CONTACTO_PRIVACIDADE']
        )->toBe('privacidade@operadora.test');

        expect(
            $fields['RGPD_DECISAO_IMAGEM']
        )->toBe('nao_autorizo');

        expect(
            $fields['RGPD_DECISAO_VOZ']
        )->toBe('autorizo');

        $signature =
            \App\Models\AssinaturaDigital::query()
                ->where(
                    'contrato_id',
                    $contract->id
                )
                ->sole();

        expect($signature->placeholder)
            ->toBe('ASSINATURA_TITULAR');

        expect($signature->signatario_nome)
            ->toBe('Pessoa de Teste');

        expect($signature->status)
            ->toBe('pendente');

        /*
         * Workflow normal associado ao tipo.
         */
        $run =
            \App\Models\ChecklistProcessRun::query()
                ->where(
                    'tenant_id',
                    $fixture['tenant']->id
                )
                ->where(
                    'entidade_tipo',
                    'contrato'
                )
                ->where(
                    'entidade_id',
                    $contract->id
                )
                ->first();

        expect($run)->not->toBeNull();

        expect(
            (string) $run->template_id
        )->toBe(
            (string)
                $type->checklist_process_template_id
        );

        /*
         * Numeracao documental preservada.
         */
        expect(\App\Models\Documento::count())
            ->toBe($beforeDocuments);

        expect(
            (int)
                \Illuminate\Support\Facades\DB::table(
                    'document_sequences'
                )
                ->where('chave', 'documentos')
                ->value('ultimo_numero')
        )->toBe($beforeNumber);
    }
);

test(
    '4r14b4i rgpd global rejeita opcoes adulteradas',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $type = rgpd4iType($fixture);

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $type
        );

        $payload['assinaturas'] =
            rgpdV11Signature();

        $payload['campos_preenchidos']
            ['RGPD_DECISAO_VOZ'] =
                'sim_automaticamente';

        $before = \App\Models\Contrato::count();

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'campos_preenchidos.RGPD_DECISAO_VOZ',
            ]);

        expect(\App\Models\Contrato::count())
            ->toBe($before);
    }
);

test(
    '4r14b4i tipo global nao publica rgpd sem revisao',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11IntegrationFixture(false);

        $type = rgpd4iType($fixture);

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $type
        );

        $payload['assinaturas'] =
            rgpdV11Signature();

        $before = \App\Models\Contrato::count();

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'template_id',
            ]);

        expect(\App\Models\Contrato::count())
            ->toBe($before);
    }
);

/*
 * FROTAPRO_4R14B4I2_AUTHORITATIVE_FIELDS
 *
 * O cliente nao deve ter de preencher
 * valores resolvidos pelo servidor.
 *
 * As fixtures de publicacao juridica pertencem
 * exclusivamente ao SQLite de testes.
 */

test(
    '4r14b4i2 rgpd preenche campos autoritativos sem entrada manual',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $fixture['empresa']
            ->privacidade_contacto_email =
                'privacidade@operadora.test';

        $fixture['empresa']
            ->privacidade_prazo_contratos =
                'Prazo interno confirmado para teste';

        $fixture['empresa']->save();

        $tipo = rgpd4iType($fixture);

        $config = (array)
            $tipo->campos_configuracao;

        foreach ([
            'RGPD_TITULAR_NOME',
            'RGPD_TITULAR_NIF',
            'RGPD_TITULAR_CONTACTO',
            'RGPD_TITULAR_QUALIDADE',
            'RGPD_CONTACTO_PRIVACIDADE',
            'RGPD_RETENCAO_CONTRATOS',
            'RGPD_DATA_DECLARACAO',
            'RGPD_DATA_ESCOLHAS',
        ] as $campo) {
            $config[] = [
                'campo' => $campo,
                'origem' => 'manual',
                'tipo' => 'text',
                'obrigatorio' => true,
                'opcoes' => [],
            ];
        }

        $tipo->campos_configuracao = $config;
        $tipo->save();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $tipo
        );

        $payload['assinaturas'] =
            rgpdV11Signature();

        /*
         * Esses campos NAO sao enviados
         * pelo cliente.
         */
        foreach ([
            'RGPD_TITULAR_NOME',
            'RGPD_TITULAR_NIF',
            'RGPD_TITULAR_CONTACTO',
            'RGPD_TITULAR_QUALIDADE',
            'RGPD_CONTACTO_PRIVACIDADE',
            'RGPD_RETENCAO_CONTRATOS',
            'RGPD_DATA_DECLARACAO',
            'RGPD_DATA_ESCOLHAS',
        ] as $campo) {
            unset(
                $payload['campos_preenchidos'][$campo]
            );
        }

        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertCreated();

        $contrato = \App\Models\Contrato::query()
            ->findOrFail(
                $response->json('data.id')
            );

        $campos = (array)
            $contrato->campos_preenchidos;

        expect(
            $campos['RGPD_TITULAR_NOME']
        )->toBe('Pessoa de Teste');

        expect(
            $campos['RGPD_TITULAR_NIF']
        )->toBe('123456789');

        expect(
            $campos['RGPD_CONTACTO_PRIVACIDADE']
        )->toBe('privacidade@operadora.test');

        expect(
            $campos['RGPD_RETENCAO_CONTRATOS']
        )->toBe('Prazo interno confirmado para teste');

        expect(
            $campos['RGPD_DATA_DECLARACAO']
        )->not->toBeEmpty();

        expect(
            $campos['RGPD_DATA_ESCOLHAS']
        )->not->toBeEmpty();
    }
);

test(
    '4r14b4i2 tipo nao rgpd nao ignora campos obrigatorios',
    function (): void {
        $fixture = rgpdV11FullOfficialFixture();

        $tipo = rgpd4iType($fixture);

        /*
         * Simular um tipo comum que exige
         * preenchimento manual do mesmo campo.
         */
        $tipo->codigo = 'documento_comum_teste';

        $tipo->campos_configuracao = [[
            'campo' => 'RGPD_TITULAR_NOME',
            'origem' => 'manual',
            'tipo' => 'text',
            'obrigatorio' => true,
            'opcoes' => [],
        ]];

        $tipo->save();

        $payload = rgpd4iPayload(
            $fixture,
            $tipo
        );

        unset(
            $payload['campos_preenchidos']
                ['RGPD_TITULAR_NOME']
        );

        expect(
            fn() => app(
                \App\Services\ContratoTipoResolverService::class
            )->resolve(
                $payload,
                (string) $fixture['tenant']->id
            )
        )->toThrow(
            \Illuminate\Validation\ValidationException::class
        );
    }
);

/*
 * FROTAPRO_4R14B4N_TESTS
 *
 * Compatibilidade com tipos e workflows RGPD
 * existentes antes da normalizacao de codigos.
 *
 * Estes testes utilizam fixtures SQLite e
 * nao representam publicacao juridica real.
 */

test(
    '4r14b4n tipo rgpd e workflow legado permitem assinatura remota',
    function (): void {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $type = rgpd4iType($fixture);

        $type->codigo = 'rgpd';

        $type->entidades = [
            'empresa' => true,
            'motorista' => false,
            'proprietario' => false,
            'veiculo' => false,
        ];

        $type->save();

        $workflow = $type->checklistProcessTemplate;

        $workflow->codigo =
            'frotapro_rgpd_informacao_autorizacoes';

        $workflow->save();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $type
        );

        $payload['assinaturas'] =
            rgpdV11Signature();

        $beforeContracts =
            \App\Models\Contrato::count();

        $beforeDocuments =
            \App\Models\Documento::count();

        /*
         * Preview com os codigos legados.
         */
        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos/preview',
                $payload
            )
            ->assertOk();

        expect(\App\Models\Contrato::count())
            ->toBe($beforeContracts);

        /*
         * A criacao usa o tipo e workflow legados,
         * mas continua a exigir uma unica
         * ASSINATURA_TITULAR.
         */
        $response = $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.status',
                'enviado'
            );

        $contract = \App\Models\Contrato::query()
            ->findOrFail(
                $response->json('data.id')
            );

        expect(
            (string) $contract->tipo_contrato_id
        )->toBe((string) $type->id);

        expect(
            (string) $contract->template_id
        )->toBe((string) $fixture['template']->id);

        $signature =
            \App\Models\AssinaturaDigital::query()
                ->where(
                    'contrato_id',
                    $contract->id
                )
                ->sole();

        expect($signature->placeholder)
            ->toBe('ASSINATURA_TITULAR');

        expect($signature->status)
            ->toBe('pendente');

        expect(\App\Models\Documento::count())
            ->toBe($beforeDocuments);
    }
);

test(
    '4r14b4n rejeita workflow desconhecido no tipo rgpd legado',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $type = rgpd4iType($fixture);

        $type->codigo = 'rgpd';
        $type->save();

        $workflow = $type->checklistProcessTemplate;

        $workflow->codigo = 'workflow_nao_rgpd';
        $workflow->save();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $type
        );

        $payload['assinaturas'] =
            rgpdV11Signature();

        $before = \App\Models\Contrato::count();

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'tipo_contrato_id',
            ]);

        expect(\App\Models\Contrato::count())
            ->toBe($before);
    }
);

test(
    '4r14b4n rejeita template comum associado a tipo rgpd',
    function (): void {
        \Illuminate\Support\Facades\Mail::fake();

        $fixture = rgpdV11FullOfficialFixture();

        $type = rgpd4iType($fixture);

        $type->codigo = 'rgpd';
        $type->save();

        /*
         * Alterar apenas a fixture de teste.
         * Um tipo RGPD nao pode utilizar
         * template comum.
         */
        $fixture['template']->conteudo_original =
            'Documento comum sem placeholders RGPD.';

        $fixture['template']->save();

        rgpdV11HttpLogin(
            $this,
            $fixture['tenant']
        );

        $payload = rgpd4iPayload(
            $fixture,
            $type
        );

        $payload['assinaturas'] =
            rgpdV11Signature();

        $before = \App\Models\Contrato::count();

        $this
            ->withHeaders(rgpdV11HttpHeaders())
            ->postJson(
                '/api/contratos',
                $payload
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'template_id',
            ]);

        expect(\App\Models\Contrato::count())
            ->toBe($before);
    }
);

/*
 * FROTAPRO_4R14B4W
 *
 * Corrigir a compatibilidade entre a grafia
 * do catalogo RGPD 1.1 e a grafia legada.
 */

test(
    '4r14b4w aceita identificador do catalogo e legado',
    function (): void {
        $fixture = rgpdV11IntegrationFixture(true);

        $template = $fixture['template'];

        $model = $template->modeloDocumentoSaas;

        foreach ([
            'informacao-tratamento-dados-rgpd-v1-1',
            'informacao-tratamento-dados-rgpd-v11',
        ] as $slug) {
            $model->slug = $slug;
            $model->save();

            app(
                FrotaProRgpdV11Integration::class
            )->assertReleaseReady(
                $template->fresh()
            );
        }

        expect(true)->toBeTrue();
    }
);

test(
    '4r14b4w rejeita identificador semelhante desconhecido',
    function (): void {
        $fixture = rgpdV11IntegrationFixture(true);

        $template = $fixture['template'];

        $model = $template->modeloDocumentoSaas;

        $model->slug =
            'informacao-tratamento-dados-rgpd-v1-1-extra';

        $model->save();

        expect(
            fn () =>
                app(
                    FrotaProRgpdV11Integration::class
                )->assertReleaseReady(
                    $template->fresh()
                )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r14b4w identificador canonico nao ignora revisao juridica',
    function (): void {
        $fixture = rgpdV11IntegrationFixture(false);

        $template = $fixture['template'];

        $model = $template->modeloDocumentoSaas;

        $model->slug =
            'informacao-tratamento-dados-rgpd-v1-1';

        $model->save();

        expect(
            fn () =>
                app(
                    FrotaProRgpdV11Integration::class
                )->assertReleaseReady(
                    $template->fresh()
                )
        )->toThrow(
            ValidationException::class
        );
    }
);

test(
    '4r14b4w publicacao bloqueada nos dois identificadores',
    function (): void {
        $fixture = rgpdV11IntegrationFixture(true);

        $model =
            $fixture['template']->modeloDocumentoSaas;

        $actor =
            \App\Models\User::factory()->create();

        foreach ([
            'informacao-tratamento-dados-rgpd-v1-1',
            'informacao-tratamento-dados-rgpd-v11',
        ] as $slug) {
            $model->slug = $slug;
            $model->save();

            expect(
                fn () =>
                    app(
                        \App\Services\ModeloDocumentoSaasService::class
                    )->publish(
                        $actor,
                        (string) $model->id
                    )
            )->toThrow(
                ValidationException::class
            );
        }
    }
);


// FROTAPRO_4R14B5H — verificar a versao 1.2 sem dispensar revisao juridica.
test(
    '4r14b5h versao 1.2 aceita tres decisoes e politica simplificada',
    function (): void {
        $f = rgpdV11IntegrationFixture(true);
        $model = $f['template']->modeloDocumentoSaas;
        $version = $f['template']->modeloDocumentoSaasVersaoOrigem;
        $template = $f['template'];

        $model->slug = 'informacao-tratamento-dados-rgpd';
        $model->versao = '1.2';
        $model->versao_publicada = '1.2';
        $model->save();

        $version->versao = '1.2';
        $version->save();

        $template->modelo_documento_saas_versao = '1.2';
        $template->save();

        $tenant = $f['tenant'];
        $tenant->settings = ['fleet' => ['rgpd' => []]];
        $tenant->save();

        $empresa = $f['empresa'];
        $empresa->privacidade_contacto_email = 'contacto@example.test';
        $empresa->save();

        $fields = rgpdV11Input();
        unset($fields['RGPD_DECISAO_SENSIVEIS']);
        $fields['RGPD_DECISAO_GEO'] = 'nao_aplicavel';

        $result = app(FrotaProRgpdV11Integration::class)->prepare(
            (string) $tenant->id,
            $template->fresh(),
            $fields,
            rgpdV11Signature(),
            $f['motorista'],
            null,
            $empresa->fresh()
        );

        expect($result['snapshot']['RGPD_VERSAO_MODELO'])->toBe('1.2');
        expect($result['snapshot']['RGPD_CONTACTO_PRIVACIDADE'])->toBe(
            'contacto@example.test'
        );
        expect($result['snapshot']['RGPD_GEO_FINALIDADE'])->toBe('Nao aplicavel');
        expect($result['snapshot'])->not->toHaveKey('RGPD_DECISAO_SENSIVEIS');
        expect($result['assinaturas'])->toHaveCount(1);
    }
);

test(
    '4r14b5h versao 1.2 continua a exigir revisao juridica',
    function (): void {
        $f = rgpdV11IntegrationFixture(false);
        $model = $f['template']->modeloDocumentoSaas;
        $version = $f['template']->modeloDocumentoSaasVersaoOrigem;
        $template = $f['template'];
        $model->slug = 'informacao-tratamento-dados-rgpd';
        $model->versao = '1.2';
        $model->versao_publicada = '1.2';
        $model->save();
        $version->versao = '1.2';
        $version->save();
        $template->modelo_documento_saas_versao = '1.2';
        $template->save();

        expect(
            fn () => app(FrotaProRgpdV11Integration::class)
                ->assertReleaseReady($template->fresh())
        )->toThrow(ValidationException::class);
    }
);

test(
    '4r14b5h versao 1.2 rejeita checksum adulterado',
    function (): void {
        $f = rgpdV11IntegrationFixture(true);
        $model = $f['template']->modeloDocumentoSaas;
        $version = $f['template']->modeloDocumentoSaasVersaoOrigem;
        $template = $f['template'];
        $model->slug = 'informacao-tratamento-dados-rgpd';
        $model->versao = '1.2';
        $model->versao_publicada = '1.2';
        $model->save();
        $version->versao = '1.2';
        $version->checksum = str_repeat('0', 64);
        $version->save();
        $template->modelo_documento_saas_versao = '1.2';
        $template->save();

        expect(
            fn () => app(FrotaProRgpdV11Integration::class)
                ->assertReleaseReady($template->fresh())
        )->toThrow(ValidationException::class);
    }
);
