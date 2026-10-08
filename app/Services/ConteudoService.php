<?php

namespace App\Services;

use App\Models\ConteudoPost;
use App\Models\ConteudoTag;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConteudoService
{
    public function create(
        array $data,
        User $actor
    ): ConteudoPost {
        return DB::transaction(function() use($data,$actor){
            $tags=$data['tags']??[];
            unset($data['tags']);

            $data['slug']=$this->uniqueSlug(
                $data['slug']??$data['titulo']
            );

            $post=new ConteudoPost($data);
            $post->autor_id=$actor->id;

            if(
                $post->status==='publicado' &&
                !$post->publicado_em
            ){
                $post->publicado_em=now();
            }

            $post->save();

            $this->syncTags($post,$tags);

            return $this->load($post);
        });
    }

    public function update(
        ConteudoPost $post,
        array $data
    ): ConteudoPost {
        return DB::transaction(function() use($post,$data){
            $tags=$data['tags']??null;
            unset($data['tags']);

            if(array_key_exists('slug',$data) || array_key_exists('titulo',$data)){
                $data['slug']=$this->uniqueSlug(
                    $data['slug']??$data['titulo']??$post->titulo,
                    $post->id
                );
            }

            $post->fill($data);

            if(
                $post->status==='publicado' &&
                !$post->publicado_em
            ){
                $post->publicado_em=now();
            }

            $post->save();

            if($tags!==null){
                $this->syncTags($post,$tags);
            }

            return $this->load($post);
        });
    }

    public function publish(ConteudoPost $post): ConteudoPost
    {
        $post->status='publicado';
        $post->publicado_em=$post->publicado_em??now();
        $post->save();

        return $this->load($post);
    }

    public function archive(ConteudoPost $post): ConteudoPost
    {
        $post->status='arquivado';
        $post->save();

        return $this->load($post);
    }

    private function syncTags(
        ConteudoPost $post,
        array $tags
    ): void {
        $ids=collect($tags)
            ->map(fn($name)=>trim((string)$name))
            ->filter()
            ->unique(fn($name)=>mb_strtolower($name))
            ->map(function($name){
                $slug=Str::slug($name);

                return ConteudoTag::query()->firstOrCreate(
                    ['slug'=>$slug],
                    ['nome'=>$name]
                )->id;
            })
            ->values()
            ->all();

        $post->tags()->sync($ids);
    }

    private function uniqueSlug(
        string $value,
        ?string $ignoreId=null
    ): string {
        $base=Str::slug($value)?:Str::lower(Str::random(10));
        $slug=$base;
        $counter=2;

        while(
            ConteudoPost::query()
                ->where('slug',$slug)
                ->when(
                    $ignoreId,
                    fn($query)=>$query->whereKeyNot($ignoreId)
                )
                ->exists()
        ){
            $slug=$base.'-'.$counter++;
        }

        return $slug;
    }

    private function load(ConteudoPost $post): ConteudoPost
    {
        return $post->load([
            'categoria:id,nome,slug',
            'tags:id,nome,slug',
            'autor:id,name',
        ]);
    }
}
