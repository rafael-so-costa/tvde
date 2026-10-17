<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Models\ConteudoBusca;
use App\Services\ConteudoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BackofficeConteudoBuscaController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $days=max(
            7,
            min(
                365,
                (int)$request->query(
                    'dias',
                    90
                )
            )
        );

        $from=
            now()
                ->subDays(
                    $days-1
                )
                ->startOfDay();

        $base=
            ConteudoBusca::query()
                ->with([
                    'pauta:id,titulo,slug,status',
                ])
                ->where(
                    'ultima_busca_em',
                    '>=',
                    $from
                );

        $top=
            (clone $base)
                ->orderByDesc(
                    'total_buscas'
                )
                ->orderByDesc(
                    'ultima_busca_em'
                )
                ->limit(
                    100
                )
                ->get();

        /*
         * Mantemos na lista uma pesquisa sem
         * resultados mesmo depois de criar a
         * pauta.
         *
         * Assim o Super Admin consegue ver que
         * existe procura pública, mas o artigo
         * ainda está em produção.
         *
         * Quando o artigo for publicado e uma
         * nova pesquisa encontrar resultados,
         * deixa naturalmente de ser uma lacuna.
         */
        $gaps=
            (clone $base)
                ->where(
                    'ultimo_resultado_count',
                    0
                )
                ->orderByRaw(
                    'conteudo_post_id IS NULL DESC'
                )
                ->orderByDesc(
                    'total_buscas'
                )
                ->orderByDesc(
                    'ultima_busca_em'
                )
                ->limit(
                    50
                )
                ->get();

        return response()->json([
            'periodo_dias'=>$days,

            'total_termos'=>
                (clone $base)
                    ->count(),

            'total_buscas'=>
                (int)(
                    (clone $base)
                        ->sum(
                            'total_buscas'
                        )
                ),

            'top'=>$top,

            'lacunas_conteudo'=>$gaps,
        ]);
    }

    public function createDraft(
        Request $request,
        string $id,
        ConteudoService $service
    ): JsonResponse {
        $result=
            DB::transaction(
                function() use(
                    $request,
                    $id,
                    $service
                ): array {
                    $search=
                        ConteudoBusca::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $id
                            );

                    /*
                     * Operação idempotente.
                     * Se a pauta já existe,
                     * devolvemos a mesma.
                     */
                    if(
                        $search->conteudo_post_id
                    ){
                        $existing=
                            $search
                                ->pauta()
                                ->first();

                        if(
                            $existing
                        ){
                            return [
                                'created'=>false,
                                'post'=>$existing,
                            ];
                        }

                        /*
                         * FK com nullOnDelete normalmente
                         * já limpa este campo, mas mantemos
                         * esta proteção adicional.
                         */
                        $search->forceFill([
                            'conteudo_post_id'=>null,
                            'pauta_criada_em'=>null,
                        ])->save();
                    }

                    $actor=
                        $request->user();

                    abort_unless(
                        $actor,
                        401
                    );

                    /*
                     * Criamos somente um rascunho mínimo.
                     * Slug, autor e restantes regras
                     * continuam centralizados no
                     * ConteudoService.
                     */
                    $post=
                        $service->create(
                            [
                                'tipo'=>'artigo',

                                'titulo'=>
                                    $search->termo,

                                'conteudo'=>
                                    '<p></p>',

                                'status'=>
                                    'rascunho',

                                'robots'=>
                                    'index,follow',
                            ],
                            $actor
                        );

                    $search->forceFill([
                        'conteudo_post_id'=>
                            $post->id,

                        'pauta_criada_em'=>
                            now(),
                    ])->save();

                    return [
                        'created'=>true,
                        'post'=>$post,
                    ];
                }
            );

        return response()->json(
            [
                'message'=>
                    $result['created']
                        ? 'Pauta criada com sucesso.'
                        : 'Esta pesquisa já possui uma pauta.',

                'created'=>
                    $result['created'],

                'data'=>
                    $result['post'],
            ],
            $result['created']
                ? 201
                : 200
        );
    }
}