<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConteudoCategoriaRequest;
use App\Http\Requests\StoreConteudoPostRequest;
use App\Http\Requests\UpdateConteudoPostRequest;
use App\Models\AnalyticsEvento;
use App\Models\ConteudoCategoria;
use App\Models\ConteudoPost;
use App\Services\ConteudoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BackofficeConteudoController extends Controller
{
    public function summary(): JsonResponse
    {
        $views=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_view'
                );

        $reads=
            AnalyticsEvento::query()
                ->where(
                    'evento',
                    'article_read'
                );

        $views30=
            (clone $views)
                ->where(
                    'ocorrido_em',
                    '>=',
                    now()
                        ->subDays(29)
                        ->startOfDay()
                )
                ->count();

        $reads30=
            (clone $reads)
                ->where(
                    'ocorrido_em',
                    '>=',
                    now()
                        ->subDays(29)
                        ->startOfDay()
                )
                ->count();

        $top=
            ConteudoPost::query()
                ->with([
                    'categorias:id,nome,slug',
                ])
                ->withCount([
                    'analyticsEventos as views_count'=>
                        fn($query)=>
                            $query->where(
                                'evento',
                                'article_view'
                            ),
                ])
                ->orderByDesc(
                    'views_count'
                )
                ->first();

        return response()->json([
            'data'=>[
                'total'=>
                    ConteudoPost::query()
                        ->count(),

                'publicados'=>
                    ConteudoPost::query()
                        ->where(
                            'status',
                            'publicado'
                        )
                        ->count(),

                'rascunhos'=>
                    ConteudoPost::query()
                        ->where(
                            'status',
                            'rascunho'
                        )
                        ->count(),

                'agendados'=>
                    ConteudoPost::query()
                        ->where(
                            'status',
                            'agendado'
                        )
                        ->count(),

                'views_total'=>
                    (clone $views)
                        ->count(),

                'reads_total'=>
                    (clone $reads)
                        ->count(),

                'views_30d'=>$views30,

                'reads_30d'=>$reads30,

                'read_rate_30d'=>
                    $views30>0
                        ? round(
                            ($reads30/$views30)*100,
                            1
                        )
                        : 0,

                'top_post'=>$top,
            ],
        ]);
    }

    public function index(
        Request $request
    ): JsonResponse {
        $query=
            ConteudoPost::query()
                ->with([
                    'categoria:id,nome,slug',

                    'categorias:id,nome,slug',

                    'tags:id,nome,slug',

                    'autor:id,name',
                ])
                ->withCount([
                    'analyticsEventos as views_count'=>
                        fn($query)=>
                            $query->where(
                                'evento',
                                'article_view'
                            ),

                    'analyticsEventos as reads_count'=>
                        fn($query)=>
                            $query->where(
                                'evento',
                                'article_read'
                            ),
                ])
                ->addSelect([
                    'last_view_at'=>
                        AnalyticsEvento::query()
                            ->select(
                                'ocorrido_em'
                            )
                            ->whereColumn(
                                'content_post_id',
                                'conteudo_posts.id'
                            )
                            ->where(
                                'evento',
                                'article_view'
                            )
                            ->latest(
                                'ocorrido_em'
                            )
                            ->limit(
                                1
                            ),
                ]);

        if(
            $request->filled(
                'tipo'
            )
        ){
            $query->where(
                'tipo',
                $request->string(
                    'tipo'
                )
            );
        }

        if(
            $request->filled(
                'status'
            )
        ){
            $query->where(
                'status',
                $request->string(
                    'status'
                )
            );
        }

        if(
            $request->filled(
                'categoria_id'
            )
        ){
            $categoryId=
                (string)$request
                    ->string(
                        'categoria_id'
                    );

            $query->whereHas(
                'categorias',
                fn($query)=>
                    $query->whereKey(
                        $categoryId
                    )
            );
        }

        if(
            $request->filled(
                'q'
            )
        ){
            $term=
                '%'
                .$request
                    ->string(
                        'q'
                    )
                    ->trim()
                .'%';

            $query->where(
                function($query) use($term){
                    $query
                        ->where(
                            'titulo',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'resumo',
                            'like',
                            $term
                        )
                        ->orWhereHas(
                            'tags',
                            fn($query)=>
                                $query->where(
                                    'nome',
                                    'like',
                                    $term
                                )
                        )
                        ->orWhereHas(
                            'categorias',
                            fn($query)=>
                                $query->where(
                                    'nome',
                                    'like',
                                    $term
                                )
                        );
                }
            );
        }

        return response()->json(
            $query
                ->latest(
                    'updated_at'
                )
                ->paginate(
                    25
                )
                ->withQueryString()
        );
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>$this->post(
                $id
            ),
        ]);
    }

    public function store(
        StoreConteudoPostRequest $request,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Conteúdo criado com sucesso.',

            'data'=>
                $service->create(
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
            'message'=>
                'Conteúdo atualizado com sucesso.',

            'data'=>
                $service->update(
                    $this->post(
                        $id
                    ),
                    $request->validated()
                ),
        ]);
    }

    public function publish(
        string $id,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Conteúdo publicado com sucesso.',

            'data'=>
                $service->publish(
                    $this->post(
                        $id
                    )
                ),
        ]);
    }

    public function archive(
        string $id,
        ConteudoService $service
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Conteúdo arquivado com sucesso.',

            'data'=>
                $service->archive(
                    $this->post(
                        $id
                    )
                ),
        ]);
    }

    public function uploadImage(
        Request $request
    ): JsonResponse {
        $validated=
            $request->validate([
                'tipo'=>[
                    'required',

                    Rule::in([
                        'capa',
                        'destaque',
                        'editor',
                    ]),
                ],

                'image'=>[
                    'required',
                    'image',
                    'mimes:jpg,jpeg,png,webp',
                    'max:10240',
                ],
            ]);

        $tipo=
            $validated['tipo'];

        $path=
            $request
                ->file(
                    'image'
                )
                ->store(
                    'conteudo/'.$tipo,
                    'public'
                );

        return response()->json([
            'message'=>
                'Imagem carregada com sucesso.',

            'data'=>[
                'tipo'=>$tipo,

                'path'=>$path,

                'url'=>
                    url(
                        Storage::disk(
                            'public'
                        )->url(
                            $path
                        )
                    ),
            ],
        ],201);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data'=>
                ConteudoCategoria::query()
                    ->withCount([
                        'conteudos as posts_count',
                    ])
                    ->orderBy(
                        'ordem'
                    )
                    ->orderBy(
                        'nome'
                    )
                    ->get(),
        ]);
    }

    public function storeCategory(
        StoreConteudoCategoriaRequest $request
    ): JsonResponse {
        $data=
            $request->validated();

        $data['slug']=
            Str::slug(
                $data['slug']
                ?? $data['nome']
            );

        $category=
            ConteudoCategoria::create(
                $data
            );

        return response()->json([
            'message'=>
                'Categoria criada com sucesso.',

            'data'=>$category,
        ],201);
    }

    private function post(
        string $id
    ): ConteudoPost {
        return ConteudoPost::query()
            ->with([
                'categoria:id,nome,slug',

                'categorias:id,nome,slug',

                'tags:id,nome,slug',

                'autor:id,name',
            ])
            ->withCount([
                'analyticsEventos as views_count'=>
                    fn($query)=>
                        $query->where(
                            'evento',
                            'article_view'
                        ),

                'analyticsEventos as reads_count'=>
                    fn($query)=>
                        $query->where(
                            'evento',
                            'article_read'
                        ),
            ])
            ->addSelect([
                'last_view_at'=>
                    AnalyticsEvento::query()
                        ->select(
                            'ocorrido_em'
                        )
                        ->whereColumn(
                            'content_post_id',
                            'conteudo_posts.id'
                        )
                        ->where(
                            'evento',
                            'article_view'
                        )
                        ->latest(
                            'ocorrido_em'
                        )
                        ->limit(
                            1
                        ),
            ])
            ->findOrFail(
                $id
            );
    }
}