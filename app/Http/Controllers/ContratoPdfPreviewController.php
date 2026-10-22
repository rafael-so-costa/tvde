<?php

namespace App\Http\Controllers;

use App\Http\Requests\PreviewContratoRequest;
use App\Models\Contrato;
use App\Models\Empresa;
use App\Services\FrotaProPdfPageDecorator;
use App\Services\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class ContratoPdfPreviewController extends Controller
{
    public function __invoke(
        PreviewContratoRequest $request
    ): Response {
        /*
         * Reutiliza validacoes de tenant, entidades,
         * permissao e template do preview existente.
         *
         * Nao chama ContratoService::store(),
         * DocumentoRegistryService::sync()
         * nem grava contratos ou assinaturas.
         */
        $originalResponse=app()->call(
            [
                app(ContratoPreviewController::class),
                'preview',
            ],
            [
                'request'=>$request,
            ]
        );

        if(!$originalResponse instanceof JsonResponse){
            throw new RuntimeException(
                'O preview original nao devolveu uma resposta JSON.'
            );
        }

        if($originalResponse->getStatusCode()!==200){
            return $originalResponse;
        }

        $payload=$originalResponse->getData(true);
        $html=data_get($payload,'data.html');

        if(!is_string($html) || trim($html)===''){
            throw new RuntimeException(
                'O preview original nao devolveu HTML valido.'
            );
        }

        $tenantId=app(TenantContext::class)->requireId();

        $empresa=null;
        $empresaId=$request->input('empresa_id');

        if(is_string($empresaId) && $empresaId!==''){
            $empresa=Empresa::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($empresaId)
                ->first();
        }

        /*
         * Contrato de apresentacao apenas em memoria.
         * Nao possui identificador documental definitivo.
         */
        $contrato=new Contrato();
        $contrato->versao_atual=1;
        $contrato->setRelation('documento',null);

        /*
         * Converter somente a classe da tag body.
         * Nao alterar seletores CSS preview-mode
         * existentes dentro de style.
         */
        $html=preg_replace_callback(
            '/<body\b[^>]*>/iu',
            static function(array $match):string{
                return (string)preg_replace(
                    '/\bpreview-mode\b/u',
                    'pdf-mode',
                    $match[0]
                );
            },
            $html,
            1
        );

        if(!is_string($html)){
            throw new RuntimeException(
                'Nao foi possivel preparar o HTML.'
            );
        }

        /*
         * Caso o preview original devolva apenas
         * o conteudo HTML, envolvemos o documento
         * na mesma view formal do PDF definitivo.
         */
        if(!preg_match('/<html\b/iu',$html)){
            $html=view('pdf.contrato',[
                'contrato'=>$contrato,
                'empresa'=>$empresa,
                'documentHtml'=>$html,
                'generatedAt'=>now(),
                'previewMode'=>false,
            ])->render();
        }

        $pdf=Pdf::loadHTML($html)
            ->setPaper('a4','portrait')
            ->setOptions([
                'isRemoteEnabled'=>false,
                'isPhpEnabled'=>false,
                'defaultFont'=>'DejaVu Serif',
            ]);

        app(FrotaProPdfPageDecorator::class)
            ->apply($pdf,$contrato,$empresa,$html);

        $binary=$pdf->output();

        if(
            !is_string($binary) ||
            strlen($binary)<1000 ||
            !str_starts_with($binary,'%PDF-')
        ){
            throw new RuntimeException(
                'Nao foi possivel gerar o PDF de preview.'
            );
        }

        return new Response(
            $binary,
            200,
            [
                'Content-Type'=>'application/pdf',
                'Content-Disposition'=>
                    'inline; filename="contrato-preview.pdf"',
                'Cache-Control'=>
                    'private, no-store, max-age=0, must-revalidate',
                'Pragma'=>'no-cache',
                'X-Content-Type-Options'=>'nosniff',
            ]
        );
    }
}
