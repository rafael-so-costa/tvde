<?php

namespace App\Services;

use App\Models\SeoConfiguracao;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeoService
{
    public function presets(): array
    {
        return [
            'global'=>[
                'label'=>'Configuração global',
                'description'=>'Valores utilizados como padrão em todo o website.',
                'defaults'=>$this->defaultsFor('global'),
            ],

            'home'=>[
                'label'=>'Página inicial',
                'description'=>'Landing page principal do FrotaPRO.',
                'defaults'=>$this->defaultsFor('home'),
            ],

            'anuncios'=>[
                'label'=>'Anúncios',
                'description'=>'Marketplace público FrotaPRO Ads.',
                'defaults'=>$this->defaultsFor('anuncios'),
            ],

            'blog'=>[
                'label'=>'Blog',
                'description'=>'Página principal de conteúdos.',
                'defaults'=>$this->defaultsFor('blog'),
            ],

            'blog_artigo'=>[
                'label'=>'Artigos do Blog',
                'description'=>'Configuração base dos artigos individuais.',
                'defaults'=>$this->defaultsFor('blog_artigo'),
            ],
        ];
    }

    public function defaultsFor(
        string $chave
    ): array {
        $global=[
            'titulo'=>'FrotaPRO — Gestão completa para operadores TVDE',

            'descricao'=>
                'Centralize motoristas, veículos, contratos, documentação e operação da sua frota TVDE no FrotaPRO.',

            'canonical_url'=>null,

            'robots'=>'index,follow',

            'og_title'=>null,

            'og_description'=>null,

            'og_image_path'=>null,

            'favicon_path'=>null,

            'social_image_path'=>null,

            'twitter_card'=>'summary_large_image',

            'schema_type'=>'WebSite',

            'configuracao'=>[],
        ];

        $pages=[
            'home'=>[
                'titulo'=>'FrotaPRO — Gestão completa da sua frota TVDE',

                'descricao'=>
                    'Motoristas, veículos, contratos, alugueres, documentação, manutenção e operação da sua frota TVDE numa única plataforma.',

                'schema_type'=>'WebPage',
            ],

            'anuncios'=>[
                'titulo'=>'FrotaPRO Ads — Serviços e soluções para o ecossistema TVDE',

                'descricao'=>
                    'Encontre serviços, fornecedores, soluções e oportunidades para empresas, gestores, motoristas e proprietários TVDE.',

                'schema_type'=>'CollectionPage',
            ],

            'blog'=>[
                'titulo'=>'Blog FrotaPRO — Gestão, operação e mercado TVDE',

                'descricao'=>
                    'Artigos, notícias, análises e conteúdos práticos sobre gestão de frotas, motoristas, veículos e operação TVDE.',

                'schema_type'=>'Blog',
            ],

            'blog_artigo'=>[
                'titulo'=>'Blog FrotaPRO',

                'descricao'=>
                    'Conteúdo especializado para gestores e profissionais do ecossistema TVDE.',

                'schema_type'=>'BlogPosting',
            ],
        ];

        return array_replace(
            $global,
            $pages[$chave]??[]
        );
    }

    public function resolve(
        string $chave,
        array $override=[]
    ): array {
        $base=
            $this->defaultsFor(
                $chave
            );

        $global=null;
        $page=null;

        /*
         * Algumas páginas públicas também são utilizadas por testes
         * simples que não executam migrations. Nessa situação o SEO
         * deve continuar a funcionar com os valores padrão.
         */
        if(
            Schema::hasTable(
                'seo_configuracoes'
            )
        ){
            $global=
                SeoConfiguracao::query()
                    ->where(
                        'chave',
                        'global'
                    )
                    ->first();

            $page=
                $chave==='global'
                    ? null
                    : SeoConfiguracao::query()
                        ->where(
                            'chave',
                            $chave
                        )
                        ->first();
        }

        $fields=[
            'titulo',
            'descricao',
            'canonical_url',
            'robots',
            'og_title',
            'og_description',
            'og_image_path',
            'favicon_path',
            'social_image_path',
            'twitter_card',
            'schema_type',
            'configuracao',
        ];

        foreach(
            [$global,$page]
            as $config
        ){
            if(!$config){
                continue;
            }

            foreach(
                $fields
                as $field
            ){
                $value=
                    $config->{$field};

                if(
                    $value!==null &&
                    $value!==''
                ){
                    $base[$field]=
                        $value;
                }
            }
        }

        foreach(
            $override
            as $field=>$value
        ){
            if(
                $value!==null &&
                $value!==''
            ){
                $base[$field]=
                    $value;
            }
        }

        $base['og_title']=
            $base['og_title']
            ?: $base['titulo'];

        $base['og_description']=
            $base['og_description']
            ?: $base['descricao'];

        /*
         * Imagem padrão para todas as redes sociais.
         */
        $base['og_image_path']=
            $base['og_image_path']
            ?: $base['social_image_path'];

        $base['favicon_url']=
            $this->assetUrl(
                $base['favicon_path']
            );

        $base['social_image_url']=
            $this->assetUrl(
                $base['social_image_path']
            );

        $base['og_image_url']=
            $this->assetUrl(
                $base['og_image_path']
            );

        return $base;
    }

    public function upsert(
        string $chave,
        array $data,
        User $actor
    ): SeoConfiguracao {
        $config=
            SeoConfiguracao::query()
                ->firstOrNew([
                    'chave'=>$chave,
                ]);

        $config->fill(
            $data
        );

        $config->updated_by=
            $actor->id;

        $config->save();

        return $config
            ->fresh();
    }

    public function assetUrl(
        ?string $path
    ): ?string {
        if(!$path){
            return null;
        }

        if(
            Str::startsWith(
                $path,
                [
                    'http://',
                    'https://',
                ]
            )
        ){
            return $path;
        }

        $storageUrl=
            Storage::disk(
                'public'
            )->url(
                $path
            );

        if(
            Str::startsWith(
                $storageUrl,
                [
                    'http://',
                    'https://',
                ]
            )
        ){
            return $storageUrl;
        }

        return url(
            $storageUrl
        );
    }
}