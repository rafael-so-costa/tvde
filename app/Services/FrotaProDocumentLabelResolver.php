<?php

namespace App\Services;

use App\Models\Contrato;
use Illuminate\Support\Str;

final class FrotaProDocumentLabelResolver
{
    public function resolve(
        ?Contrato $contrato,
        ?string $html=null
    ): string {
        $candidates=[];

        if($contrato){
            $candidates=[
                $contrato->template?->nome,
                $contrato->tipoContrato?->nome,
                $contrato->tipoContrato?->codigo,
                $contrato->tipoContrato?->slug,
                $contrato->tipo,
            ];
        }

        foreach($candidates as $candidate){
            $label=$this->classify(
                (string)($candidate ?? '')
            );

            if($label!==null){
                return $label;
            }
        }

        if($html!==null && trim($html)!==''){
            foreach([
                '~<title\b[^>]*>(.*?)</title>~is',
                '~<h1\b[^>]*>(.*?)</h1>~is',
                '~<p\b[^>]*>(.*?)</p>~is',
            ] as $pattern){
                if(preg_match($pattern,$html,$match)){
                    $label=$this->classify(
                        strip_tags($match[1])
                    );

                    if($label!==null){
                        return $label;
                    }
                }
            }
        }

        return 'Contrato';
    }

    private function classify(string $value): ?string
    {
        $value=mb_strtolower(
            Str::ascii($value),
            'UTF-8'
        );

        if(preg_match(
            '/(^|[^a-z0-9])(denuncia|rescisao|cessacao)([^a-z0-9]|$)/',
            $value
        )){
            return 'Denúncia';
        }

        if(preg_match(
            '/(^|[^a-z0-9])(autorizacao|declaracao)([^a-z0-9]|$)/',
            $value
        )){
            return 'Declaração';
        }

        return null;
    }
}
