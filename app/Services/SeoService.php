<?php

namespace App\Services;

use App\Models\SeoConfiguracao;
use App\Models\User;

class SeoService
{
    public function resolve(
        string $chave,
        array $override=[]
    ): array {
        $global=SeoConfiguracao::query()
            ->where('chave','global')
            ->first();

        $page=SeoConfiguracao::query()
            ->where('chave',$chave)
            ->first();

        $base=[
            'titulo'=>'FrotaPRO — Gestão completa para operadores TVDE',
            'descricao'=>'Centralize a gestão da sua operação TVDE no FrotaPRO.',
            'canonical_url'=>null,
            'robots'=>'index,follow',
            'og_title'=>null,
            'og_description'=>null,
            'og_image_path'=>null,
            'twitter_card'=>'summary_large_image',
            'schema_type'=>null,
            'configuracao'=>[],
        ];

        foreach([$global,$page] as $config){
            if(!$config){
                continue;
            }

            foreach(array_keys($base) as $field){
                $value=$config->{$field};

                if($value!==null && $value!==''){
                    $base[$field]=$value;
                }
            }
        }

        foreach($override as $field=>$value){
            if($value!==null && $value!==''){
                $base[$field]=$value;
            }
        }

        $base['og_title']=$base['og_title']?:$base['titulo'];
        $base['og_description']=$base['og_description']?:$base['descricao'];

        return $base;
    }

    public function upsert(
        string $chave,
        array $data,
        User $actor
    ): SeoConfiguracao {
        $config=SeoConfiguracao::query()->firstOrNew(['chave'=>$chave]);
        $config->fill($data);
        $config->updated_by=$actor->id;
        $config->save();

        return $config->fresh();
    }
}
