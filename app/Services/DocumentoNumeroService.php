<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class DocumentoNumeroService
{
    public const ORIGEM_GERADO='gerado';
    public const ORIGEM_ANEXADO='anexado';

    public function next(string $origem): array
    {
        if(!in_array($origem,[self::ORIGEM_GERADO,self::ORIGEM_ANEXADO],true)){
            throw new InvalidArgumentException('Origem documental inválida.');
        }

        return DB::transaction(function() use($origem){
            $sequence=DB::table('document_sequences')
                ->where('chave','documentos')
                ->lockForUpdate()
                ->first();

            if(!$sequence){
                DB::table('document_sequences')->insert([
                    'chave'=>'documentos',
                    'ultimo_numero'=>0,
                    'created_at'=>now(),
                    'updated_at'=>now(),
                ]);

                $sequence=DB::table('document_sequences')
                    ->where('chave','documentos')
                    ->lockForUpdate()
                    ->first();
            }

            if(!$sequence){
                throw new RuntimeException('Não foi possível inicializar a sequência documental.');
            }

            $numero=(int)$sequence->ultimo_numero+1;

            DB::table('document_sequences')
                ->where('chave','documentos')
                ->update([
                    'ultimo_numero'=>$numero,
                    'updated_at'=>now(),
                ]);

            $prefixo=$origem===self::ORIGEM_ANEXADO?'A':'G';

            return [
                'numero_global'=>$numero,
                'codigo'=>$prefixo.str_pad((string)$numero,6,'0',STR_PAD_LEFT),
            ];
        });
    }
}
