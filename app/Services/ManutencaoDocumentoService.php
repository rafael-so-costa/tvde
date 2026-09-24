<?php

namespace App\Services;

use App\Models\Manutencao;
use App\Models\ManutencaoDocumento;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Smalot\PdfParser\Parser;
use Throwable;

class ManutencaoDocumentoService
{
    public function __construct(
        private PermissionService $permissionService
    ){}

    public function add(
        string $manutencaoId,
        string $tipo,
        UploadedFile $arquivo,
        User $actor,
        string $tenantId
    ): ManutencaoDocumento {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $manutencao=Manutencao::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($manutencaoId);

        $extension=strtolower(
            $arquivo->getClientOriginalExtension()
            ?: 'bin'
        );

        $directory=
            "manutencoes/{$tenantId}/{$manutencao->id}";

        $filename=
            Str::uuid()->toString().
            '.'.
            $extension;

        $path=$arquivo->storeAs(
            $directory,
            $filename,
            'local'
        );

        if(!$path){
            throw new RuntimeException(
                'Não foi possível guardar o documento da manutenção.'
            );
        }

        $absolutePath=
            Storage::disk('local')
                ->path($path);

        $hash=hash_file(
            'sha256',
            $absolutePath
        );

        if(!$hash){
            Storage::disk('local')
                ->delete($path);

            throw new RuntimeException(
                'Não foi possível calcular a integridade do documento.'
            );
        }

        try{
            $documento=DB::transaction(
                function() use(
                    $manutencao,
                    $tipo,
                    $arquivo,
                    $actor,
                    $tenantId,
                    $path,
                    $hash
                ){
                    $documento=
                        new ManutencaoDocumento([
                            'tipo'=>$tipo,
                        ]);

                    $documento->tenant_id=
                        $tenantId;

                    $documento->manutencao_id=
                        $manutencao->id;

                    $documento->arquivo_nome=
                        $arquivo
                            ->getClientOriginalName();

                    $documento->arquivo_path=
                        $path;

                    $documento->arquivo_mime=
                        $arquivo->getMimeType()
                        ?? $arquivo->getClientMimeType()
                        ?? 'application/octet-stream';

                    $documento->arquivo_tamanho=
                        $arquivo->getSize();

                    $documento->hash_arquivo=
                        $hash;

                    $documento->processamento_status=
                        $this->isPdf($documento)
                            ? 'pendente'
                            : 'pendente';

                    $documento->created_by=
                        $actor->id;

                    $documento->save();

                    return $documento;
                }
            );

            /*
             * Uma falha na leitura não elimina o documento.
             */
            if($this->isPdf($documento)){
                $this->processarPdf(
                    $documento->id,
                    $tenantId
                );
            }

            return $documento->refresh();
        }catch(Throwable $exception){
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }
    }

    public function processarPdf(
        string $documentoId,
        string $tenantId
    ): ManutencaoDocumento {
        $documento=ManutencaoDocumento::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($documentoId);

        if(!$this->isPdf($documento)){
            return $documento;
        }

        $documento->processamento_status=
            'processando';

        $documento->processamento_erro=null;
        $documento->save();

        try{
            $path=Storage::disk('local')
                ->path(
                    $documento->arquivo_path
                );

            $parser=new Parser();

            $pdf=$parser->parseFile($path);

            $texto=trim(
                $pdf->getText()
            );

            if(blank($texto)){
                throw new RuntimeException(
                    'O PDF não possui texto extraível. Pode ser necessário OCR.'
                );
            }

            $documento->texto_extraido=
                $texto;

            $documento->dados_extraidos=
                $this->extrairDados(
                    $texto
                );

            $documento->processamento_status=
                'concluido';

            $documento->processado_em=now();
            $documento->processamento_erro=null;
            $documento->save();
        }catch(Throwable $exception){
            $documento->processamento_status=
                'erro';

            $documento->processamento_erro=
                mb_substr(
                    $exception->getMessage(),
                    0,
                    2000
                );

            $documento->processado_em=now();
            $documento->save();
        }

        return $documento->refresh();
    }

    public function registrarOcr(
        string $documentoId,
        string $texto,
        User $actor,
        string $tenantId
    ): ManutencaoDocumento {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $documento=ManutencaoDocumento::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($documentoId);

        $documento->texto_extraido=
            trim($texto);

        $documento->dados_extraidos=
            $this->extrairDados(
                $texto
            );

        $documento->processamento_status=
            'concluido';

        $documento->processamento_erro=null;
        $documento->processado_em=now();
        $documento->save();

        return $documento;
    }

    public function delete(
        string $manutencaoId,
        string $documentoId,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $documento=ManutencaoDocumento::query()
            ->where('tenant_id',$tenantId)
            ->where(
                'manutencao_id',
                $manutencaoId
            )
            ->findOrFail($documentoId);

        $path=$documento->arquivo_path;

        $documento->delete();

        if($path){
            Storage::disk('local')
                ->delete($path);
        }
    }

    private function extrairDados(
        string $texto
    ): array {
        $normalizado=preg_replace(
            '/[ \t]+/u',
            ' ',
            $texto
        ) ?? $texto;

        $dados=[];

        preg_match_all(
            '/(?<!\d)(\d{9})(?!\d)/',
            $normalizado,
            $nifs
        );

        if(!empty($nifs[1])){
            $dados['nifs']=array_values(
                array_unique(
                    $nifs[1]
                )
            );
        }

        if(preg_match(
            '/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/',
            $normalizado,
            $data
        )){
            $dados['data']=$data[1];
        }

        if(preg_match(
            '/(?:total|total\s+a\s+pagar)[^\d]{0,20}(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))/iu',
            $normalizado,
            $total
        )){
            $dados['valor_total']=$this
                ->normalizeMoney(
                    $total[1]
                );
        }

        if(preg_match(
            '/(?:fatura|factura|invoice)[^\w]{0,10}(?:n[ºo.]?\s*)?([A-Z0-9\/\-]+)/iu',
            $normalizado,
            $numero
        )){
            $dados['numero_documento']=
                trim($numero[1]);
        }

        return $dados;
    }

    private function normalizeMoney(
        string $value
    ): float {
        $value=str_replace(
            [' ','€'],
            '',
            $value
        );

        if(
            str_contains($value,'.') &&
            str_contains($value,',')
        ){
            $value=str_replace(
                '.',
                '',
                $value
            );
        }

        $value=str_replace(
            ',',
            '.',
            $value
        );

        return round(
            (float)$value,
            2
        );
    }

    private function isPdf(
        ManutencaoDocumento $documento
    ): bool {
        return
            $documento->arquivo_mime===
                'application/pdf' ||
            strtolower(
                pathinfo(
                    $documento->arquivo_nome,
                    PATHINFO_EXTENSION
                )
            )==='pdf';
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if(!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )){
            abort(
                403,
                'Sem permissão suficiente para gerir documentos de manutenção.'
            );
        }
    }
}
