<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Str;

final class FrotaProDocumentSemanticValidator
{
    public function invalid(array $matches,array $values): array
    {
        $invalid=[];

        foreach($matches as $match){
            $token='';

            for($i=1;$i<=4;$i++){
                $candidate=trim((string)($match[$i]??''));

                if($candidate!==''){
                    $token=$candidate;
                    break;
                }
            }

            $key=$this->normalize($token);

            if(
                $key==='' ||
                !array_key_exists($key,$values)
            ){
                continue;
            }

            $value=$this->entryValue($values[$key]);

            if($value===''){
                continue;
            }

            $reason=$this->reason($key,$value,$values);

            if($reason!==null){
                $invalid[$key]=$reason;
            }
        }

        ksort($invalid,SORT_STRING);

        return $invalid;
    }

    private function reason(
        string $key,
        string $value,
        array $values
    ): ?string {
        if(in_array($key,[
            'EMPRESA_NIF',
            'MOTORISTA_NIF',
            'PROPRIETARIO_NIF',
        ],true)){
            return $this->validNif($value)
                ? null
                : 'NIF português inválido ou com dígito de controlo incorreto';
        }

        if(
            in_array($key,['DATA_INICIO','DATA_FIM'],true) ||
            str_ends_with($key,'_VALID_UNTIL')
        ){
            $date=$this->parseDate($value);

            if($date===null){
                return 'data inválida; utilize DD/MM/AAAA';
            }

            if($key==='DATA_FIM'){
                $start=$this->parseDate(
                    $this->entryValue(
                        $values['DATA_INICIO']??null
                    )
                );

                if($start!==null && $date<$start){
                    return 'a data de fim é anterior à data de início';
                }
            }

            if(str_ends_with($key,'_VALID_UNTIL')){
                $reference=$this->parseDate(
                    $this->entryValue(
                        $values['DATA_INICIO']??null
                    )
                );

                if($reference===null){
                    $reference=new DateTimeImmutable(
                        'today',
                        new DateTimeZone(
                            (string)config('app.timezone','Europe/Lisbon')
                        )
                    );
                }

                if($date<$reference){
                    return 'documento expirado na data de referência do contrato';
                }
            }

            return null;
        }

        if($key==='PERCENTAGEM_CONTRATO'){
            if(!preg_match(
                '/^([0-9]{1,3})(?:[,.]([0-9]{1,2}))?\s*%$/u',
                $value,
                $parts
            )){
                return 'percentagem inválida; indique um valor entre 0% e 100%';
            }

            $number=(float)(
                $parts[1].'.'.($parts[2]??'0')
            );

            return $number<=100
                ? null
                : 'a percentagem não pode ultrapassar 100%';
        }

        if(str_ends_with($key,'CAPITAL_SOCIAL')){
            if(!preg_match(
                '/^(?:[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)(?:,[0-9]{1,2})?\s*€?$/u',
                $value
            )){
                return 'capital social inválido ou negativo';
            }
        }

        return null;
    }

    private function validNif(string $value): bool
    {
        if(!preg_match('/^[1-9][0-9]{8}$/D',$value)){
            return false;
        }

        $sum=0;

        for($i=0;$i<8;$i++){
            $sum+=(int)$value[$i]*(9-$i);
        }

        $check=11-($sum%11);

        if($check>=10){
            $check=0;
        }

        return (int)$value[8]===$check;
    }

    private function parseDate(string $value): ?DateTimeImmutable
    {
        foreach([
            '!d/m/Y'=>'d/m/Y',
            '!Y-m-d'=>'Y-m-d',
        ] as $format=>$output){
            $date=DateTimeImmutable::createFromFormat(
                $format,
                $value
            );

            $errors=DateTimeImmutable::getLastErrors();

            if(
                $date!==false &&
                (
                    $errors===false ||
                    (
                        $errors['warning_count']===0 &&
                        $errors['error_count']===0
                    )
                ) &&
                $date->format($output)===$value
            ){
                return $date;
            }
        }

        return null;
    }

    private function entryValue(mixed $entry): string
    {
        if(is_array($entry)){
            $entry=$entry['value']??null;
        }

        return is_scalar($entry)
            ? trim((string)$entry)
            : '';
    }

    private function normalize(string $name): string
    {
        return trim(
            preg_replace(
                '/[^A-Z0-9]+/u',
                '_',
                mb_strtoupper(Str::ascii($name),'UTF-8')
            )??'',
            '_'
        );
    }
}
