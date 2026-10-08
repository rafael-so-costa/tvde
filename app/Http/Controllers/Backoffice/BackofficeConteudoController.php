<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConteudoCategoriaRequest;
use App\Http\Requests\StoreConteudoPostRequest;
use App\Http\Requests\UpdateConteudoPostRequest;
use App\Models\ConteudoCategoria;
use App\Models\ConteudoPost;
use App\Services\ConteudoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BackofficeConteudoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query=ConteudoPost::query()
            ->with([
                'categoria:id,nome,slug',
                'tags:id,nome,slug',
                'autor:id,name',
            ]);

        if($request->filled('tipo')){
            $query->where('tipo',$request->string('tipo'));
        }

        if($request->filled('status')){
            $query->where('status',$request->string('status'));
        }

        if($request->filled('categoria_id')){
            $query->where('categoria_id',$request->string('categoria_id'));
        }

        if($request->filled('q')){
            $term='%'.$request->string('q')->trim().'%';

            $query->where(function($query) use($term){
                $query
                    ->where('titulo','like',$term)
                    ->orWhere('resumo','like',$term);
            });
        }

        return response()->json(
            $query
                ->latest('created_at')
                ->paginate(25)
                ->withQueryString()
        );
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data'=>$this->post($id),
        ]);
    }

    public function store(
        StoreConteudoPostRequest $request,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>'Conteúdo criado com sucesso.',
            'data'=>$service->create(
                $request->validated(),
                $request->user()
            ),
        ],201);
    }

    public function update(
        UpdateConteudoPostRequest $request,
        string $id,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>'Conteúdo atualizado com sucesso.',
            'data'=>$service->update(
                $this->post($id),
                $request->validated()
            ),
        ]);
    }

    public function publish(
        string $id,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>'Conteúdo publicado com sucesso.',
            'data'=>$service->publish($this->post($id)),
        ]);
    }

    public function archive(
        string $id,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>'Conteúdo arquivado com sucesso.',
            'data'=>$service->archive($this->post($id)),
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data'=>ConteudoCategoria::query()
                ->withCount('posts')
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get(),
        ]);
    }

    public function storeCategory(
        StoreConteudoCategoriaRequest $request
    ): JsonResponse {
        $data=$request->validated();
        $data['slug']=Str::slug($data['slug']??$data['nome']);

        $category=ConteudoCategoria::create($data);

        return response()->json([
            'message'=>'Categoria criada com sucesso.',
            'data'=>$category,
        ],201);
    }

    private function post(string $id): ConteudoPost
    {
        return ConteudoPost::query()
            ->with([
                'categoria:id,nome,slug',
                'tags:id,nome,slug',
                'autor:id,name',
            ])
            ->findOrFail($id);
    }
}
