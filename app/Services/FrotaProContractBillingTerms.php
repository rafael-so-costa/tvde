<?php
declare(strict_types=1);

namespace App\Services;

use Illuminate\Validation\ValidationException;

final class FrotaProContractBillingTerms
{
    public const MODALIDADES=[
        'fixa'=>'Fixa',
        'variavel'=>'Variável',
        'mista'=>'Mista',
    ];

    public const PERIODICIDADES=[
        'diario'=>'Diário',
        'semanal'=>'Semanal',
        'quinzenal'=>'Quinzenal',
        'mensal'=>'Mensal',
        'bimestral'=>'Bimestral',
        'trimestral'=>'Trimestral',
        'semestral'=>'Semestral',
        'anual'=>'Anual',
    ];

    public function normalize(array $fields):array
    {
        $tipo=strtolower(trim(
            (string)($fields['TIPO_COBRANCA']??'')
        ));

        if(!array_key_exists($tipo,self::MODALIDADES)){
            $this->error(
                'TIPO_COBRANCA',
                'Selecione uma modalidade de cobrança válida.'
            );
        }

        $periodo=strtolower(trim(
            (string)($fields['PERIODICIDADE_PAGAMENTO']??'')
        ));

        if(!array_key_exists($periodo,self::PERIODICIDADES)){
            $this->error(
                'PERIODICIDADE_PAGAMENTO',
                'Selecione uma periodicidade de pagamento válida.'
            );
        }

        $fields['TIPO_COBRANCA']=$tipo;
        $fields['PERIODICIDADE_PAGAMENTO']=$periodo;

        if(in_array($tipo,['fixa','mista'],true)){
            $fields['VALOR_FIXO_COBRANCA']=$this->decimal(
                $fields['VALOR_FIXO_COBRANCA']??null,
                'VALOR_FIXO_COBRANCA',
                999999999.99,
                'Informe um valor fixo superior a zero.'
            );
        }else{
            unset($fields['VALOR_FIXO_COBRANCA']);
        }

        if(in_array($tipo,['variavel','mista'],true)){
            $fields['PERCENTAGEM_COBRANCA']=$this->decimal(
                $fields['PERCENTAGEM_COBRANCA']??null,
                'PERCENTAGEM_COBRANCA',
                100,
                'Informe uma percentagem superior a zero e até 100%.'
            );

            $base=trim(
                (string)($fields['BASE_CALCULO_COBRANCA']??'')
            );

            if(
                $base==='' ||
                mb_strlen($base)>160 ||
                preg_match('/[\r\n<>]/u',$base)
            ){
                $this->error(
                    'BASE_CALCULO_COBRANCA',
                    'Informe a base de cálculo, até 160 caracteres, sem HTML ou quebras de linha.'
                );
            }

            $fields['BASE_CALCULO_COBRANCA']=$base;
        }else{
            unset(
                $fields['PERCENTAGEM_COBRANCA'],
                $fields['BASE_CALCULO_COBRANCA']
            );
        }

        return $fields;
    }

    public function description(array $fields):string
    {
        $fields=$this->normalize($fields);
        $tipo=$fields['TIPO_COBRANCA'];

        $fixo=isset($fields['VALOR_FIXO_COBRANCA'])
            ?number_format(
                (float)$fields['VALOR_FIXO_COBRANCA'],
                2,',','.'
            ).' €'
            :'';

        $percentagem=isset($fields['PERCENTAGEM_COBRANCA'])
            ?rtrim(
                rtrim(
                    number_format(
                        (float)$fields['PERCENTAGEM_COBRANCA'],
                        2,',',''
                    ),
                    '0'
                ),
                ','
            ).'%'
            :'';

        $base=$fields['BASE_CALCULO_COBRANCA']??'';

        return match($tipo){
            'fixa'=>
                'uma quantia fixa de '.$fixo,

            'variavel'=>
                'uma percentagem de '.$percentagem.
                ' sobre '.$base,

            'mista'=>
                'uma quantia fixa de '.$fixo.
                ' acrescida de '.$percentagem.
                ' sobre '.$base,
        };
    }

    public function periodicityLabel(array $fields):string
    {
        $fields=$this->normalize($fields);

        return mb_strtolower(
            self::PERIODICIDADES[
                $fields['PERIODICIDADE_PAGAMENTO']
            ],
            'UTF-8'
        );
    }

    private function decimal(
        mixed $value,
        string $field,
        float $maximum,
        string $message
    ):string{
        if(!is_scalar($value)){
            $this->error($field,$message);
        }

        $raw=trim((string)$value);

        if(!preg_match(
            '/^\d{1,9}(?:[.,]\d{1,2})?$/D',
            $raw
        )){
            $this->error($field,$message);
        }

        $number=(float)str_replace(',','.',$raw);

        if($number<=0 || $number>$maximum){
            $this->error($field,$message);
        }

        return number_format($number,2,'.','');
    }

    private function error(
        string $field,
        string $message
    ):never{
        throw ValidationException::withMessages([
            'campos_preenchidos.'.$field=>$message,
        ]);
    }
}
