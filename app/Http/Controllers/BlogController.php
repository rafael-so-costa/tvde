<?php

namespace App\Http\Controllers;

use App\Models\ConteudoCategoria;
use App\Models\ConteudoPost;
use App\Services\SeoService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BlogController extends Controller
{
    public function index(
        Request $request,
        SeoService $seoService
    ): Response {
        $category=trim((string)$request->query('categoria',''));

        $posts=ConteudoPost::query()
            ->publicados()
            ->with([
                'categoria:id,nome,slug',
                'autor:id,name',
            ])
            ->when(
                $category!=='',
                fn($query)=>$query->whereHas(
                    'categoria',
                    fn($query)=>$query->where('slug',$category)
                )
            )
            ->latest('publicado_em')
            ->paginate(12)
            ->withQueryString();

        $categories=ConteudoCategoria::query()
            ->where('ativo',true)
            ->whereHas('posts',fn($query)=>$query->publicados())
            ->withCount([
                'posts'=>fn($query)=>$query->publicados(),
            ])
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get();

        return response()->view('site.blog.index',[
            'posts'=>$posts,
            'categories'=>$categories,
            'selectedCategory'=>$category,
            'seo'=>$seoService->resolve('blog'),
        ]);
    }

    public function show(
        string $slug,
        SeoService $seoService
    ): Response {
        $post=ConteudoPost::query()
            ->publicados()
            ->with([
                'categoria:id,nome,slug',
                'tags:id,nome,slug',
                'autor:id,name',
            ])
            ->where('slug',$slug)
            ->firstOrFail();

        return response()->view('site.blog.show',[
            'post'=>$post,
            'seo'=>$seoService->resolve('blog_artigo',[
                'titulo'=>$post->seo_title?:$post->titulo,
                'descricao'=>$post->seo_description?:$post->resumo,
                'canonical_url'=>$post->canonical_url,
                'og_image_path'=>$post->og_image_path?:$post->imagem_destaque_path,
                'robots'=>$post->robots,
                'schema_type'=>'BlogPosting',
            ]),
        ]);
    }
}
