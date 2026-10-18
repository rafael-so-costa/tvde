<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\DocumentoIndexRequest;
use App\Models\Documento;
use App\Models\DocumentoAcesso;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BackofficeDocumentoController extends Controller
{
    public function summary(): JsonResponse
    {
        $query=Documento::query();

        return response()->json([
            'data'=>[
                'total'=>(clone $query)->count(),
                'gerados'=>(clone $query)->where('origem','gerado')->count(),
                'anexados'=>(clone $query)->where('origem','anexado')->count(),
                'com_arquivo'=>(clone $query)->whereNotNull('arquivo_path')->count(),
                'finalizados'=>(clone $query)->whereNotNull('finalizado_em')->count(),
                'ultimos_30_dias'=>(clone $query)
                    ->where('created_at','>=',now()->subDays(30))
                    ->count(),
                'tenants'=>(clone $query)
                    ->whereNotNull('tenant_id')
                    ->distinct()
                    ->count('tenant_id'),
            ],
        ]);
    }

    public function meta(): JsonResponse
    {
        $group=function(string $field): array {
            return Documento::query()
                ->whereNotNull($field)
                ->where($field,'!=','')
                ->select($field)
                ->selectRaw('COUNT(*) as total')
                ->groupBy($field)
                ->orderBy($field)
                ->get()
                ->map(fn(Documento $documento)=>[
                    'value'=>(string)$documento->getAttribute($field),
                    'label'=>$this->label(
                        (string)$documento->getAttribute($field)
                    ),
                    'total'=>(int)$documento->getAttribute('total'),
                ])
                ->values()
                ->all();
        };

        $tenants=DB::table('documentos as d')
            ->join('tenants as t','t.id','=','d.tenant_id')
            ->select([
                't.id as value',
                't.nome as label',
            ])
            ->selectRaw('COUNT(*) as total')
            ->groupBy(
                't.id',
                't.nome'
            )
            ->orderBy('t.nome')
            ->get()
            ->map(fn($row)=>[
                'value'=>(string)$row->value,
                'label'=>(string)$row->label,
                'total'=>(int)$row->total,
            ])
            ->values()
            ->all();

        return response()->json([
            'data'=>[
                'tenants'=>$tenants,
                'origens'=>$group('origem'),
                'categorias'=>$group('categoria'),
                'tipos'=>$group('tipo'),
                'status'=>$group('status'),
            ],
        ]);
    }

    public function index(
        DocumentoIndexRequest $request
    ): JsonResponse {
        $query=$this->baseQuery();

        $this->filters(
            $query,
            $request->validated()
        );

        return response()->json(
            $query
                ->orderByDesc('numero_global')
                ->latest('created_at')
                ->paginate(
                    (int)$request->input(
                        'per_page',
                        25
                    )
                )
                ->withQueryString()
        );
    }

    public function show(
        Request $request,
        string $identifier
    ): JsonResponse {
        $documento=$this->find(
            $identifier
        );

        $this->audit(
            $request,
            $documento,
            'visualizar_metadados'
        );

        return response()->json([
            'data'=>$documento,
        ]);
    }

    public function file(
        Request $request,
        string $identifier
    ){
        $documento=$this->find(
            $identifier
        );

        $this->ensureFile(
            $documento
        );

        $this->audit(
            $request,
            $documento,
            'visualizar_arquivo'
        );

        return Storage::disk('local')
            ->response(
                $documento->arquivo_path,
                $documento->arquivo_nome
                    ?:basename(
                        $documento->arquivo_path
                    ),
                [
                    'Content-Disposition'=>'inline',
                ]
            );
    }

    public function download(
        Request $request,
        string $identifier
    ){
        $documento=$this->find(
            $identifier
        );

        $this->ensureFile(
            $documento
        );

        $this->audit(
            $request,
            $documento,
            'download'
        );

        return Storage::disk('local')
            ->download(
                $documento->arquivo_path,
                $documento->arquivo_nome
                    ?:basename(
                        $documento->arquivo_path
                    )
            );
    }

    private function baseQuery(): Builder
    {
        return Documento::query()
            ->with([
                'tenant:id,nome,slug',
                'empresa:id,nome_empresa',
                'motorista:id,nome_completo',
                'proprietario:id,nome_completo,nome_empresa',
                'veiculo:id,matricula,marca,modelo',
                'criador:id,name',
            ]);
    }

    private function filters(
        Builder $query,
        array $filters
    ): void {
        foreach([
            'tenant_id',
            'origem',
            'categoria',
            'tipo',
            'status',
            'empresa_id',
            'motorista_id',
            'proprietario_id',
            'veiculo_id',
        ] as $field){
            if(filled($filters[$field]??null)){
                $query->where(
                    $field,
                    $filters[$field]
                );
            }
        }

        if(filled($filters['codigo']??null)){
            $query->where(
                'codigo',
                mb_strtoupper(
                    trim(
                        $filters['codigo']
                    )
                )
            );
        }

        if(filled($filters['q']??null)){
            $raw=trim(
                $filters['q']
            );

            $term='%'.$raw.'%';

            $query->where(
                function($query) use($raw,$term){
                    $query
                        ->where(
                            'codigo',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'titulo',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'arquivo_nome',
                            'like',
                            $term
                        )
                        ->orWhereHas(
                            'tenant',
                            fn($query)=>$query
                                ->where(
                                    'nome',
                                    'like',
                                    $term
                                )
                                ->orWhere(
                                    'slug',
                                    'like',
                                    $term
                                )
                        )
                        ->orWhereHas(
                            'empresa',
                            fn($query)=>$query
                                ->where(
                                    'nome_empresa',
                                    'like',
                                    $term
                                )
                        )
                        ->orWhereHas(
                            'motorista',
                            fn($query)=>$query
                                ->where(
                                    'nome_completo',
                                    'like',
                                    $term
                                )
                        )
                        ->orWhereHas(
                            'proprietario',
                            fn($query)=>$query
                                ->where(
                                    'nome_completo',
                                    'like',
                                    $term
                                )
                                ->orWhere(
                                    'nome_empresa',
                                    'like',
                                    $term
                                )
                        )
                        ->orWhereHas(
                            'veiculo',
                            fn($query)=>$query
                                ->where(
                                    'matricula',
                                    'like',
                                    $term
                                )
                        );

                    if(ctype_digit($raw)){
                        $query->orWhere(
                            'numero_global',
                            (int)$raw
                        );
                    }
                }
            );
        }

        if(!empty($filters['data_inicio'])){
            $query->whereDate(
                'created_at',
                '>=',
                $filters['data_inicio']
            );
        }

        if(!empty($filters['data_fim'])){
            $query->whereDate(
                'created_at',
                '<=',
                $filters['data_fim']
            );
        }
    }

    private function find(
        string $identifier
    ): Documento {
        $normalized=trim(
            $identifier
        );

        return $this->baseQuery()
            ->where(
                function($query) use($normalized){
                    $query
                        ->whereKey(
                            $normalized
                        )
                        ->orWhere(
                            'codigo',
                            mb_strtoupper(
                                $normalized
                            )
                        );

                    if(ctype_digit($normalized)){
                        $query->orWhere(
                            'numero_global',
                            (int)$normalized
                        );
                    }
                }
            )
            ->firstOrFail();
    }

    private function ensureFile(
        Documento $documento
    ): void {
        if(
            !$documento->arquivo_path ||
            !Storage::disk('local')
                ->exists(
                    $documento->arquivo_path
                )
        ){
            abort(
                404,
                'Arquivo não encontrado.'
            );
        }
    }

    private function audit(
        Request $request,
        Documento $documento,
        string $acao
    ): void {
        DocumentoAcesso::create([
            'documento_id'=>$documento->id,
            'user_id'=>$request->user()?->id,
            'tenant_context_id'=>null,
            'contexto'=>'backoffice',
            'acao'=>$acao,
            'ip_address'=>$request->ip(),
            'user_agent'=>$request->userAgent(),
            'metadados'=>[
                'documento_tenant_id'=>$documento->tenant_id,
            ],
        ]);
    }

    private function label(
        string $value
    ): string {
        $known=[
            'gerado'=>'Gerado',
            'anexado'=>'Anexado',
            'contratos'=>'Contratos',
            'declaracoes'=>'Declarações',
            'checklists'=>'Checklists',
            'motoristas'=>'Motoristas',
            'financeiro'=>'Financeiro',
            'multas'=>'Multas',
            'sinistros'=>'Sinistros',
            'manutencao'=>'Manutenção',
            'ativo'=>'Ativo',
            'rascunho'=>'Rascunho',
            'enviado'=>'Enviado',
            'assinado'=>'Assinado',
            'encerrado'=>'Encerrado',
            'emitida'=>'Emitida',
            'pendente_validacao'=>'Pendente de validação',
            'validado'=>'Validado',
            'rejeitado'=>'Rejeitado',
            'concluido'=>'Concluído',
        ];

        if(isset($known[$value])){
            return $known[$value];
        }

        return mb_convert_case(
            str_replace(
                '_',
                ' ',
                $value
            ),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }
}