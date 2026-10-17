<?php

namespace App\Services;

use App\Models\ConteudoBusca;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConteudoBuscaService
{
    public function clean(
        string $term
    ): string {
        return Str::of($term)
            ->squish()
            ->limit(150,'')
            ->toString();
    }

    public function normalize(
        string $term
    ): string {
        return Str::lower(
            Str::ascii(
                $this->clean($term)
            )
        );
    }

    public function register(
        string $term,
        int $resultCount
    ): ?ConteudoBusca {
        $term=
            $this->clean(
                $term
            );

        if(
            mb_strlen($term)<2
        ){
            return null;
        }

        $normalized=
            $this->normalize(
                $term
            );

        return DB::transaction(
            function() use(
                $term,
                $normalized,
                $resultCount
            ){
                $search=
                    ConteudoBusca::query()
                        ->where(
                            'termo_normalizado',
                            $normalized
                        )
                        ->lockForUpdate()
                        ->first();

                if(!$search){
                    return ConteudoBusca::create([
                        'termo'=>$term,

                        'termo_normalizado'=>
                            $normalized,

                        'total_buscas'=>1,

                        'buscas_sem_resultado'=>
                            $resultCount===0
                                ? 1
                                : 0,

                        'ultimo_resultado_count'=>
                            $resultCount,

                        'primeira_busca_em'=>
                            now(),

                        'ultima_busca_em'=>
                            now(),
                    ]);
                }

                $search->termo=
                    $term;

                $search->total_buscas++;

                if(
                    $resultCount===0
                ){
                    $search->buscas_sem_resultado++;
                }

                $search->ultimo_resultado_count=
                    $resultCount;

                $search->ultima_busca_em=
                    now();

                $search->save();

                return $search;
            }
        );
    }
}