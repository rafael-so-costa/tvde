<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\Empresa;
use Barryvdh\DomPDF\PDF;
use Dompdf\Canvas;
use Dompdf\FontMetrics;

final class FrotaProPdfPageDecorator
{
    public function apply(
        PDF $pdf,
        ?Contrato $contrato=null,
        ?Empresa $empresa=null,
        ?string $sourceHtml=null
    ): void {
        $pdf->render();

        $codigo=$contrato?->documento?->codigo
            ?: 'A ATRIBUIR';

        $empresaNome=trim(
            (string)(
                $empresa?->nome_empresa
                ?: 'FrotaPRO'
            )
        );

        if($empresa?->nif){
            $empresaNome.=' | NIF '.$empresa->nif;
        }

                $documentLabel=app(
            \App\Services\FrotaProDocumentLabelResolver::class
        )->resolve($contrato,$sourceHtml);

        $canvas=$pdf->getDomPDF()->getCanvas();

        $canvas->page_script(
            static function(
                int $pageNumber,
                int $pageCount,
                Canvas $pageCanvas,
                FontMetrics $fontMetrics
            ) use ($codigo,$empresaNome,$documentLabel): void {
                $width=(float)$pageCanvas->get_width();
                $height=(float)$pageCanvas->get_height();

                // Margem lateral: 21 mm.
                $side=59.53;

                // Rodape dentro da zona reservada
                // de 32 mm na parte inferior.
                $lineY=$height-68;
                $textY=$height-55;

                $color=[0.37,0.44,0.52];

                $pageCanvas->line(
                    $side,
                    $lineY,
                    $width-$side,
                    $lineY,
                    $color,
                    0.35
                );

                $font=$fontMetrics->getFont(
                    'DejaVu Sans',
                    'normal'
                );

                $fontSize=7;

                $right=
                    $documentLabel.' '.$codigo.
                    ' | Página '.$pageNumber.
                    ' de '.$pageCount;

                $rightWidth=
                    $fontMetrics->getTextWidth(
                        $right,
                        $font,
                        $fontSize
                    );

                $available=
                    max(
                        40,
                        $width-
                        2*$side-
                        $rightWidth-
                        16
                    );

                $left=$empresaNome;
                $original=$left;

                while(
                    mb_strlen($left)>1 &&
                    $fontMetrics->getTextWidth(
                        $left,
                        $font,
                        $fontSize
                    )>$available
                ){
                    $left=mb_substr($left,0,-1);
                }

                if($left!==$original){
                    $left=rtrim($left).'...';
                }

                $pageCanvas->text(
                    $side,
                    $textY,
                    $left,
                    $font,
                    $fontSize,
                    $color
                );

                $pageCanvas->text(
                    $width-$side-$rightWidth,
                    $textY,
                    $right,
                    $font,
                    $fontSize,
                    $color
                );
            }
        );
    }
}
