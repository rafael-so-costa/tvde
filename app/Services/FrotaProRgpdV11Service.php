<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AssinaturaDigital;
use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\Funcionario;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class FrotaProRgpdV11Service
{
    public const POLICY = [
        'RGPD_CONTACTO_PRIVACIDADE' => 'contacto_privacidade',
        'RGPD_EPD' => 'epd',
        'RGPD_RETENCAO_CADASTRO' => 'retencao_cadastro',
        'RGPD_RETENCAO_CONTRATOS' => 'retencao_contratos',
        'RGPD_RETENCAO_FISCAL' => 'retencao_fiscal',
        'RGPD_RETENCAO_OPERACIONAL' => 'retencao_operacional',
        'RGPD_RETENCAO_CONSENTIMENTOS' => 'retencao_consentimentos',
        'RGPD_RETENCAO_LOCALIZACAO' => 'retencao_localizacao',
        'RGPD_TRANSFERENCIAS' => 'transferencias',
        'RGPD_DECISOES_AUTOMATIZADAS' => 'decisoes_automatizadas',
        'RGPD_GEO_FINALIDADE' => 'geo_finalidade',
        'RGPD_SENSIVEL_FINALIDADE' => 'sensivel_finalidade',
        'RGPD_SENSIVEL_CATEGORIAS' => 'sensivel_categorias',
        'RGPD_SENSIVEL_ARTIGO9' => 'sensivel_artigo9',
    ];

    public const CHOICES = [
        'RGPD_DECISAO_IMAGEM' => ['autorizo', 'nao_autorizo'],
        'RGPD_DECISAO_VOZ' => ['autorizo', 'nao_autorizo'],
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

    public function isRgpd(?TemplateContrato $template): bool
    {
        $content = (string) (
            $template?->conteudo_original ?? ''
        );

        return str_contains(
            $content,
            '{{RGPD_TITULAR_NOME}}'
        ) && str_contains(
            $content,
            '{{RGPD_DECISAO_IMAGEM}}'
        );
    }

    /*
     * FROTAPRO_4R14B4H_COMPANY_PRIVACY
     *
     * Valores declarados pela empresa.
     * Nao gera valores legais ficticios.
     *
     * A verificacao de tenant acontece
     * antes da utilizacao deste metodo.
     */
    public function companyPrivacyValues(
        Empresa $empresa
    ): array {
        $sources = [
            'RGPD_CONTACTO_PRIVACIDADE' =>
                'privacidade_contacto_email',

            'RGPD_RETENCAO_CADASTRO' =>
                'privacidade_prazo_identificacao',

            'RGPD_RETENCAO_CONTRATOS' =>
                'privacidade_prazo_contratos',

            'RGPD_RETENCAO_FISCAL' =>
                'privacidade_prazo_fiscal',

            'RGPD_RETENCAO_OPERACIONAL' =>
                'privacidade_prazo_operacional',

            'RGPD_RETENCAO_CONSENTIMENTOS' =>
                'privacidade_prazo_consentimentos',

            'RGPD_RETENCAO_LOCALIZACAO' =>
                'privacidade_prazo_localizacao',

            'RGPD_TRANSFERENCIAS' =>
                'privacidade_transferencias_internacionais',

            'RGPD_DECISOES_AUTOMATIZADAS' =>
                'privacidade_decisoes_automatizadas',

            'RGPD_GEO_FINALIDADE' =>
                'privacidade_finalidade_localizacao',

            'RGPD_SENSIVEL_FINALIDADE' =>
                'privacidade_finalidade_dados_especiais',

            'RGPD_SENSIVEL_CATEGORIAS' =>
                'privacidade_categorias_dados_especiais',

            'RGPD_SENSIVEL_ARTIGO9' =>
                'privacidade_condicao_artigo9',
        ];

        $values = [];

        foreach ($sources as $token => $attribute) {
            $value = trim(
                (string) $empresa->getAttribute($attribute)
            );

            if ($value !== '') {
                $values[$token] = $value;
            }
        }

        $epdNome = trim(
            (string) $empresa->getAttribute(
                'privacidade_epd_nome'
            )
        );

        $epdEmail = trim(
            (string) $empresa->getAttribute(
                'privacidade_epd_email'
            )
        );

        if ($epdNome !== '' || $epdEmail !== '') {
            $values['RGPD_EPD'] =
                $epdNome !== '' && $epdEmail !== ''
                    ? $epdNome . ' (' . $epdEmail . ')'
                    : ($epdNome !== '' ? $epdNome : $epdEmail);
        }

        return $values;
    }
    public function snapshot(
        string $tenantId,
        array $fields,
        ?Motorista $motorista = null,
        ?Proprietario $proprietario = null,
        ?Empresa $empresa = null
    ): array {
        $tenant = Tenant::query()->findOrFail($tenantId);

        $policy = data_get(
            (array) ($tenant->settings ?? []),
            'fleet.rgpd',
            []
        );

        $policy = is_array($policy) ? $policy : [];

        $errors = [];
        $result = [];

        if (
            !$empresa ||
            (string) $empresa->tenant_id !== $tenantId
        ) {
            $errors['empresa_id'] =
                'Selecione uma empresa válida da organização.';
        }

        /*
         * FROTAPRO_4R14B4H_COMPANY_PRIORITY
         *
         * A empresa e a fonte preferencial.
         * A configuracao legada e utilizada apenas
         * quando o atributo da empresa esta vazio.
         */
        $companyPrivacy = (
            $empresa !== null &&
            (string) $empresa->tenant_id === $tenantId
        )
            ? $this->companyPrivacyValues($empresa)
            : [];

        foreach (self::POLICY as $token => $source) {
            $value = trim(
                (string) (
                    $companyPrivacy[$token]
                    ?? $policy[$source]
                    ?? ''
                )
            );

            if ($value === '') {
                $errors['rgpd.'.$source] =
                    'Configure esta informação na política RGPD.';
            } else {
                $result[$token] = $value;
            }
        }

        $type = strtolower(
            trim((string) ($fields['RGPD_TITULAR_TIPO'] ?? ''))
        );

        $types = [
            'motorista' => 'Motorista',
            'proprietario' => 'Proprietário',
            'colaborador' => 'Colaborador',
            'outro' => 'Outro',
        ];

        if (!isset($types[$type])) {
            $errors['RGPD_TITULAR_TIPO'] =
                'Selecione a qualidade do titular.';
        }

        $holder = match ($type) {
            'motorista' => $motorista
                ? Motorista::query()
                    ->where('tenant_id', $tenantId)
                    ->find($motorista->id)
                : null,

            'proprietario' => $proprietario
                ? Proprietario::query()
                    ->where('tenant_id', $tenantId)
                    ->find($proprietario->id)
                : null,

            'colaborador' => filled(
                $fields['RGPD_TITULAR_ID'] ?? null
            )
                ? Funcionario::query()
                    ->where('tenant_id', $tenantId)
                    ->find($fields['RGPD_TITULAR_ID'])
                : null,

            default => null,
        };

        if (
            in_array(
                $type,
                ['motorista', 'proprietario', 'colaborador'],
                true
            ) && !$holder
        ) {
            $errors['RGPD_TITULAR_ID'] =
                'O titular não pertence à organização.';
        }

        if ($holder) {
            $name = trim((string) (
                $holder->nome_completo
                ?? $holder->nome
                ?? ''
            ));

            $nif = trim((string) ($holder->nif ?? ''));

            $email = trim((string) ($holder->email ?? ''));

            $contact = $email !== ''
                ? $email
                : trim((string) (
                    $holder->telemovel
                    ?? $holder->telefone
                    ?? ''
                ));

            $identifier = trim((string) (
                $holder->numero_funcionario
                ?? $holder->numero_documento
                ?? $holder->id
                ?? ''
            ));
        } else {
            $name = $type === 'outro'
                ? trim((string) ($fields['RGPD_OUTRO_NOME'] ?? ''))
                : '';

            $nif = $type === 'outro'
                ? trim((string) ($fields['RGPD_OUTRO_NIF'] ?? ''))
                : '';

            $contact = $type === 'outro'
                ? trim((string) ($fields['RGPD_OUTRO_CONTACTO'] ?? ''))
                : '';

            $email = $contact;

            $identifier = $type === 'outro'
                ? trim((string) (
                    $fields['RGPD_OUTRO_IDENTIFICADOR'] ?? ''
                ))
                : '';
        }

        foreach ([
            'RGPD_TITULAR_NOME' => $name,
            'RGPD_TITULAR_NIF' => $nif,
            'RGPD_TITULAR_CONTACTO' => $contact,
        ] as $field => $value) {
            if ($value === '') {
                $errors[$field] =
                    'Dado obrigatório em falta no cadastro.';
            } else {
                $result[$field] = $value;
            }
        }

        if (isset($types[$type])) {
            $result['RGPD_TITULAR_TIPO'] = $type;
            $result['RGPD_TITULAR_QUALIDADE'] = $types[$type];
            $result['RGPD_TITULAR_IDENTIFICADOR'] =
                $identifier !== ''
                    ? $identifier
                    : 'Não aplicável';
        }

        $result['RGPD_TITULAR_EMAIL'] = $email;

        foreach (self::CHOICES as $field => $options) {
            $choice = strtolower(
                trim((string) ($fields[$field] ?? ''))
            );

            if (!in_array($choice, $options, true)) {
                $errors[$field] =
                    'Registe uma decisão expressa válida.';
            } else {
                $result[$field] = $choice;
            }
        }

        if (
            ($result['RGPD_DECISAO_GEO'] ?? '') === 'autorizo' &&
            $this->notApplicable(
                $result['RGPD_GEO_FINALIDADE'] ?? ''
            )
        ) {
            $errors['RGPD_GEO_FINALIDADE'] =
                'Configure a finalidade de localização.';
        }

        if (
            ($result['RGPD_DECISAO_SENSIVEIS'] ?? '')
            === 'autorizo'
        ) {
            foreach ([
                'RGPD_SENSIVEL_FINALIDADE',
                'RGPD_SENSIVEL_CATEGORIAS',
                'RGPD_SENSIVEL_ARTIGO9',
            ] as $field) {
                if ($this->notApplicable($result[$field] ?? '')) {
                    $errors[$field] =
                        'Configure este tratamento antes de autorizar.';
                }
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $result['RGPD_DATA_DECLARACAO'] =
            now()->format('d/m/Y');

        $result['RGPD_DATA_ESCOLHAS'] =
            now()->format('d/m/Y');

        $result['RGPD_RECOLHA_EM'] =
            now()->toIso8601String();

        $result['RGPD_VERSAO_MODELO'] = '1.1';

        return $result;
    }

    public function assertSigner(
        array $signatures,
        array $snapshot
    ): void {
        $signature = collect($signatures)
            ->firstWhere('placeholder', 'ASSINATURA_TITULAR');

        if (!$signature) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                    'O RGPD exige a assinatura do titular.',
            ]);
        }

        $actual = (string) (
            $signature['signatario_nome'] ?? ''
        );

        $expected = (string) (
            $snapshot['RGPD_TITULAR_NOME'] ?? ''
        );

        $this->assertSameName($actual, $expected);

        if (($signature['modo'] ?? '') === 'remota') {
            $email = strtolower(
                trim((string) (
                    $snapshot['RGPD_TITULAR_EMAIL'] ?? ''
                ))
            );

            $provided = strtolower(
                trim((string) (
                    $signature['signatario_email'] ?? ''
                ))
            );

            if (
                ($snapshot['RGPD_TITULAR_TIPO'] ?? '')
                    === 'outro'
                ||
                !filter_var($email, FILTER_VALIDATE_EMAIL)
                ||
                $email !== $provided
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' =>
                        'A assinatura remota exige o e-mail registado do titular. Para outros titulares, utilize assinatura presencial com verificação de identidade.',
                ]);
            }
        }
    }

    public function pdfValues(
        Contrato $contract,
        bool $preview
    ): array {
        $fields = (array) (
            $contract->campos_preenchidos ?? []
        );

        if (!$contract->exists) {
            $fields = array_merge(
                $fields,
                $this->snapshot(
                    (string) $contract->tenant_id,
                    $fields,
                    $contract->motorista,
                    $contract->proprietario,
                    $contract->empresa
                )
            );
        }

        foreach (array_merge(
            array_keys(self::POLICY),
            array_keys(self::CHOICES),
            [
                'RGPD_TITULAR_NOME',
                'RGPD_TITULAR_NIF',
                'RGPD_TITULAR_QUALIDADE',
                'RGPD_TITULAR_IDENTIFICADOR',
                'RGPD_TITULAR_CONTACTO',
                'RGPD_DATA_DECLARACAO',
                'RGPD_DATA_ESCOLHAS',
            ]
        ) as $field) {
            if (
                trim((string) ($fields[$field] ?? '')) === ''
            ) {
                throw ValidationException::withMessages([
                    'rgpd' => 'Documento incompleto: '.$field,
                ]);
            }
        }

        $labels = [
            'autorizo' => 'AUTORIZO',
            'nao_autorizo' => 'NÃO AUTORIZO',
            'nao_aplicavel' => 'NÃO APLICÁVEL',
        ];

        $values = [];

        foreach ($fields as $key => $value) {
            if (!str_starts_with((string) $key, 'RGPD_')) {
                continue;
            }

            $text = (string) $value;

            if (isset(self::CHOICES[$key])) {
                if (
                    !in_array(
                        $text,
                        self::CHOICES[$key],
                        true
                    )
                ) {
                    throw ValidationException::withMessages([
                        'rgpd' => 'Decisão inválida: '.$key,
                    ]);
                }

                $text = $labels[$text];
            }

            $values[$key] = [
                'value' => $text,
                'html' => false,
            ];
        }

        if ($preview) {
            $values['ASSINATURA_TITULAR'] = [
                'value' => 'Assinatura a recolher',
                'html' => false,
            ];

            return $values;
        }

        $signatures = $contract->relationLoaded('assinaturas')
            ? $contract->assinaturas
            : $contract->assinaturas()->get();

        $signature = $signatures->firstWhere(
            'placeholder',
            'ASSINATURA_TITULAR'
        );

        if (
            !$signature
            || $contract->status !== 'assinado'
            || $signature->status !== 'assinado'
            || !(bool) $signature->verificado
            || blank($signature->assinatura_url)
            || (
                $signature->contrato_versao !== null
                && (int) $signature->contrato_versao
                    !== (int) $contract->versao_atual
            )
        ) {
            throw ValidationException::withMessages([
                'assinatura' =>
                    'Assinatura válida do titular em falta.',
            ]);
        }

        $this->assertSameName(
            (string) $signature->signatario_nome,
            (string) $fields['RGPD_TITULAR_NOME']
        );

        $date = $signature->assinado_em
            ?? $contract->data_assinatura;

        if (!$date) {
            throw ValidationException::withMessages([
                'assinatura' => 'Data de assinatura em falta.',
            ]);
        }

        $signedDate = \Illuminate\Support\Carbon::parse(
            $date
        )->format('d/m/Y');

        $values['RGPD_DATA_DECLARACAO'] = [
            'value' => $signedDate,
            'html' => false,
        ];

        $values['RGPD_DATA_ESCOLHAS'] = [
            'value' => $signedDate,
            'html' => false,
        ];

        return $values;
    }

    private function assertSameName(
        string $actual,
        string $expected
    ): void {
        $normalize = static fn (string $value): string =>
            Str::lower(
                trim(
                    preg_replace(
                        '/\s+/u',
                        ' ',
                        Str::ascii($value)
                    ) ?? $value
                )
            );

        if (
            $expected === ''
            || $normalize($actual) !== $normalize($expected)
        ) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                    'A identidade do signatário não corresponde ao titular.',
            ]);
        }
    }

    private function notApplicable(string $value): bool
    {
        return in_array(
            Str::lower(trim(Str::ascii($value))),
            ['', 'nao aplicavel', 'n/a'],
            true
        );
    }
}
