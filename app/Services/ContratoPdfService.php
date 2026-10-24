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

        $this->assertNotPendingRetification($contrato);

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

        app(\App\Services\FrotaProDocumentReadinessGuard::class)
            ->assertFinancialFields(
                (array)($contrato->campos_preenchidos??[])
            );
        $this->assertCurrentVersionSignatures($contrato);
        $empresa = $contrato->empresa;

        app(FrotaProContractBillingIntegration::class)
            ->assertSnapshot($contrato);

                /*
         * FROTAPRO_DOCUMENT_READINESS_4L8
         *
         * Esta validacao ocorre antes de sync().
         * Um documento incompleto nao pode reservar
         * numero global nem ser emitido.
         *
         * Rascunhos e previews continuam permitidos.
         */
        $preflightValues=$this->values(
            $contrato,
            $empresa
        );

        app(
            \App\Services\FrotaProDocumentReadinessGuard::class
        )->assertReady(
            (string)$contrato->template->conteudo_original,
            $preflightValues
        );

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

        $html =
            $this->renderHtml(
                $contrato,
                $empresa,
                false
            );

        $pdf = Pdf::loadHTML(
            $html
        )
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'isRemoteEnabled' => false,
                'isPhpEnabled' => false,
                'defaultFont' => 'DejaVu Serif',
            ]);

                // FrotaProNumeroDefinitivoObrigatorio
        if(
            \Illuminate\Support\Facades\Schema::hasTable('documentos') &&
            \Illuminate\Support\Facades\Schema::hasTable('document_sequences') &&
            blank($contrato->documento?->codigo)
        ){
            throw new \RuntimeException(
                'O contrato não possui número sequencial definitivo. Verifique o registo documental.'
            );
        }

        app(\App\Services\FrotaProPdfPageDecorator::class)
            ->apply($pdf, $contrato, $empresa);

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

                /*
                 * Revalidar dentro da transacao.
                 * A assinatura nao pode mudar entre
                 * a renderizacao e a gravacao.
                 */
                $locked->load([
                    'template',
                    'assinaturas',
                ]);

                $this->assertCurrentVersionSignatures($locked);
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

    public function assertReadyForPdf(
        Contrato $contrato,
        ?Empresa $empresa = null
    ): void {
        if(
            !$contrato->template ||
            blank($contrato->template->conteudo_original)
        ){
            throw ValidationException::withMessages([
                'contrato'=>
                    'O contrato não possui um modelo documental válido.',
            ]);
        }

        app(
            FrotaProDocumentReadinessGuard::class
        )->assertReady(
            (string)$contrato->template->conteudo_original,
            $this->values(
                $contrato,
                $empresa??$contrato->empresa,
                true
            )
        );
    }
    private function assertNotPendingRetification(
        Contrato $contrato
    ): void {
        $fields=(array)($contrato->campos_preenchidos??[]);

        if(filled($fields['FROTAPRO_RETIFICACAO_PENDENTE']??null)){
            throw ValidationException::withMessages([
                'contrato'=>
                    'Este contrato foi retificado e exige novas assinaturas antes da emissão do PDF.',
            ]);
        }
    }
    private function assertCurrentVersionSignatures(
        Contrato $contrato
    ): void {
        $version=(int)$contrato->versao_atual;

        /*
         * Preservar compatibilidade com os
         * documentos legados da versao 1.
         */
        if($version<=1){
            return;
        }

        /*
         * Determinar os signatarios exigidos
         * pelo modelo documental atual.
         */
        $template=(string)(
            $contrato->template?->conteudo_original ?? ''
        );

        $matches=[];

        preg_match_all(
            '/\bASSINATURA_(?:MOTORISTA|EMPRESA|PROPRIETARIO|TESTEMUNHA)\b/iu',
            $template,
            $matches
        );

        $required=array_values(array_unique(
            array_map(
                static fn(string $name):string=>
                    mb_strtoupper($name,'UTF-8'),
                $matches[0] ?? []
            )
        ));

        if($required===[]){
            return;
        }

        if(
            $contrato->status!=='assinado' ||
            $contrato->data_assinatura===null
        ){
            throw ValidationException::withMessages([
                'contrato'=>
                    'O contrato exige assinaturas validas da versao atual antes da emissao definitiva.',
            ]);
        }

        $signatures=$contrato->relationLoaded(
            'assinaturas'
        )
            ? $contrato->assinaturas
            : $contrato->assinaturas()->get();

        foreach($required as $placeholder){
            $valid=$signatures->contains(
                static function($signature)use(
                    $placeholder,
                    $version
                ):bool{
                    return
                        mb_strtoupper(
                            (string)$signature->placeholder,
                            'UTF-8'
                        )===$placeholder
                        &&
                        $signature->contrato_versao!==null
                        &&
                        (int)$signature->contrato_versao===$version
                        &&
                        $signature->status==='assinado'
                        &&
                        (bool)$signature->verificado
                        &&
                        filled($signature->assinatura_url);
                }
            );

            if(!$valid){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'A assinatura '.$placeholder.
                        ' nao foi confirmada na versao '.
                        $version.
                        '. As assinaturas anteriores nao podem autorizar a emissao definitiva.',
                ]);
            }
        }
    }
    public function renderHtml(
        Contrato $contrato,
        ?Empresa $empresa = null,
        bool $preview = false
    ): string {
        $this->assertNotPendingRetification($contrato);

        app(\App\Services\FrotaProDocumentReadinessGuard::class)
            ->assertFinancialFields(
                (array)($contrato->campos_preenchidos??[])
            );
        $empresa ??=
            $contrato->empresa;

        if (
            !$contrato->template ||
            blank(
                $contrato
                    ->template
                    ->conteudo_original
            )
        ) {
            throw ValidationException::withMessages([
                'contrato' =>
                    'O contrato não possui um template válido para renderização.',
            ]);
        }

        $values =
            $this->values(
                $contrato,
                $empresa,
                $preview
            );

        $documentHtml =
            $this->renderContent(
                (string)
                $contrato
                    ->template
                    ->conteudo_original,
                $values
            );

        $documentHtml=preg_replace(
            '/\bcom\s+periodicidade\s+pagamento\s+único\b/iu',
            'de uma só vez',
            $documentHtml
        )??$documentHtml;

        if($contrato->status!=='assinado'){
            $documentHtml=preg_replace(
                '/\bFeito\s+e\s+assinado\s+em\s+\d{2}\/\d{2}\/\d{4}\b/iu',
                'Preparado para assinatura em '.now()->format('d/m/Y'),
                $documentHtml
            )??$documentHtml;
        }
        return view(
            'pdf.contrato',
            [
                'contrato' =>
                    $contrato,

                'empresa' =>
                    $empresa,

                'documentHtml' =>
                    $documentHtml,

                'generatedAt' =>
                    now(),

                'preview' =>
                    $preview,
            ]
        )->render();
    }

    private function values(
        Contrato $contrato,
        ?Empresa $empresa,
        bool $preview = false
    ): array {
        $values = [];

        foreach (
            $contrato->campos_preenchidos ?? [] as $key => $value
        ) {
            if(
                (int)$contrato->versao_atual>1 &&
                str_starts_with(
                    $this->normalize((string)$key),
                    'ASSINATURA_'
                )
            ){
                continue;
            }
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

        $billingFields=(array)($contrato->campos_preenchidos??[]);

        $this->put(
            $values,
            'CONTRATO_CONDICOES_COBRANCA',
            $billingFields['CONDICOES_COBRANCA']??null
        );

        $this->put(
            $values,
            'CONTRATO_PERIODICIDADE_PAGAMENTO_TEXTO',
            $billingFields['PERIODICIDADE_PAGAMENTO_TEXTO']??null
        );

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
            $signatureVersion=$assinatura->contrato_versao;

            if(
                $signatureVersion===null
                    ? (int)$contrato->versao_atual!==1
                    : (int)$signatureVersion!==(int)$contrato->versao_atual
            ){
                continue;
            }
            if (
                blank(
                    $assinatura->placeholder
                )
            ) {
                continue;
            }

            $image = null;

            if (
                $assinatura->status ===
                    'assinado' &&
                filled(
                    $assinatura
                        ->assinatura_url
                )
            ) {
                $image =
                    $this->signatureImage(
                        (string)
                        $assinatura
                            ->assinatura_url
                    );
            }

            if ($image) {
                $this->put(
                    $values,
                    (string)
                    $assinatura
                        ->placeholder,
                    '<img src="'.
                        e($image).
                        '" class="signature" alt="Assinatura">',
                    true
                );

                continue;
            }

            if (!$preview) {
                continue;
            }

            $this->put(
                $values,
                (string)
                $assinatura
                    ->placeholder,
                '<span class="signature-pending">'.
                    (
                        $assinatura->status ===
                            'pendente'
                        ? 'Assinatura remota pendente'
                        : 'Assinatura a recolher'
                    ).
                    '</span>',
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
            : $this->plainTextToHtml(
                $prepared
            );

        return str_replace(
            array_keys($markers),
            array_values($markers),
            $html
        );
    }

    private function plainTextToHtml(
        string $content
    ): string {
        $lines =
            preg_split(
                '/\R/u',
                $content
            ) ?: [];

        $html = [];
        $firstContent = true;
        $afterClause = false;

        foreach (
            $lines as $line
        ) {
            $line =
                trim(
                    $line
                );

            if ($line === '') {
                continue;
            }

            $escaped =
                e($line);

            if (
                $firstContent &&
                mb_strlen(
                    $line
                ) <= 140
            ) {
                $html[] =
                    '<div class="doc-title">'.
                    $escaped.
                    '</div>';

                $firstContent = false;
                $afterClause = false;

                continue;
            }

            $firstContent = false;

            if (
                preg_match(
                    '/^CL[ÁA]USULA\b/iu',
                    $line
                )
            ) {
                $html[] =
                    '<div class="clause-title">'.
                    $escaped.
                    '</div>';

                $afterClause = true;

                continue;
            }

            if (
                $afterClause &&
                mb_strlen(
                    $line
                ) <= 80 &&
                !preg_match(
                    '/^\d+[\.\)]\s/u',
                    $line
                )
            ) {
                $html[] =
                    '<div class="clause-subtitle">'.
                    $escaped.
                    '</div>';

                $afterClause = false;

                continue;
            }

            $afterClause = false;

            if (
                preg_match(
                    '/^(ENTRE|E|CONSIDERANDO QUE:?|EM CONJUNTO DESIGNADOS.*)$/iu',
                    $line
                )
            ) {
                $html[] =
                    '<div class="doc-section-label">'.
                    $escaped.
                    '</div>';

                continue;
            }

            if (
                preg_match(
                    '/^[a-z]\)\s+/iu',
                    $line
                )
            ) {
                $html[] =
                    '<p class="bullet">'.
                    $escaped.
                    '</p>';

                continue;
            }

            if (
                preg_match(
                    '/^(Marca|Modelo|Matr[íi]cula|Data da primeira matr[íi]cula|Chassis|Cilindrada|Pot[êe]ncia|Combust[íi]vel|Energia|Lota[çc][ãa]o|Portas|Cor)\s*:/iu',
                    $line
                )
            ) {
                $html[] =
                    '<p class="field-line">'.
                    $escaped.
                    '</p>';

                continue;
            }

            if (
                preg_match(
                    '/^(O|A|PELO|PELA)\s+(PRIMEIRO|SEGUNDO|1\.º|2\.º|CONTRATANTE|LOCADORA|LOCAT[ÁA]RIO|MOTORISTA|PROPRIET[ÁA]RIO)/iu',
                    $line
                )
            ) {
                $html[] =
                    '<div class="signature-label">'.
                    $escaped.
                    '</div>';

                continue;
            }

            $html[] =
                '<p class="doc-paragraph">'.
                $escaped.
                '</p>';
        }

        return implode(
            "\n",
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
