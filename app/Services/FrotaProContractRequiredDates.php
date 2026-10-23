<?php

namespace App\Services;

use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class FrotaProContractRequiredDates
{
    public function assertValid(
        array $data,
        ?TemplateContrato $template,
        ?TipoContrato $tipo = null
    ): void {
        $financial=in_array(
            $tipo?->codigo,
            [
                'contrato_de_prestacao_de_servicos',
                'aluguer_tvde_pessoa_singular',
                'aluguer_tvde_pessoa_coletiva',
            ],
            true
        );

        $content=(string)($template?->conteudo_original??'');

        $markers=[];

        preg_match_all(
            '/\{\{\s*([^{}]+?)\s*\}\}'.
            '|\[\[\s*([^\[\]]+?)\s*\]\]'.
            '|<<\s*([^<>]+?)\s*>>'.
            '|__([A-Z][A-Z0-9_ ]+)__'.
            '|\(([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\)/u',
            $content,
            $matches,
            PREG_SET_ORDER|PREG_UNMATCHED_AS_NULL
        );

        foreach($matches as $match){
            foreach(array_slice($match,1) as $token){
                if(!is_string($token)||trim($token)===''){
                    continue;
                }

                $name=mb_strtoupper(Str::ascii($token));

                $name=trim(
                    preg_replace(
                        '/[^A-Z0-9]+/',
                        '_',
                        $name
                    )??'',
                    '_'
                );

                if($name!==''){
                    $markers[$name]=true;
                }

                break;
            }
        }

        $durationRequired=$financial||
            isset($markers['DURACAO_CONTRATO'])||
            isset($markers['CONTRATO_DURACAO']);

        $startRequired=$durationRequired||
            isset($markers['DATA_INICIO'])||
            isset($markers['CONTRATO_DATA_INICIO']);

        $endRequired=$durationRequired||
            isset($markers['DATA_FIM'])||
            isset($markers['CONTRATO_DATA_FIM']);

        $start=$data['data_inicio']??null;
        $end=$data['data_fim']??null;

        $errors=[];

        if($startRequired&&blank($start)){
            $errors['data_inicio']=
                'A data de início é obrigatória neste documento.';
        }

        if($endRequired&&blank($end)){
            $errors['data_fim']=
                'A data de fim é obrigatória neste documento.';
        }

        if($errors!==[]){
            throw ValidationException::withMessages($errors);
        }

        if(filled($start)&&filled($end)){
            try{
                $first=Carbon::parse($start)->startOfDay();
                $last=Carbon::parse($end)->startOfDay();
            }catch(\Throwable $error){
                throw ValidationException::withMessages([
                    'data_inicio'=>
                        'Informe datas válidas para o contrato.',
                ]);
            }

            if($last->lt($first)){
                throw ValidationException::withMessages([
                    'data_fim'=>
                        'A data de fim não pode ser anterior à data de início.',
                ]);
            }

            if($durationRequired&&$last->equalTo($first)){
                throw ValidationException::withMessages([
                    'data_fim'=>
                        'A duração do contrato deve ser superior a zero dias.',
                ]);
            }
        }
    }
}
