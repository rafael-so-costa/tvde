<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class FrotaProDocumentReadinessGuard
{
    /*
     * Estes campos podem ser preenchidos posteriormente
     * no fluxo de assinatura ou na atribuicao do numero.
     *
     * A excecao nao se aplica aos restantes dados.
     */
    private const DEFERRED=[
        'ASSINATURA_MOTORISTA',
        'ASSINATURA_PROPRIETARIO',
        'ASSINATURA_EMPRESA',
        'ASSINATURA_TESTEMUNHA',
        'DATA_ASSINATURA',
        'CONTRATO_DATA_ASSINATURA',
        'CODIGO_DOCUMENTO',
        'DOCUMENTO_CODIGO',
        'DOCUMENTO_NUMERO',
        'NUMERO_DOCUMENTO',
        'CONTRATO_NUMERO',
        'NUMERO_CONTRATO',
        'CONTRATO_CODIGO',
    ];

    /**
     * @param array<string,mixed> $values
     */
    public function assertReady(
        string $template,
        array $values
    ): void {
        /*
         * Apenas os delimitadores explicitos.
         * (TVDE), (IVA) e outras expressoes normais
         * nao sao consideradas placeholders.
         */
        $pattern=
            '/\{\{\s*([^{}]+?)\s*\}\}'.
            '|\[\[\s*([^\[\]]+?)\s*\]\]'.
            '|<<\s*([^<>]+?)\s*>>'.
            '|__([A-Z][A-Z0-9_ ]+)__'.
            '|\(([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\)/u';

        $matches=[];

        $result=preg_match_all(
            $pattern,
            $template,
            $matches,
            PREG_SET_ORDER|PREG_UNMATCHED_AS_NULL
        );

        if($result===false){
            throw ValidationException::withMessages([
                'contrato'=>
                    'O modelo documental contém marcadores inválidos.',
            ]);
        }

        $missing=[];

        foreach($matches as $match){
            $token='';

            for($i=1;$i<=5;$i++){
                $candidate=trim(
                    (string)($match[$i] ?? '')
                );

                if($candidate!==''){
                    $token=$candidate;
                    break;
                }
            }

            $key=$this->normalize($token);

            if($key===''){
                continue;
            }

            if(in_array($key,self::DEFERRED,true)){
                continue;
            }

            $entry=$values[$key] ?? null;

            if(is_array($entry)){
                $entry=$entry['value'] ?? null;
            }

            if(
                $entry===null ||
                (
                    is_string($entry) &&
                    trim($entry)===''
                ) ||
                (
                    is_array($entry) &&
                    $entry===[]
                )
            ){
                $missing[$key]=true;
                continue;
            }

            if(
                is_scalar($entry) &&
                $this->isExampleValue((string)$entry)
            ){
                $missing[$key]=true;
            }
        }

        /*
         * Proteger tambem contra modelos que tenham
         * incorporado literalmente dados de auditoria.
         */
        if(preg_match(
            '/\[(?:DADO DE EXEMPLO|POR PREENCHER)\]/iu',
            $template
        )){
            $missing['DADO_DE_EXEMPLO']=true;
        }

        if($missing!==[]){
            $keys=array_keys($missing);
            sort($keys,SORT_STRING);

            $shown=array_slice($keys,0,12);

            $message=
                'O documento possui campos por preencher: '.
                implode(', ',$shown);

            if(count($keys)>12){
                $message.=
                    ' e mais '.
                    (count($keys)-12).
                    ' campo(s)';
            }

            throw ValidationException::withMessages([
                'campos_preenchidos'=>$message.'.',
            ]);
        }
    }

    public function assertFinancialFields(array $fields): void
    {
        $type=mb_strtolower(trim((string)(
            $fields['TIPO_COBRANCA']??''
        )));

        if(!in_array($type,['variavel','variável','mista'],true)){
            return;
        }

        $base=trim((string)(
            $fields['BASE_CALCULO_COBRANCA']??''
        ));

        if(
            $base==='' ||
            preg_match(
                '/^(?:ok|teste|test|xxx+|exemplo|a definir|a confirmar|por preencher|n\/?a|[-_.]+)\.?$/iu',
                $base
            )
        ){
            throw \Illuminate\Validation\ValidationException::withMessages([
                'campos_preenchidos.BASE_CALCULO_COBRANCA'=>
                    'Indique uma base de calculo concreta.',
            ]);
        }

        $conditions=trim((string)(
            $fields['CONDICOES_COBRANCA']??''
        ));

        if(preg_match(
            '/\bsobre\s+(?:ok|teste|test|xxx+|exemplo)\b/iu',
            $conditions
        )){
            throw \Illuminate\Validation\ValidationException::withMessages([
                'campos_preenchidos.CONDICOES_COBRANCA'=>
                    'As condicoes financeiras contem texto de teste.',
            ]);
        }
    }
    private function normalize(string $name):string
    {
        $name=mb_strtoupper(
            Str::ascii($name),
            'UTF-8'
        );

        return trim(
            preg_replace(
                '/[^A-Z0-9]+/u',
                '_',
                $name
            ) ?? '',
            '_'
        );
    }

    private function isExampleValue(string $value):bool
    {
        return (bool)preg_match(
            '/\[(?:DADO DE EXEMPLO|POR PREENCHER)\]/iu',
            $value
        );
    }
}
