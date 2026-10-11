<?php

namespace App\Http\Controllers;

use App\Http\Requests\DocumentoIndexRequest;
use App\Models\Documento;
use App\Models\DocumentoAcesso;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function summary(): JsonResponse
    {
        $query = Documento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            );

        return response()->json([
            'data' => [
                'total' => (clone $query)->count(),

                'gerados' => (clone $query)
                    ->where(
                        'origem',
                        'gerado'
                    )
                    ->count(),

                'anexados' => (clone $query)
                    ->where(
                        'origem',
                        'anexado'
                    )
                    ->count(),

                'com_arquivo' => (clone $query)
                    ->whereNotNull(
                        'arquivo_path'
                    )
                    ->count(),

                'finalizados' => (clone $query)
                    ->whereNotNull(
                        'finalizado_em'
                    )
                    ->count(),

                'ultimos_30_dias' => (clone $query)
                    ->where(
                        'created_at',
                        '>=',
                        now()->subDays(30)
                    )
                    ->count(),
            ],
        ]);
    }

    public function meta(): JsonResponse
    {
        $tenantId = $this->tenantId();

        $group =
            function (
                string $field
            ) use (
                $tenantId
            ): array {
                return Documento::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->whereNotNull(
                        $field
                    )
                    ->where(
                        $field,
                        '!=',
                        ''
                    )
                    ->select(
                        $field
                    )
                    ->selectRaw(
                        'COUNT(*) as total'
                    )
                    ->groupBy(
                        $field
                    )
                    ->orderBy(
                        $field
                    )
                    ->get()
                    ->map(
                        fn (Documento $documento) => [
                            'value' => (string) $documento
                                ->getAttribute(
                                    $field
                                ),

                            'label' => $this->label(
                                (string) $documento
                                    ->getAttribute(
                                        $field
                                    )
                            ),

                            'total' => (int) $documento
                                ->getAttribute(
                                    'total'
                                ),
                        ]
                    )
                    ->values()
                    ->all();
            };

        return response()->json([
            'data' => [
                'origens' => $group(
                    'origem'
                ),

                'categorias' => $group(
                    'categoria'
                ),

                'tipos' => $group(
                    'tipo'
                ),

                'status' => $group(
                    'status'
                ),
            ],
        ]);
    }

    public function index(
        DocumentoIndexRequest $request
    ): JsonResponse {
        $query = $this->baseQuery();

        $this->filters(
            $query,
            $request->validated()
        );

        return response()->json(
            $query
                ->latest(
                    'created_at'
                )
                ->paginate(
                    (int) $request->input(
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
        $documento =
            $this->find(
                $identifier
            );

        $this->audit(
            $request,
            $documento,
            'visualizar_metadados'
        );

        return response()->json([
            'data' => $documento,
        ]);
    }

    public function file(
        Request $request,
        string $identifier
    ) {
        $documento =
            $this->find(
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

        return Storage::disk(
            'local'
        )->response(
            $documento
                ->arquivo_path,
            $documento
                ->arquivo_nome
                ?: basename(
                    $documento
                        ->arquivo_path
                ),
            [
                'Content-Disposition' => 'inline',
            ]
        );
    }

    public function download(
        Request $request,
        string $identifier
    ) {
        $documento =
            $this->find(
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

        return Storage::disk(
            'local'
        )->download(
            $documento
                ->arquivo_path,
            $documento
                ->arquivo_nome
                ?: basename(
                    $documento
                        ->arquivo_path
                )
        );
    }

    private function baseQuery(): Builder
    {
        return Documento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->with([
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
        foreach ([
            'origem',
            'categoria',
            'tipo',
            'status',
            'empresa_id',
            'motorista_id',
            'proprietario_id',
            'veiculo_id',
        ] as $field) {
            if (
                filled(
                    $filters[
                        $field
                    ] ??
                    null
                )
            ) {
                $query->where(
                    $field,
                    $filters[
                        $field
                    ]
                );
            }
        }

        if (
            filled(
                $filters[
                    'codigo'
                ] ??
                null
            )
        ) {
            $query->where(
                'codigo',
                mb_strtoupper(
                    trim(
                        $filters[
                            'codigo'
                        ]
                    )
                )
            );
        }

        if (
            filled(
                $filters[
                    'q'
                ] ??
                null
            )
        ) {
            $term =
                '%'.
                trim(
                    $filters[
                        'q'
                    ]
                ).
                '%';

            $query->where(
                function (
                    $query
                ) use (
                    $term
                ) {
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
                            'motorista',
                            fn ($query) => $query->where(
                                'nome_completo',
                                'like',
                                $term
                            )
                        )
                        ->orWhereHas(
                            'proprietario',
                            fn ($query) => $query
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
                            fn ($query) => $query->where(
                                'matricula',
                                'like',
                                $term
                            )
                        )
                        ->orWhereHas(
                            'empresa',
                            fn ($query) => $query->where(
                                'nome_empresa',
                                'like',
                                $term
                            )
                        );
                }
            );
        }

        if (
            ! empty(
                $filters[
                    'data_inicio'
                ]
            )
        ) {
            $query->whereDate(
                'created_at',
                '>=',
                $filters[
                    'data_inicio'
                ]
            );
        }

        if (
            ! empty(
                $filters[
                    'data_fim'
                ]
            )
        ) {
            $query->whereDate(
                'created_at',
                '<=',
                $filters[
                    'data_fim'
                ]
            );
        }
    }

    private function find(
        string $identifier
    ): Documento {
        return $this->baseQuery()
            ->where(
                function (
                    $query
                ) use (
                    $identifier
                ) {
                    $query
                        ->whereKey(
                            $identifier
                        )
                        ->orWhere(
                            'codigo',
                            mb_strtoupper(
                                trim(
                                    $identifier
                                )
                            )
                        );
                }
            )
            ->firstOrFail();
    }

    private function ensureFile(
        Documento $documento
    ): void {
        if (
            ! $documento
                ->arquivo_path ||
            ! Storage::disk(
                'local'
            )->exists(
                $documento
                    ->arquivo_path
            )
        ) {
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
            'documento_id' => $documento->id,

            'user_id' => $request
                ->user()
                ?->id,

            'tenant_context_id' => $this->tenantId(),

            'contexto' => 'tenant',

            'acao' => $acao,

            'ip_address' => $request->ip(),

            'user_agent' => $request
                ->userAgent(),
        ]);
    }

    private function label(
        string $value
    ): string {
        $known = [
            'gerado' => 'Gerado',
            'anexado' => 'Anexado',
            'contratos' => 'Contratos',
            'declaracoes' => 'Declarações',
            'checklists' => 'Checklists',
            'motoristas' => 'Motoristas',
            'financeiro' => 'Financeiro',
            'multas' => 'Multas',
            'sinistros' => 'Sinistros',
            'manutencao' => 'Manutenção',
            'ativo' => 'Ativo',
            'rascunho' => 'Rascunho',
            'enviado' => 'Enviado',
            'assinado' => 'Assinado',
            'encerrado' => 'Encerrado',
            'emitida' => 'Emitida',
            'pendente_validacao' => 'Pendente de validação',
            'validado' => 'Validado',
            'rejeitado' => 'Rejeitado',
            'concluido' => 'Concluído',
        ];

        if (
            isset(
                $known[
                    $value
                ]
            )
        ) {
            return $known[
                $value
            ];
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

    private function tenantId(): string
    {
        return $this
            ->tenantContext
            ->requireId();
    }
}
