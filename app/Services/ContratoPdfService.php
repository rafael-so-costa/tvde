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

    /*
     * FROTAPRO_4P6_ATOMIC_PDF_ISSUANCE
     *
     * Reservar o numero documental e concluir
     * a emissao dentro da mesma transacao.
     *
     * Uma falha de validacao ou emissao reverte
     * os registos e a sequencia documental.
     */

    public function generate(
        string $contratoId,
        string $tenantId,
        User $actor,
        ?string $ip = null
    ): Contrato {
        $generatedPdfPath = null;

        try {
            return DB::transaction(
                function () use (
                    $contratoId,
                    $tenantId,
                    $actor,
                    $ip,
                    &$generatedPdfPath
                ): Contrato {
                    Contrato::query()
                        ->where('tenant_id',$tenantId)
                        ->whereKey($contratoId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    return $this->generateAtomico(
                        $contratoId,
                        $tenantId,
                        $actor,
                        $ip,
                        $generatedPdfPath
                    );
                },
                1
            );
        } catch (Throwable $exception) {
            /*
             * FROTAPRO_4P11_OUTER_ROLLBACK_CLEANUP
             *
             * Se a transacao exterior falhar
             * depois da escrita do PDF, evitar
             * deixar ficheiro temporario orfao.
             *
             * Nao se aplica a PDFs historicos:
             * a variavel so recebe caminhos novos.
             */
            if ($generatedPdfPath !== null) {
                try {
                    Storage::disk('local')->delete(
                        $generatedPdfPath
                    );
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            throw $exception;
        }
    }

    private function generateAtomico(
        string $contratoId,
        string $tenantId,
        User $actor,
        ?string $ip,
        ?string &$generatedPdfPath
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

        /*
         * Reutilizar somente o PDF valido da
         * mesma versao e do mesmo estado documental.
         */
        $revision=null;

        if($this->reuseExistingPdf($contrato,$revision)){
            return $contrato;
        }

        /*
         * Verificar assinaturas remotas confirmadas
         * antes de reservar numero documental
         * ou guardar qualquer PDF.
         */
        if(
            $this->hasCurrentRemoteSignatureEvidence(
                $contrato
            )
        ){
            $this->assertRemoteSignatureImagesIntact(
                $contrato
            );
        }
        $documentFingerprintBefore=
            $this->documentFingerprint($contrato);
        $signatureDigestBefore=
            $this->signatureDigest($contrato);

        $templateHashBefore=hash(
            'sha256',
            (string)$contrato->template->conteudo_original
        );

        /*
         * Reserva explicita durante a emissao.
         * Esta chamada ocorre dentro da transacao.
         */

        $documento = $this
            ->documentoRegistryService
            ->sync(
                $contrato,
                true
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

        /*
         * O caminho fica registado antes da escrita
         * para permitir limpeza em caso de falha.
         */
        $generatedPdfPath = $path;

        if (! Storage::disk('local')->put($path, $binary)) {
            throw new RuntimeException(
                'Não foi possível guardar o PDF do contrato.'
            );
        }


        $hash = hash('sha256', $binary);

        try {
            DB::transaction(function () use (
                $contrato,
                $tenantId,
                $actor,
                $ip,
                $path,
                $hash,
                $signatureDigestBefore,
                $templateHashBefore,
                $documentFingerprintBefore,
                $revision
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
                /*
                 * Outra geracao nao pode substituir
                 * o ficheiro entretanto registado.
                 */
                if(
                    (string)$locked->pdf_gerado_url!==
                    (string)$contrato->pdf_gerado_url ||
                    (string)$locked->hash_documento!==
                    (string)$contrato->hash_documento ||
                    $locked->status!==$contrato->status ||
                    $this->signatureDigest($locked)!==
                    $signatureDigestBefore ||
                    hash(
                        'sha256',
                        (string)$locked->template?->conteudo_original
                    )!==$templateHashBefore ||
                    $this->documentFingerprint($locked)!==
                        $documentFingerprintBefore
                ){
                    throw ValidationException::withMessages([
                        'contrato'=>
                            'O contrato, as assinaturas ou o PDF foram alterados durante a geração.',
                    ]);
                }

                /*
                 * Reconfirmar a imagem remota
                 * apos o bloqueio do contrato.
                 */
                /*
                 * A validacao deve continuar
                 * verdadeira depois do bloqueio
                 * do contrato para atualizacao.
                 */
                if(
                    $revision!==null ||
                    $this->hasCurrentRemoteSignatureEvidence(
                        $locked
                    )
                ){
                    $this->assertRemoteSignatureImagesIntact(
                        $locked
                    );
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
                        'pdf_path' => $path,
                        'template_id' => $locked->template_id,
                        'template_sha256' => $templateHashBefore,
                        'estado_emissao' => $locked->status,
                        'assinaturas_digest' => $signatureDigestBefore,
                        'document_fingerprint' => $documentFingerprintBefore,
                    ] + ($revision??[]),
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

    /*
     * Digest do estado de todas as assinaturas.
     * Uma assinatura posterior nao pode autorizar
     * reutilizacao de um PDF desatualizado.
     */
    /*
     * Normalizacao deterministica de valores
     * e mapeamentos para calculo SHA-256.
     */
    private function canonicalDocumentSnapshot(
        mixed $value
    ): mixed {
        if(!is_array($value)){
            return $value;
        }

        if(!array_is_list($value)){
            ksort($value,SORT_STRING);
        }

        foreach($value as $key=>$item){
            $value[$key]=
                $this->canonicalDocumentSnapshot($item);
        }

        return $value;
    }

    /*
     * Identidade documental independente
     * do estado e da imagem da assinatura.
     *
     * A fonte dos campos e a mesma utilizada
     * pelo renderizador de PDF.
     */
    private function documentFingerprint(
        Contrato $contrato
    ): string {
        $contrato->loadMissing([
            'template',
            'empresa',
            'motorista',
            'proprietario',
            'veiculo',
            'assinaturas',
        ]);

        $values=$this->values(
            $contrato,
            $contrato->empresa
        );

        /*
         * Apenas estas alteracoes decorrem
         * legitimamente da confirmacao remota.
         */
        $volatile=[
            'STATUS_CONTRATO'=>true,
            'CONTRATO_STATUS'=>true,
            'DATA_ASSINATURA'=>true,
            'CONTRATO_DATA_ASSINATURA'=>true,
        ];

        foreach($contrato->assinaturas as $signature){
            if(filled($signature->placeholder)){
                $volatile[
                    $this->normalize(
                        (string)$signature->placeholder
                    )
                ]=true;
            }
        }

        $mappings=(array)(
            $contrato->template?->campos_mapeados
            ?? []
        );

        /*
         * Campos mapeados a fontes volateis
         * tambem devem ser ignorados no
         * valor renderizado, mas a configuracao
         * do mapeamento continua protegida.
         */
        foreach($mappings as $target=>$mapping){
            if(!is_array($mapping)){
                continue;
            }

            $source=$this->normalize(
                str_replace(
                    '.',
                    '_',
                    (string)($mapping['campo']??'')
                )
            );

            if(
                isset($volatile[$source]) ||
                str_starts_with(
                    $source,
                    'ASSINATURA_'
                )
            ){
                $volatile[
                    $this->normalize((string)$target)
                ]=true;
            }
        }

        foreach(array_keys($values) as $key){
            if(
                isset($volatile[$key]) ||
                str_starts_with(
                    $key,
                    'ASSINATURA_'
                )
            ){
                unset($values[$key]);
            }
        }

        $snapshot=$this->canonicalDocumentSnapshot([
            'values'=>$values,
            'mappings'=>$mappings,
        ]);

        return hash(
            'sha256',
            json_encode(
                $snapshot,
                JSON_THROW_ON_ERROR |
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            )
        );
    }

    /*
     * Confirmar o conteudo binario das
     * assinaturas remotas da versao atual.
     *
     * A evidencia e gerada por
     * ContratoService::confirmRemoteSignature.
     */
    /*
     * FROTAPRO_4N33_8_4_2
     *
     * Identificar assinaturas remotas
     * confirmadas para a versao atual.
     *
     * Assinaturas de versoes anteriores
     * nao devem bloquear novas emissoes.
     */
    private function hasCurrentRemoteSignatureEvidence(
        Contrato $contrato
    ): bool {
        $signatures=$contrato->assinaturas()
            ->where(
                'contrato_versao',
                (int)$contrato->versao_atual
            )
            ->where('status','assinado')
            ->where('verificado',true)
            ->get();

        if($signatures->isEmpty()){
            return false;
        }

        $auditIds=LogAuditoriaContrato::query()
            ->where('tenant_id',$contrato->tenant_id)
            ->where('contrato_id',$contrato->id)
            ->where('acao','assinatura_remota')
            ->get()
            ->map(
                static fn($log):string=>
                    (string)(
                        ((array)($log->detalhes??[]))
                            ['assinatura_id']??''
                    )
            )
            ->all();

        foreach($signatures as $signature){
            $path=(string)$signature->assinatura_url;

            if(
                str_starts_with(
                    $path,
                    'contract-signatures/'
                ) ||
                in_array(
                    (string)$signature->id,
                    $auditIds,
                    true
                )
            ){
                return true;
            }
        }

        return false;
    }
    private function assertRemoteSignatureImagesIntact(
        Contrato $contrato
    ): void {
        $audits=LogAuditoriaContrato::query()
            ->where('tenant_id',$contrato->tenant_id)
            ->where('contrato_id',$contrato->id)
            ->where('acao','assinatura_remota')
            ->get();

        $auditCounts=[];

        foreach($audits as $audit){
            $details=(array)($audit->detalhes??[]);
            $id=(string)($details['assinatura_id']??'');

            if($id===''){
                continue;
            }

            $auditCounts[$id]=
                ($auditCounts[$id]??0)+1;
        }

        $signatures=$contrato->assinaturas()
            ->where(
                'contrato_versao',
                (int)$contrato->versao_atual
            )
            ->where('status','assinado')
            ->where('verificado',true)
            ->get();

        $disk=Storage::disk('local');
        $verified=0;

        foreach($signatures as $signature){
            $id=(string)$signature->id;
            $storedPath=(string)$signature->assinatura_url;

            $isRemote=
                str_starts_with(
                    $storedPath,
                    'contract-signatures/'
                ) ||
                isset($auditCounts[$id]);

            if(!$isRemote){
                continue;
            }

            /*
             * Uma assinatura remota confirmada
             * exige exatamente uma evidencia
             * de confirmacao correspondente.
             */
            if(($auditCounts[$id]??0)!==1){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'A assinatura remota não possui uma auditoria de confirmação única e válida.',
                ]);
            }

            $expectedPath=
                'contract-signatures/'.
                $contrato->tenant_id.'/'.
                $contrato->id.'/'.
                $id.'.png';

            if(
                $storedPath!==$expectedPath ||
                !$disk->exists($expectedPath)
            ){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'O ficheiro da assinatura remota não corresponde ao registo.',
                ]);
            }

            $binary=$disk->get($expectedPath);

            if(
                !is_string($binary) ||
                !str_starts_with(
                    $binary,
                    "\x89PNG\r\n\x1A\n"
                )
            ){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'O conteúdo da assinatura remota é inválido.',
                ]);
            }

            $expectedHash=(string)
                $signature->hash_documento;

            $actualHash=hash(
                'sha256',
                implode('|',[
                    (string)$contrato->id,
                    $id,
                    hash('sha256',$binary),
                ])
            );

            if(
                !preg_match(
                    '/^[a-f0-9]{64}$/D',
                    $expectedHash
                ) ||
                !hash_equals(
                    $expectedHash,
                    $actualHash
                )
            ){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'A integridade da assinatura remota não foi confirmada.',
                ]);
            }

            $verified++;
        }

        if($verified===0){
            throw ValidationException::withMessages([
                'contrato'=>
                    'Nenhuma assinatura remota válida foi encontrada nesta versão.',
            ]);
        }
    }
    private function signatureDigest(
        Contrato $contrato
    ): string {
        $items=$contrato->assinaturas()
            ->orderBy('id')
            ->get()
            ->map(static fn($assinatura)=>[
                'id'=>(string)$assinatura->id,
                'versao'=>$assinatura->contrato_versao,
                'status'=>(string)$assinatura->status,
                'verificado'=>(bool)$assinatura->verificado,
                'hash'=>(string)$assinatura->hash_documento,
                'url'=>(string)$assinatura->assinatura_url,
            ])
            ->all();

        return hash(
            'sha256',
            json_encode($items,JSON_THROW_ON_ERROR)
        );
    }

    /*
     * Verificar integridade e identidade do PDF.
     * Nunca recriar silenciosamente o ficheiro
     * de uma versao ja emitida.
     */
    private function reuseExistingPdf(
        Contrato $contrato,
        ?array &$revision=null
    ): bool {
        $path=trim((string)$contrato->pdf_gerado_url);
        $expected=trim((string)$contrato->hash_documento);

        if($path==='' && $expected===''){
            return false;
        }

        if(
            $path==='' ||
            !preg_match('/^[a-f0-9]{64}$/D',$expected)
        ){
            throw ValidationException::withMessages([
                'contrato'=>'O registo do PDF existente está incompleto.',
            ]);
        }

        $prefix=
            'contract-pdfs/'.
            $contrato->tenant_id.'/'.
            $contrato->id.'/';

        if(!str_starts_with($path,$prefix)){
            throw ValidationException::withMessages([
                'contrato'=>'O caminho do PDF não corresponde ao contrato.',
            ]);
        }

        $filename=substr($path,strlen($prefix));

        if(!preg_match(
            '/^v([1-9][0-9]*)-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.pdf$/D',
            $filename,
            $match
        )){
            throw ValidationException::withMessages([
                'contrato'=>'O PDF não possui identificação de versão válida.',
            ]);
        }

        $disk=Storage::disk('local');

        if(!$disk->exists($path)){
            throw ValidationException::withMessages([
                'contrato'=>'O PDF original está em falta. É necessária a recuperação do ficheiro.',
            ]);
        }

        $binary=$disk->get($path);

        if(
            !is_string($binary) ||
            !str_starts_with($binary,'%PDF-') ||
            !hash_equals(
                $expected,
                hash('sha256',$binary)
            )
        ){
            throw ValidationException::withMessages([
                'contrato'=>'A integridade do PDF original não foi confirmada.',
            ]);
        }

        /*
         * Um contrato com nova versao pode
         * receber outro PDF. O antigo fica
         * guardado no armazenamento privado.
         */
        if(
            (int)$match[1]!==
            (int)$contrato->versao_atual
        ){
            return false;
        }

        /*
         * O log deve corresponder ao ficheiro
         * efetivamente associado ao contrato.
         * A ordenacao por UUID nao representa
         * necessariamente a ordem de emissao.
         */
        /*
         * Um PDF ja emitido so pode ser reutilizado
         * quando existe evidencia de emissao
         * correspondente ao ficheiro atual.
         *
         * Nunca selecionar um log alternativo
         * apenas porque e o unico disponivel.
         */
        $logs=LogAuditoriaContrato::query()
            ->where('tenant_id',$contrato->tenant_id)
            ->where('contrato_id',$contrato->id)
            ->where('acao','geracao_pdf')
            ->get();

        $log=$logs->first(
            static fn($entry):bool=>
                (string)(
                    ((array)$entry->detalhes)['pdf_path']??''
                )===$path
        );

        if(!$log){
            throw ValidationException::withMessages([
                'contrato'=>
                    'Não existe evidência de emissão correspondente ao PDF registado.',
            ]);
        }

        $details=(array)($log->detalhes??[]);

        /*
         * Os metadados historicos incompletos
         * nao autorizam reutilizacao automatica.
         * O PDF original permanece preservado.
         */
        $requiredEvidence=[
            'versao',
            'hash',
            'pdf_path',
            'template_id',
            'template_sha256',
            'estado_emissao',
            'assinaturas_digest',
        ];

        foreach($requiredEvidence as $field){
            $value=$details[$field]??null;

            if(
                !is_string($value) &&
                !is_int($value)
            ){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'O registo de auditoria do PDF está incompleto: '.$field.'.',
                ]);
            }

            if(trim((string)$value)===''){
                throw ValidationException::withMessages([
                    'contrato'=>
                        'O registo de auditoria do PDF não contém '.$field.'.',
                ]);
            }
        }

        /*
         * Comparar a evidencia com o documento
         * efetivamente guardado, nao apenas com
         * a existencia de um log qualquer.
         */
        $evidenceValid=
            (string)$details['pdf_path']===$path &&
            hash_equals(
                $expected,
                (string)$details['hash']
            ) &&
            ctype_digit((string)$details['versao']) &&
            (int)$details['versao']===(int)$match[1] &&
            (string)$details['template_id']===
                (string)$contrato->template_id &&
            (bool)preg_match(
                '/^[a-f0-9]{64}$/D',
                (string)$details['template_sha256']
            ) &&
            (bool)preg_match(
                '/^[a-f0-9]{64}$/D',
                (string)$details['assinaturas_digest']
            );

        if(!$evidenceValid){
            throw ValidationException::withMessages([
                'contrato'=>
                    'O registo de auditoria não corresponde à versão, ao hash ou à origem do PDF.',
            ]);
        }

        /*
         * A emissao atual tem um digest
         * de assinaturas. Registos anteriores
         * precisam de uma auditoria separada.
         */
        $recordedDigest=
            isset($details['assinaturas_digest'])
            ? (string)$details['assinaturas_digest']
            : null;

        $currentDigest=$this->signatureDigest($contrato);

        $recordedStatus=
            isset($details['estado_emissao'])
            ? (string)$details['estado_emissao']
            : null;

        $signatureChanged=
            $recordedDigest!==null &&
            !hash_equals(
                $recordedDigest,
                $currentDigest
            );

        $statusChanged=
            $recordedStatus!==null &&
            $recordedStatus!==$contrato->status;

        if(
            $recordedDigest===null &&
            $contrato->assinaturas()->exists()
        ){
            throw ValidationException::withMessages([
                'contrato'=>
                    'O PDF legado não possui evidência suficiente para validar as assinaturas.',
            ]);
        }

        /*
         * Sem modificacoes, reutilizar o mesmo
         * ficheiro e preservar o hash original.
         */
        if(!$signatureChanged && !$statusChanged){
            return true;
        }

        /*
         * A unica revisao automatica permitida:
         * enviado -> assinado, com assinatura
         * remota confirmada e template identico.
         */
        $signedCount=$contrato->assinaturas()
            ->where(
                'contrato_versao',
                (int)$contrato->versao_atual
            )
            ->where('status','assinado')
            ->where('verificado',true)
            ->whereNotNull('assinado_em')
            ->count();

        $pending=$contrato->assinaturas()
            ->where(
                'contrato_versao',
                (int)$contrato->versao_atual
            )
            ->where(function($query){
                $query
                    ->where('status','!=','assinado')
                    ->orWhere('verificado',false);
            })
            ->exists();

        $remoteAudit=LogAuditoriaContrato::query()
            ->where('tenant_id',$contrato->tenant_id)
            ->where('contrato_id',$contrato->id)
            ->where('acao','assinatura_remota')
            ->exists();

        $currentTemplateHash=hash(
            'sha256',
            (string)$contrato->template?->conteudo_original
        );

        /*
         * O PDF original deve possuir snapshot
         * e os dados estaveis devem coincidir.
         * Logs anteriores continuam consultaveis,
         * mas nao autorizam revisao automatica
         * sem esta evidencia.
         */
        $recordedFingerprint=(string)(
            $details['document_fingerprint']??''
        );

        $documentMatches=
            (bool)preg_match(
                '/^[a-f0-9]{64}$/D',
                $recordedFingerprint
            ) &&
            hash_equals(
                $recordedFingerprint,
                $this->documentFingerprint($contrato)
            );
        $validTransition=
            $signatureChanged &&
            $statusChanged &&
            $recordedStatus==='enviado' &&
            $contrato->status==='assinado' &&
            $contrato->data_assinatura!==null &&
            (int)($details['versao']??0)===
                (int)$contrato->versao_atual &&
            (string)($details['template_id']??'')===
                (string)$contrato->template_id &&
            isset($details['template_sha256']) &&
            hash_equals(
                (string)$details['template_sha256'],
                $currentTemplateHash
            ) &&
            $signedCount>0 &&
            !$pending &&
            $remoteAudit &&
            $documentMatches;

        if(!$validTransition){
            throw ValidationException::withMessages([
                'contrato'=>
                    'O documento ou as assinaturas foram alterados. A revisão automática não está autorizada.',
            ]);
        }

        /*
         * A revisão conserva o caminho e o hash
         * do documento anterior na auditoria.
         */
        /*
         * Antes de produzir o PDF definitivo,
         * confirmar a imagem realmente assinada.
         */
        $this->assertRemoteSignatureImagesIntact(
            $contrato
        );
        $revision=[
            'pdf_anterior_path'=>$path,
            'pdf_anterior_hash'=>$expected,
            'motivo_revisao'=>'assinatura_remota',
        ];

        return false;
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

        /*
         * FROTAPRO_4R14B5I_RGPD12_PDF_LAYOUT
         *
         * Corrige apenas a apresentacao da declaracao RGPD 1.2.
         * O texto versionado, o checksum e os PDF ja emitidos
         * permanecem inalterados.
         */
        if (
            (string) ($contrato->template?->modelo_documento_saas_versao ?? '') === '1.2' &&
            app(FrotaProRgpdV11Service::class)->isRgpd($contrato->template)
        ) {
            $documentHtml = app(FrotaProRgpdV12PdfFormatter::class)
                ->format($documentHtml);
        }

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
        // FROTAPRO_4N31_AUTHORITATIVE_INIT
        $authoritativeKeys=$this->authoritativeEntityKeys();


        foreach (
            $contrato->campos_preenchidos ?? [] as $key => $value
        ) {
            /*
             * Campos automaticos pertencem ao cadastro
             * ou ao proprio contrato, nao ao formulario.
             */
            $normalizedKey=$this->normalize((string)$key);

            if(
                isset($authoritativeKeys[$normalizedKey]) &&
                !in_array(
                    $normalizedKey,
                    [
                        'PERCENTAGEM_CONTRATO',
                        'CONDICOES_COBRANCA',
                        'PERIODICIDADE_PAGAMENTO_TEXTO',
                    ],
                    true
                )
            ){
                continue;
            }
            /*
             * FROTAPRO_4P6_SIGNATURE_IMAGE_ONLY
             *
             * Nao utilizar texto Base64 guardado
             * nos campos preenchidos do contrato.
             *
             * As assinaturas sao carregadas dos
             * registos de assinatura da versao
             * atual e convertidas em imagens.
             */

            if (
                str_starts_with(
                    $normalizedKey,
                    'ASSINATURA_'
                )
            ) {
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
                $this->requiredAddress(
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
                'privacidade_contacto_email',
                'privacidade_contacto_telefone',
                'privacidade_epd_nome',
                'privacidade_epd_email',
                'privacidade_destinatarios',
                'privacidade_subcontratantes',
                'privacidade_prazo_identificacao',
                'privacidade_prazo_contratos',
                'privacidade_prazo_fiscal',
                'privacidade_prazo_operacional',
                'privacidade_prazo_consentimentos',
                'privacidade_prazo_localizacao',
                'privacidade_transferencias_internacionais',
                'privacidade_decisoes_automatizadas',
                'privacidade_finalidade_localizacao',
                'privacidade_finalidade_dados_especiais',
                'privacidade_categorias_dados_especiais',
                'privacidade_condicao_artigo9',
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
                $this->requiredAddress(
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

        $values = $this->applyTemplateMappings(
            $values,
            $contrato,
            $authoritativeKeys
        );

        if (
            app(FrotaProRgpdV11Integration::class)
                ->applies($contrato->template)
        ) {
            $rgpdValues = app(FrotaProRgpdV11Service::class)
                ->pdfValues($contrato, $preview);

            foreach ($rgpdValues as $key => $value) {
                /*
                 * A assinatura definitiva e carregada
                 * dos registos assinados e verificados
                 * da versao atual do contrato.
                 *
                 * Nunca usar uma assinatura textual
                 * fornecida pelo cliente no PDF final.
                 */
                if (
                    $key === 'ASSINATURA_TITULAR' &&
                    !$preview
                ) {
                    continue;
                }

                /*
                 * O renderer FrotaPro exige:
                 *
                 * [
                 *     'value' => '...',
                 *     'html' => false
                 * ]
                 *
                 * $this->put() aplica essa estrutura
                 * e normaliza a chave.
                 *
                 * Os dados RGPD devem ser tratados
                 * como texto, nunca HTML arbitrario.
                 */
                if (!is_string($key) ||
                    !preg_match('/^[A-Z0-9_]+$/D', $key)) {
                    throw ValidationException::withMessages([
                        'contrato' =>
                            'O RGPD contem uma chave documental invalida.',
                    ]);
                }

                if (is_array($value)) {
                    $value = $value['value'] ?? null;
                }

                if (
                    $value !== null &&
                    !is_scalar($value)
                ) {
                    throw ValidationException::withMessages([
                        'contrato' =>
                            'O RGPD contem um valor documental invalido.',
                    ]);
                }

                $this->put(
                    $values,
                    $key,
                    $value === null ? null : (string) $value,
                    false
                );
            }
        }

        return $values;
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

    /*
     * Os campos de entidades e do contrato sao
     * preenchidos exclusivamente pelos seus registos.
     */
    private function authoritativeEntityKeys(): array
    {
        $keys=[];

        $groups=app(TemplateSourceCatalog::class)->grouped();

        foreach([
            'empresa',
            'motorista',
            'proprietario',
            'veiculo',
            'contrato',
        ] as $entity){
            foreach(($groups[$entity]??[]) as $source){
                $path=$source['value']??null;

                if(
                    !is_string($path) ||
                    !str_starts_with($path,$entity.'.')
                ){
                    continue;
                }

                $field=substr(
                    $path,
                    strlen($entity)+1
                );

                $keys[
                    $this->normalize($entity.'_'.$field)
                ]=true;

                if($entity==='contrato'){
                    $keys[
                        $this->normalize($field)
                    ]=true;
                }else{
                    $keys[
                        $this->normalize($field.'_'.$entity)
                    ]=true;
                }
            }
        }

        foreach([
            'NOME_EMPRESA',
            'NOME_MOTORISTA',
            'NOME_PROPRIETARIO',
            'MATRICULA_VEICULO',
            'MODELO_VEICULO',
            'STATUS_CONTRATO',
            'DURACAO_CONTRATO',
            'CONTRATO_DURACAO',
            'CONTRATO_VALOR_DIARIA',
            'CONTRATO_VALOR_SEMANAL',
            'CONTRATO_VALOR_CAUCAO',
            'CONTRATO_VALOR_TOTAL',
        ] as $alias){
            $keys[$alias]=true;
        }

        return $keys;
    }
    private function applyTemplateMappings(
        array $values,
        Contrato $contrato,
        array $authoritativeKeys
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
                isset($authoritativeKeys[$targetKey]) ||
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

    /*
     * Morada contratual estruturada:
     * rua, codigo postal e cidade obrigatorios.
     */
    private function requiredAddress(object $model): string
    {
        foreach([
            'endereco_rua',
            'endereco_cep',
            'endereco_cidade',
        ] as $field){
            $value=trim(
                (string)($model->getAttribute($field)??'')
            );

            if($value===''){
                return '';
            }
        }

        return $this->fullAddress($model);
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
