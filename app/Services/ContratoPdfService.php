<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\LogAuditoriaContrato;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ContratoPdfService
{
    public function __construct(
        private ChecklistProcessService $checklistProcessService,
        private DocumentoRegistryService $documentoRegistryService
    ) {}

    public function generate(
        string $contratoId,
        string $tenantId,
        User $actor,
        ?string $ip = null
    ): Contrato {
        $contrato = Contrato::query()
            ->where('tenant_id', $tenantId)
            ->with([
                'template',
                'tipoContrato',
                'documento',
                'empresa',
                'motorista',
                'proprietario',
                'veiculo',
                'assinaturas',
                'checklistProcessRun.items',
            ])
            ->findOrFail($contratoId);

        if (! $contrato->template) {
            throw ValidationException::withMessages([
                'contrato' => 'O contrato não possui template associado.',
            ]);
        }

        if (blank($contrato->template->conteudo_original)) {
            throw ValidationException::withMessages([
                'contrato' => 'O template do contrato não possui conteúdo para gerar o documento.',
            ]);
        }

        $empresa = $contrato->empresa;

        $documento = $this
            ->documentoRegistryService
            ->sync(
                $contrato
            );

        if ($documento) {
            $contrato->setRelation(
                'documento',
                $documento
            );
        }

        $values = $this->values($contrato, $empresa);
        $documentHtml = $this->renderContent(
            (string) $contrato->template->conteudo_original,
            $values
        );

        $pdf = Pdf::loadView('pdf.contrato', [
            'contrato' => $contrato,
            'empresa' => $empresa,
            'documentHtml' => $documentHtml,
            'generatedAt' => now(),
        ])
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'isRemoteEnabled' => false,
                'isPhpEnabled' => false,
                'defaultFont' => 'DejaVu Sans',
            ]);

        $binary = $pdf->output();

        if (
            $binary === '' ||
            ! str_starts_with($binary, '%PDF-')
        ) {
            throw new RuntimeException(
                'Não foi possível gerar um PDF válido.'
            );
        }

        $path =
            'contract-pdfs/'.
            $tenantId.'/'.
            $contrato->id.'/'.
            'v'.$contrato->versao_atual.'-'.
            Str::uuid()->toString().
            '.pdf';

        if (! Storage::disk('local')->put($path, $binary)) {
            throw new RuntimeException(
                'Não foi possível guardar o PDF do contrato.'
            );
        }

        $oldPath = $contrato->pdf_gerado_url;
        $hash = hash('sha256', $binary);

        try {
            DB::transaction(function () use (
                $contrato,
                $tenantId,
                $actor,
                $ip,
                $path,
                $hash
            ) {
                $locked = Contrato::query()
                    ->where('tenant_id', $tenantId)
                    ->whereKey($contrato->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    (int) $locked->versao_atual !==
                    (int) $contrato->versao_atual
                ) {
                    throw ValidationException::withMessages([
                        'contrato' => 'O contrato foi alterado durante a geração. Gere o PDF novamente.',
                    ]);
                }

                $locked->pdf_gerado_url = $path;
                $locked->hash_documento = $hash;
                $locked->save();

                $this
                    ->documentoRegistryService
                    ->sync(
                        $locked
                    );

                $this->checklistProcessService
                    ->completeDocumentGeneration(
                        $tenantId,
                        $locked->id,
                        [
                            'pdf_hash' => $hash,
                            'versao' => $locked->versao_atual,
                        ],
                        $actor->id
                    );

                $log = new LogAuditoriaContrato([
                    'acao' => 'geracao_pdf',
                    'detalhes' => [
                        'versao' => $locked->versao_atual,
                        'hash' => $hash,
                    ],
                    'ip_address' => $ip,
                ]);

                $log->contrato_id = $locked->id;
                $log->tenant_id = $tenantId;
                $log->user_id = $actor->id;
                $log->save();
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if (
            $oldPath &&
            $oldPath !== $path &&
            Storage::disk('local')->exists($oldPath)
        ) {
            Storage::disk('local')->delete($oldPath);
        }

        return Contrato::query()
            ->where('tenant_id', $tenantId)
            ->with([
                'template',
                'tipoContrato',
                'documento',
                'empresa',
                'motorista',
                'proprietario',
                'veiculo',
                'assinaturas',
                'checklistProcessRun.items',
            ])
            ->findOrFail($contrato->id);
    }

    private function values(
        Contrato $contrato,
        ?Empresa $empresa
    ): array {
        $values = [];

        foreach (
            $contrato->campos_preenchidos ?? [] as $key => $value
        ) {
            if (
                is_scalar($value) ||
                $value instanceof DateTimeInterface
            ) {
                $this->put(
                    $values,
                    (string) $key,
                    $this->formatValue(
                        (string) $key,
                        $value
                    )
                );
            }
        }

        $this->put($values, 'CONTRATO_ID', $contrato->id);
        $this->put($values, 'TIPO_CONTRATO', $contrato->tipo);
        $this->put($values, 'STATUS_CONTRATO', $contrato->status);
        $this->put($values, 'DATA_INICIO', $this->formatValue('DATA_INICIO', $contrato->data_inicio));
        $this->put($values, 'DATA_FIM', $this->formatValue('DATA_FIM', $contrato->data_fim));
        $this->put($values, 'DATA_ASSINATURA', $this->formatValue('DATA_ASSINATURA', $contrato->data_assinatura));
        $duracao = $this->contractDuration(
            $contrato
        );

        $this->put(
            $values,
            'DURACAO_CONTRATO',
            $duracao
        );
        $this->put($values, 'VALOR_DIARIA', $this->money($contrato->valor_diaria));
        $this->put($values, 'VALOR_SEMANAL', $this->money($contrato->valor_semanal));
        $this->put($values, 'VALOR_CAUCAO', $this->money($contrato->valor_caucao));
        $this->put($values, 'VALOR_TOTAL', $this->money($contrato->valor_total));
        $this->put(
            $values,
            'CONTRATO_DATA_INICIO',
            $this->formatValue(
                'DATA_INICIO',
                $contrato->data_inicio
            )
        );

        $this->put(
            $values,
            'CONTRATO_DATA_FIM',
            $this->formatValue(
                'DATA_FIM',
                $contrato->data_fim
            )
        );

        $this->put(
            $values,
            'CONTRATO_DATA_ASSINATURA',
            $this->formatValue(
                'DATA_ASSINATURA',
                $contrato->data_assinatura
            )
        );

        $this->put(
            $values,
            'CONTRATO_DURACAO',
            $duracao
        );

        $this->put(
            $values,
            'CONTRATO_VALOR_DIARIA',
            $this->money(
                $contrato->valor_diaria
            )
        );

        $this->put(
            $values,
            'CONTRATO_VALOR_SEMANAL',
            $this->money(
                $contrato->valor_semanal
            )
        );

        $this->put(
            $values,
            'CONTRATO_VALOR_CAUCAO',
            $this->money(
                $contrato->valor_caucao
            )
        );

        $this->put(
            $values,
            'CONTRATO_VALOR_TOTAL',
            $this->money(
                $contrato->valor_total
            )
        );

        if ($contrato->motorista) {
            $this->addEntity($values, 'MOTORISTA', $contrato->motorista, [
                'nome_completo',
                'nif',
                'email',
                'telemovel',
                'iban',
                'endereco_rua',
                'endereco_numero',
                'endereco_complemento',
                'endereco_cep',
                'endereco_cidade',
                'tipo_documento',
                'numero_documento',
                'documento_valid_until',
                'carta_numero',
                'carta_valid_until',
                'certificado_tvde',
                'certificado_tvde_valid_until',
                'data_nascimento',
            ]);

            $this->put(
                $values,
                'NOME_MOTORISTA',
                $contrato->motorista->nome_completo
            );

            $this->put(
                $values,
                'MOTORISTA_ENDERECO_COMPLETO',
                $this->fullAddress(
                    $contrato->motorista
                )
            );
        }

        if ($contrato->proprietario) {
            $this->addEntity($values, 'PROPRIETARIO', $contrato->proprietario, [
                'tipo',
                'nome_completo',
                'nome_empresa',
                'nome_gerente',
                'nif',
                'email',
                'telemovel',
                'iban',
                'endereco_rua',
                'endereco_numero',
                'endereco_complemento',
                'endereco_cep',
                'endereco_cidade',
                'tipo_documento',
                'numero_documento',
                'documento_valid_until',
                'capital_social',
                'certidao_permanente',
                'certidao_valid_until',
                'certificado_tvde',
                'certificado_tvde_valid_until',
            ]);

            $this->put(
                $values,
                'NOME_PROPRIETARIO',
                $contrato->proprietario->nome_empresa
                    ?: $contrato->proprietario->nome_completo
            );

            $this->put(
                $values,
                'PROPRIETARIO_ENDERECO_COMPLETO',
                $this->fullAddress(
                    $contrato->proprietario
                )
            );
        }

        if ($contrato->veiculo) {
            $this->addEntity($values, 'VEICULO', $contrato->veiculo, [
                'matricula',
                'marca',
                'modelo',
                'data_matricula',
                'chassi',
                'cilindrada',
                'potencia',
                'combustivel',
                'lugares',
                'portas',
                'cor',
                'valor_caucao',
                'valor_aluguel',
            ]);

            $this->put(
                $values,
                'MATRICULA_VEICULO',
                $contrato->veiculo->matricula
            );

            $this->put(
                $values,
                'MODELO_VEICULO',
                trim(
                    $contrato->veiculo->marca.' '.
                        $contrato->veiculo->modelo
                )
            );
        }

        if ($empresa) {
            $this->addEntity($values, 'EMPRESA', $empresa, [
                'nome_empresa',
                'nif',
                'email',
                'telemovel',
                'nome_gerente',
                'endereco_rua',
                'endereco_numero',
                'endereco_complemento',
                'endereco_cep',
                'endereco_cidade',
                'iban',
                'capital_social',
                'certificado_tvde',
                'certificado_tvde_valid_until',
            ]);

            $this->put(
                $values,
                'NOME_EMPRESA',
                $empresa->nome_empresa
            );
            $this->put(
                $values,
                'EMPRESA_ENDERECO_COMPLETO',
                $this->fullAddress(
                    $empresa
                )
            );
        }

        foreach ($contrato->assinaturas as $assinatura) {
            if (
                $assinatura->status !== 'assinado' ||
                blank($assinatura->placeholder) ||
                blank($assinatura->assinatura_url)
            ) {
                continue;
            }

            $image = $this->signatureImage(
                (string) $assinatura->assinatura_url
            );

            if (! $image) {
                continue;
            }

            $this->put(
                $values,
                (string) $assinatura->placeholder,
                '<img src="'.e($image).'" class="signature" alt="Assinatura">',
                true
            );
        }

        return $this->applyTemplateMappings(
            $values,
            $contrato
        );
    }

    private function addEntity(
        array &$values,
        string $prefix,
        object $model,
        array $fields
    ): void {
        foreach ($fields as $field) {
            $value = $model->getAttribute($field);

            if ($value === null || $value === '') {
                continue;
            }

            $formatted = $this->formatValue(
                $field,
                $value
            );

            $this->put(
                $values,
                $prefix.'_'.$field,
                $formatted
            );

            $this->put(
                $values,
                $field.'_'.$prefix,
                $formatted
            );
        }
    }

    private function put(
        array &$values,
        string $key,
        mixed $value,
        bool $html = false
    ): void {
        if ($value === null || $value === '') {
            return;
        }

        $values[$this->normalize($key)] = [
            'value' => (string) $value,
            'html' => $html,
        ];
    }

    private function applyTemplateMappings(
        array $values,
        Contrato $contrato
    ): array {
        $mappings =
            (array) (
                $contrato
                    ->template
                    ?->campos_mapeados
                ?? []
            );

        foreach (
            $mappings as $placeholder => $mapping
        ) {
            if (
                ! is_array(
                    $mapping
                )
            ) {
                continue;
            }

            if (
                (
                    $mapping['tipo']
                    ?? null
                ) === 'manual'
            ) {
                continue;
            }

            $source =
                $mapping['campo']
                ?? null;

            if (
                ! is_string(
                    $source
                ) ||
                trim(
                    $source
                ) === ''
            ) {
                continue;
            }

            $sourceKey =
                $this->normalize(
                    str_replace(
                        '.',
                        '_',
                        $source
                    )
                );

            $targetKey =
                $this->normalize(
                    (string) $placeholder
                );

            if (
                $sourceKey === '' ||
                $targetKey === '' ||
                ! array_key_exists(
                    $sourceKey,
                    $values
                )
            ) {
                continue;
            }

            $values[$targetKey] =
                $values[$sourceKey];
        }

        return $values;
    }

    private function fullAddress(
        object $model
    ): string {
        $parts = [];

        foreach (
            [
                'endereco_rua',
                'endereco_numero',
                'endereco_complemento',
                'endereco_cep',
                'endereco_cidade',
            ] as $field
        ) {
            $value =
                trim(
                    (string) (
                        $model
                            ->getAttribute(
                                $field
                            )
                        ?? ''
                    )
                );

            if (
                $value !== ''
            ) {
                $parts[] = $value;
            }
        }

        if (
            $parts !== []
        ) {
            return implode(
                ', ',
                $parts
            );
        }

        return trim(
            (string) (
                $model
                    ->getAttribute(
                        'endereco'
                    )
                ?? ''
            )
        );
    }

    private function contractDuration(
        Contrato $contrato
    ): string {
        if (
            ! $contrato->data_inicio ||
            ! $contrato->data_fim
        ) {
            return '';
        }

        $inicio =
            $contrato
                ->data_inicio
                ->copy()
                ->startOfDay();

        $fim =
            $contrato
                ->data_fim
                ->copy()
                ->startOfDay();

        if (
            $fim->lessThan(
                $inicio
            )
        ) {
            return '';
        }

        $diff =
            $inicio->diff(
                $fim
            );

        $months =
            (
                $diff->y *
                12
            ) +
            $diff->m;

        $days =
            $diff->d;

        $parts = [];

        if (
            $months > 0
        ) {
            $parts[] =
                $months.
                (
                    $months === 1
                    ? ' mês'
                    : ' meses'
                );
        }

        if (
            $days > 0
        ) {
            $parts[] =
                $days.
                (
                    $days === 1
                    ? ' dia'
                    : ' dias'
                );
        }

        return $parts !== []
            ? implode(
                ' e ',
                $parts
            )
            : '0 dias';
    }

    private function renderContent(
        string $content,
        array $values
    ): string {
        $pattern = '/\{\{\s*([^{}]+?)\s*\}\}|\[\[\s*([^\[\]]+?)\s*\]\]|<<\s*([^<>]+?)\s*>>|__([A-Z0-9_\sÀ-ÿ]+?)__|\(([A-Z0-9_\sÀ-ÿ]{2,})\)/u';

        $markers = [];
        $index = 0;

        $prepared = preg_replace_callback(
            $pattern,
            function (array $match) use (
                $values,
                &$markers,
                &$index
            ): string {
                $token = '';

                for ($i = 1; $i < count($match); $i++) {
                    if (isset($match[$i]) && trim($match[$i]) !== '') {
                        $token = $match[$i];
                        break;
                    }
                }

                $key = $this->normalize($token);

                if (
                    $key === '' ||
                    ! array_key_exists($key, $values)
                ) {
                    return $match[0];
                }

                $marker = '%%FROTAPRO_PDF_'.$index++.'%%';
                $item = $values[$key];

                $markers[$marker] = $item['html']
                    ? $item['value']
                    : e($item['value']);

                return $marker;
            },
            $content
        );

        $prepared ??= $content;

        $looksLikeHtml =
            preg_match(
                '/<\/?[a-z][^>]*>/i',
                $prepared
            ) === 1;

        $html = $looksLikeHtml
            ? $prepared
            : nl2br(e($prepared));

        return str_replace(
            array_keys($markers),
            array_values($markers),
            $html
        );
    }

    private function signatureImage(
        string $value
    ): ?string {
        if (str_starts_with($value, 'data:image/')) {
            return base64_decode(
                substr(
                    $value,
                    strpos($value, ',') + 1
                ),
                true
            ) !== false
                ? $value
                : null;
        }

        if (! Storage::disk('local')->exists($value)) {
            return null;
        }

        $binary = Storage::disk('local')->get($value);

        if ($binary === '') {
            return null;
        }

        return 'data:image/png;base64,'.
            base64_encode($binary);
    }

    private function normalize(string $value): string
    {
        $value = Str::ascii($value);
        $value = mb_strtoupper($value);

        return trim(
            preg_replace(
                '/[^A-Z0-9]+/',
                '_',
                $value
            ) ?? '',
            '_'
        );
    }

    private function formatValue(
        string $field,
        mixed $value
    ): string {
        if ($value instanceof DateTimeInterface) {
            return $value->format('d/m/Y');
        }

        $normalized = $this->normalize($field);

        if (
            str_starts_with($normalized, 'VALOR_') ||
            str_contains($normalized, 'CAPITAL_SOCIAL')
        ) {
            return $this->money($value);
        }

        if (
            str_starts_with($normalized, 'DATA_') ||
            str_ends_with($normalized, '_VALID_UNTIL')
        ) {
            try {
                return Carbon::parse($value)
                    ->format('d/m/Y');
            } catch (Throwable) {
                return (string) $value;
            }
        }

        if (is_bool($value)) {
            return $value ? 'Sim' : 'Não';
        }

        return (string) $value;
    }

    private function money(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return number_format(
            (float) $value,
            2,
            ',',
            '.'
        ).' €';
    }
}
