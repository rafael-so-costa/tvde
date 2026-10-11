<?php

namespace App\Http\Controllers;

use App\Models\ChecklistMedia;
use App\Models\ChecklistRecord;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PortalChecklistController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function motoristaIndex(
        Request $request
    ): JsonResponse {
        return $this->indexFor(
            $request,
            'motorista'
        );
    }

    public function proprietarioIndex(
        Request $request
    ): JsonResponse {
        return $this->indexFor(
            $request,
            'proprietario'
        );
    }

    public function motoristaShow(
        Request $request,
        string $id
    ): JsonResponse {
        return $this->showFor(
            $request,
            'motorista',
            $id
        );
    }

    public function proprietarioShow(
        Request $request,
        string $id
    ): JsonResponse {
        return $this->showFor(
            $request,
            'proprietario',
            $id
        );
    }

    public function motoristaMedia(
        Request $request,
        string $id,
        string $mediaId
    ) {
        return $this->mediaFor(
            $request,
            'motorista',
            $id,
            $mediaId
        );
    }

    public function proprietarioMedia(
        Request $request,
        string $id,
        string $mediaId
    ) {
        return $this->mediaFor(
            $request,
            'proprietario',
            $id,
            $mediaId
        );
    }

    private function indexFor(
        Request $request,
        string $area
    ): JsonResponse {
        $validated =
            $request->validate([
                'q' => [
                    'nullable',
                    'string',
                    'max:150',
                ],

                'tipo' => [
                    'nullable',
                    Rule::in([
                        'entrega',
                        'recolha',
                    ]),
                ],

                'page' => [
                    'nullable',
                    'integer',
                    'min:1',
                ],

                'per_page' => [
                    'nullable',
                    'integer',
                    'min:5',
                    'max:50',
                ],
            ]);

        $base =
            $this->baseQuery(
                $request,
                $area
            );

        $summary = [
            'total' => (clone $base)
                ->count(),

            'entregas' => (clone $base)
                ->where(
                    'tipo',
                    'entrega'
                )
                ->count(),

            'recolhas' => (clone $base)
                ->where(
                    'tipo',
                    'recolha'
                )
                ->count(),

            'com_penalizacao' => (clone $base)
                ->where(
                    'penalizacao_total',
                    '>',
                    0
                )
                ->count(),
        ];

        $query =
            (clone $base)
                ->with([
                    'motorista:id,nome_completo',
                    'veiculo:id,matricula,marca,modelo,proprietario_id',
                ]);

        if (
            filled(
                $validated[
                    'tipo'
                ] ??
                null
            )
        ) {
            $query->where(
                'tipo',
                $validated[
                    'tipo'
                ]
            );
        }

        if (
            filled(
                $validated[
                    'q'
                ] ??
                null
            )
        ) {
            $term =
                '%'.
                trim(
                    $validated[
                        'q'
                    ]
                ).
                '%';

            $query->where(
                function (
                    Builder $query
                ) use (
                    $term
                ) {
                    $query
                        ->where(
                            'matricula_snapshot',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'modelo_snapshot',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'motorista_nome_snapshot',
                            'like',
                            $term
                        )
                        ->orWhere(
                            'observacoes',
                            'like',
                            $term
                        );
                }
            );
        }

        $paginator =
            $query
                ->orderByDesc(
                    'data_operacao'
                )
                ->orderByDesc(
                    'created_at'
                )
                ->paginate(
                    (int) $request->input(
                        'per_page',
                        20
                    )
                )
                ->withQueryString();

        $paginator->setCollection(
            $paginator
                ->getCollection()
                ->map(
                    fn (
                        ChecklistRecord $record
                    ) => $this->serialize(
                        $record,
                        false
                    )
                )
        );

        return response()->json([
            'data' => $paginator,
            'summary' => $summary,
        ]);
    }

    private function showFor(
        Request $request,
        string $area,
        string $id
    ): JsonResponse {
        $record =
            $this
                ->baseQuery(
                    $request,
                    $area
                )
                ->with([
                    'motorista:id,nome_completo',
                    'veiculo:id,matricula,marca,modelo,proprietario_id',
                    'entregaVinculada:id,tipo,motorista_id,veiculo_id,data_operacao,estado,matricula_snapshot,modelo_snapshot,motorista_nome_snapshot,quilometragem',
                    'recolha:id,entrega_vinculada_id,estado,data_operacao,matricula_snapshot',
                    'mediaFiles',
                ])
                ->findOrFail(
                    $id
                );

        return response()->json([
            'data' => $this->serialize(
                $record,
                true
            ),
        ]);
    }

    private function mediaFor(
        Request $request,
        string $area,
        string $id,
        string $mediaId
    ) {
        $record =
            $this
                ->baseQuery(
                    $request,
                    $area
                )
                ->findOrFail(
                    $id
                );

        $media =
            ChecklistMedia::query()
                ->where(
                    'tenant_id',
                    $this
                        ->tenantContext
                        ->requireId()
                )
                ->where(
                    'checklist_record_id',
                    $record->id
                )
                ->findOrFail(
                    $mediaId
                );

        if (
            ! Storage::disk(
                'local'
            )->exists(
                $media->arquivo_path
            )
        ) {
            abort(
                404,
                'Ficheiro não encontrado.'
            );
        }

        return Storage::disk(
            'local'
        )->response(
            $media->arquivo_path,
            $media->arquivo_nome,
            [
                'Content-Disposition' => 'inline',
            ]
        );
    }

    private function baseQuery(
        Request $request,
        string $area
    ): Builder {
        $tenantId =
            $this
                ->tenantContext
                ->requireId();

        $user =
            $request->user();

        $role =
            $area ===
            'motorista'
                ? 'motorista'
                : 'proprietario';

        $hasRole =
            $user
                ->roles()
                ->wherePivot(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'roles.codigo',
                    $role
                )
                ->exists();

        if (! $hasRole) {
            abort(
                403,
                'Este utilizador não possui acesso a esta área.'
            );
        }

        $query =
            ChecklistRecord::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'estado',
                    'finalizado'
                );

        if (
            $area ===
            'motorista'
        ) {
            $motorista =
                Motorista::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->first();

            if (! $motorista) {
                abort(
                    403,
                    'Não existe motorista associado a esta conta.'
                );
            }

            return $query
                ->where(
                    'motorista_id',
                    $motorista->id
                );
        }

        $proprietario =
            Proprietario::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->first();

        if (! $proprietario) {
            abort(
                403,
                'Não existe proprietário associado a esta conta.'
            );
        }

        return $query
            ->where(
                function (
                    Builder $query
                ) use (
                    $proprietario
                ) {
                    $query
                        ->whereHas(
                            'veiculo',
                            fn (
                                Builder $vehicleQuery
                            ) => $vehicleQuery
                                ->where(
                                    'proprietario_id',
                                    $proprietario->id
                                )
                        )
                        ->orWhereHas(
                            'contrato',
                            fn (
                                Builder $contractQuery
                            ) => $contractQuery
                                ->where(
                                    'proprietario_id',
                                    $proprietario->id
                                )
                        );
                }
            );
    }

    private function serialize(
        ChecklistRecord $record,
        bool $detail
    ): array {
        $data = [
            'id' => $record->id,

            'tipo' => $record->tipo,

            'origem' => $record->origem,

            'contrato_id' => $record->contrato_id,

            'motorista_id' => $record->motorista_id,

            'veiculo_id' => $record->veiculo_id,

            'entrega_vinculada_id' => $record
                ->entrega_vinculada_id,

            'motorista_nome_snapshot' => $record
                ->motorista_nome_snapshot,

            'matricula_snapshot' => $record
                ->matricula_snapshot,

            'modelo_snapshot' => $record
                ->modelo_snapshot,

            'data_operacao' => $record
                ->data_operacao
                ?->toDateString(),

            'hora_operacao' => $record
                ->hora_operacao,

            'quilometragem' => $record
                ->quilometragem,

            'nivel_combustivel' => $record
                ->nivel_combustivel,

            'penalizacao_total' => $record
                ->penalizacao_total,

            'observacoes' => $record
                ->observacoes,

            'estado' => $record
                ->estado,

            'finalizado_em' => $record
                ->finalizado_em
                ?->toIso8601String(),

            'created_at' => $record
                ->created_at
                ?->toIso8601String(),

            'motorista' => $record
                ->motorista,

            'veiculo' => $record
                ->veiculo,

            'assinaturas' => [
                'empresa' => filled(
                    $record
                        ->assinatura_empresa_path
                ),

                'motorista' => filled(
                    $record
                        ->assinatura_motorista_path
                ),
            ],
        ];

        if (! $detail) {
            return $data;
        }

        $data['itens'] =
            $record->itens ??
            [];

        $data['campos_especiais'] =
            $record
                ->campos_especiais ??
            [];

        $data['danos'] =
            $record->danos ??
            [];

        $data['itens_faltantes'] =
            $record
                ->itens_faltantes ??
            [];

        $data['novos_danos'] =
            $record
                ->novos_danos ??
            [];

        $data['entrega_vinculada'] =
            $record
                ->entregaVinculada;

        $data['recolha'] =
            $record
                ->recolha;

        $data['media_files'] =
            $record
                ->mediaFiles
                ->map(
                    fn (
                        ChecklistMedia $media
                    ) => [
                        'id' => $media->id,

                        'tipo' => $media->tipo,

                        'contexto' => $media->contexto,

                        'titulo' => $media->titulo,

                        'arquivo_nome' => $media
                            ->arquivo_nome,

                        'arquivo_mime' => $media
                            ->arquivo_mime,

                        'arquivo_tamanho' => $media
                            ->arquivo_tamanho,

                        'capturado_em' => $media
                            ->capturado_em
                            ?->toIso8601String(),
                    ]
                )
                ->values()
                ->all();

        return $data;
    }
}
