<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Empresa;
use App\Models\Funcionario;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * FrotaPro 4R.14B.2
 *
 * Ponte de integracao RGPD 1.1.
 *
 * Reutiliza o modulo de contratos, assinaturas
 * e documentos existente.
 *
 * Nao publica modelos automaticamente.
 */
final class FrotaProRgpdV11Integration
{
    public function __construct(
        private FrotaProRgpdV11Service $rgpd
    ) {}

    public function applies(
        ?TemplateContrato $template
    ): bool {
        return $this->rgpd->isRgpd($template);
    }

    /**
     * Confirmar proveniencia SaaS e versao aprovada.
     */
    public function assertReleaseReady(
        TemplateContrato $template
    ): void {
        if (
            !$template->exists ||
            !$template->modelo_documento_saas_id ||
            !$template->modelo_documento_saas_versao_id
        ) {
            throw ValidationException::withMessages([
                'template_id' =>
                    'O RGPD exige um modelo SaaS publicado e versionado.',
            ]);
        }

        $model = $template->modeloDocumentoSaas;
        $version = $template->modeloDocumentoSaasVersaoOrigem;

        $documentVersion = (string) (
            $template->modelo_documento_saas_versao ?? ''
        );
        $isSupported = in_array($documentVersion, ['1.1', '1.2'], true);
        $slug = Str::slug((string) ($model?->slug ?? ''));
        $slugMatches = $documentVersion === '1.2'
            ? $slug === 'informacao-tratamento-dados-rgpd'
            : (
                FrotaProRgpdV11ModelSlug::matches($slug) ||
                $slug === 'informacao-tratamento-dados-rgpd'
            );

        if (
            !$model ||
            !$version ||
            !$isSupported ||
            !$slugMatches ||
            !$model->isPublicado() ||
            !$model->tecnicamente_validado ||
            !$model->juridicamente_revisto ||
            !$model->publicado_em ||
            !$version->publicado_em ||
            (string) $model->versao_publicada !== $documentVersion ||
            (string) $version->versao !== $documentVersion ||
            (string) $version->modelo_documento_saas_id !==
                (string) $model->id ||
            !$version->juridicamente_revisto ||
            !hash_equals(
                (string) $version->checksum,
                hash(
                    'sha256',
                    (string) $version->conteudo_parametrizado
                )
            ) ||
            !hash_equals(
                (string) $version->conteudo_parametrizado,
                (string) $template->conteudo_original
            )
        ) {
            throw ValidationException::withMessages([
                'template_id' =>
                    'O RGPD nao esta juridicamente aprovado, a versao e invalida, ou a copia foi alterada.',
            ]);
        }
    }

    /**
     * Validar e preparar snapshot documental.
     *
     * @return array{
     *   snapshot:array<string,mixed>,
     *   assinaturas:array<int,array<string,mixed>>
     * }
     */
    public function prepare(
        string $tenantId,
        TemplateContrato $template,
        array $fields,
        array $inputSignatures,
        ?Motorista $motorista,
        ?Proprietario $proprietario,
        ?Empresa $empresa
    ): array {
        if (
            !$this->applies($template) ||
            (string) $template->tenant_id !== $tenantId ||
            !$template->ativo
        ) {
            throw ValidationException::withMessages([
                'template_id' =>
                    'Modelo RGPD invalido para esta organizacao.',
            ]);
        }

        $this->assertReleaseReady($template);

        $snapshot = $this->rgpd->snapshot(
            $tenantId,
            $fields,
            $motorista,
            $proprietario,
            $empresa,
            (string) $template->modelo_documento_saas_versao
        );

        if (
            count($inputSignatures) !== 1 ||
            !is_array($inputSignatures[0] ?? null) ||
            ($inputSignatures[0]['placeholder'] ?? '') !==
                'ASSINATURA_TITULAR'
        ) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                    'O RGPD exige uma unica assinatura do titular.',
            ]);
        }

        $signature = $inputSignatures[0];

        $mode = strtolower(
            trim((string) ($signature['modo'] ?? ''))
        );

        if (
            !in_array(
                $mode,
                ['presencial', 'remota'],
                true
            )
        ) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                    'Modo de assinatura RGPD invalido.',
            ]);
        }

        $this->rgpd->assertSigner(
            $inputSignatures,
            $snapshot
        );

        if (
            $mode === 'presencial' &&
            blank($signature['assinatura_url'] ?? null)
        ) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                    'A assinatura presencial do titular e obrigatoria.',
            ]);
        }

        $kind = (string) (
            $snapshot['RGPD_TITULAR_TIPO'] ?? ''
        );

        $holder = match ($kind) {
            'motorista' => $motorista,
            'proprietario' => $proprietario,
            'colaborador' => Funcionario::query()
                ->where('tenant_id', $tenantId)
                ->find(
                    $fields['RGPD_TITULAR_ID'] ?? null
                ),
            default => null,
        };

        if (
            $kind !== 'outro' &&
            (
                !$holder ||
                (string) $holder->tenant_id !== $tenantId
            )
        ) {
            throw ValidationException::withMessages([
                'RGPD_TITULAR_ID' =>
                    'O titular indicado nao pertence a organizacao.',
            ]);
        }

        $snapshot['RGPD_TITULAR_ID'] =
            $holder?->getKey();

        return [
            'snapshot' => $snapshot,

            'assinaturas' => [[
                'placeholder' => 'ASSINATURA_TITULAR',
                'modo' => $mode,
                'assinatura_url' =>
                    $signature['assinatura_url'] ?? null,

                'signatario_tipo' => $kind,
                'signatario_id' => $holder?->getKey(),
                'signatario_user_id' =>
                    $holder?->user_id,

                'signatario_nome' =>
                    (string) $snapshot['RGPD_TITULAR_NOME'],

                'signatario_email' => Str::lower(
                    trim(
                        (string) (
                            $snapshot['RGPD_TITULAR_EMAIL'] ?? ''
                        )
                    )
                ),
            ]],
        ];
    }
}