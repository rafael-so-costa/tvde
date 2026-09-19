<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinalizeChecklistRecordRequest;
use App\Http\Requests\StoreChecklistRecordRequest;
use App\Http\Requests\UpdateChecklistRecordRequest;
use App\Models\ChecklistRecord;
use App\Models\Motorista;
use App\Models\Veiculo;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ChecklistRecordController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo' => [
                'nullable',
                Rule::in([
                    'entrega',
                    'recolha',
                ]),
            ],

            'estado' => [
                'nullable',
                Rule::in([
                    'rascunho',
                    'finalizado',
                ]),
            ],

            'motorista_id' => [
                'nullable',
                'uuid',
            ],

            'veiculo_id' => [
                'nullable',
                'uuid',
            ],
        ]);

        $query = ChecklistRecord::query()
            ->with([
                'motorista:id,nome_completo',
                'veiculo:id,matricula,marca,modelo',
                'entregaVinculada:id,tipo,motorista_id,veiculo_id,data_operacao,estado',
                'recolha:id,entrega_vinculada_id,estado,data_operacao',
            ])
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->latest('created_at');

        foreach (
            [
                'tipo',
                'estado',
                'motorista_id',
                'veiculo_id',
            ] as $field
        ) {
            if (!empty($validated[$field])) {
                $query->where(
                    $field,
                    $validated[$field]
                );
            }
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(
        StoreChecklistRecordRequest $request
    ): JsonResponse {
        $tenantId = $this->tenantId();
        $validated = $request->validated();

        $checklist = DB::transaction(
            function () use (
                $tenantId,
                $validated,
                $request
            ) {
                $motorista = Motorista::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->findOrFail(
                        $validated['motorista_id']
                    );

                $veiculo = Veiculo::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->findOrFail(
                        $validated['veiculo_id']
                    );

                if (
                    $validated['tipo'] ===
                    'recolha'
                ) {
                    $entrega = ChecklistRecord::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'tipo',
                            'entrega'
                        )
                        ->where(
                            'estado',
                            'finalizado'
                        )
                        ->lockForUpdate()
                        ->findOrFail(
                            $validated['entrega_vinculada_id']
                        );

                    if (
                        $entrega->motorista_id !==
                        $motorista->id ||
                        $entrega->veiculo_id !==
                        $veiculo->id
                    ) {
                        abort(
                            422,
                            'A recolha deve utilizar o mesmo motorista e veículo da entrega vinculada.'
                        );
                    }

                    $jaExiste = ChecklistRecord::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'tipo',
                            'recolha'
                        )
                        ->where(
                            'entrega_vinculada_id',
                            $entrega->id
                        )
                        ->exists();

                    if ($jaExiste) {
                        abort(
                            422,
                            'Esta entrega já possui uma recolha vinculada.'
                        );
                    }
                }

                $checklist = new ChecklistRecord(
                    $validated
                );

                $checklist->tenant_id =
                    $tenantId;

                $checklist->estado =
                    'rascunho';

                $checklist->realizado_por =
                    $request->user()->id;

                $checklist->motorista_nome_snapshot =
                    $motorista->nome_completo;

                $checklist->matricula_snapshot =
                    $veiculo->matricula;

                $checklist->modelo_snapshot =
                    trim(
                        "{$veiculo->marca} {$veiculo->modelo}"
                    );

                $checklist->save();

                return $checklist;
            }
        );

        $checklist->load([
            'motorista:id,nome_completo',
            'veiculo:id,matricula,marca,modelo',
            'entregaVinculada:id,tipo,motorista_id,veiculo_id,data_operacao,estado',
        ]);

        return response()->json([
            'message' => 'Checklist criado com sucesso.',
            'data' => $checklist,
        ], 201);
    }

    public function show(
        string $id
    ): JsonResponse {
        $checklist = $this
            ->findChecklist($id);

        $checklist->load([
            'motorista:id,nome_completo',
            'veiculo:id,matricula,marca,modelo',
            'entregaVinculada:id,tipo,motorista_id,veiculo_id,data_operacao,estado',
            'recolha:id,entrega_vinculada_id,estado,data_operacao',
        ]);

        return response()->json([
            'data' => $checklist,
        ]);
    }

    public function update(
        UpdateChecklistRecordRequest $request,
        string $id
    ): JsonResponse {
        $checklist = $this
            ->findChecklist($id);

        if (
            $checklist->estado !==
            'rascunho'
        ) {
            return response()->json([
                'message' => 'Checklists finalizados não podem ser alterados.',
            ], 422);
        }

        $validated =
            $request->validated();

        $motoristaId =
            $validated['motorista_id'] ??
            $checklist->motorista_id;

        $veiculoId =
            $validated['veiculo_id'] ??
            $checklist->veiculo_id;

        if (
            $checklist->tipo ===
            'recolha' &&
            $checklist->entrega_vinculada_id
        ) {
            $entrega = ChecklistRecord::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->where(
                    'tipo',
                    'entrega'
                )
                ->findOrFail(
                    $checklist
                        ->entrega_vinculada_id
                );

            if (
                $entrega->motorista_id !==
                $motoristaId ||
                $entrega->veiculo_id !==
                $veiculoId
            ) {
                return response()->json([
                    'message' => 'A recolha deve utilizar o mesmo motorista e veículo da entrega vinculada.',
                ], 422);
            }
        }

        $checklist->fill(
            $validated
        );

        if (
            array_key_exists(
                'motorista_id',
                $validated
            )
        ) {
            $motorista = Motorista::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->findOrFail(
                    $motoristaId
                );

            $checklist->motorista_nome_snapshot =
                $motorista->nome_completo;
        }

        if (
            array_key_exists(
                'veiculo_id',
                $validated
            )
        ) {
            $veiculo = Veiculo::query()
                ->where(
                    'tenant_id',
                    $this->tenantId()
                )
                ->findOrFail(
                    $veiculoId
                );

            $checklist->matricula_snapshot =
                $veiculo->matricula;

            $checklist->modelo_snapshot =
                trim(
                    "{$veiculo->marca} {$veiculo->modelo}"
                );
        }

        $checklist->save();

        return response()->json([
            'message' => 'Checklist atualizado com sucesso.',
            'data' => $checklist,
        ]);
    }

    public function finalize(
        FinalizeChecklistRecordRequest $request,
        string $id
    ): JsonResponse {
        $tenantId =
            $this->tenantId();

        $assinaturaEmpresa =
            $this->decodeSignature(
                $request->string(
                    'assinatura_empresa'
                )->toString()
            );

        $assinaturaMotorista =
            $this->decodeSignature(
                $request->string(
                    'assinatura_motorista'
                )->toString()
            );

        $storedPaths = [];

        try {
            $checklist =
                DB::transaction(
                    function () use (
                        $id,
                        $tenantId,
                        $assinaturaEmpresa,
                        $assinaturaMotorista,
                        &$storedPaths
                    ) {
                        $checklist =
                            ChecklistRecord::query()
                            ->where(
                                'tenant_id',
                                $tenantId
                            )
                            ->whereKey($id)
                            ->lockForUpdate()
                            ->firstOrFail();

                        if (
                            $checklist->estado ===
                            'finalizado'
                        ) {
                            abort(
                                422,
                                'O checklist já está finalizado.'
                            );
                        }

                        $basePath =
                            'checklist-signatures/' .
                            $tenantId .
                            '/' .
                            $checklist->id;

                        $empresaPath =
                            $basePath .
                            '/empresa.png';

                        $motoristaPath =
                            $basePath .
                            '/motorista.png';

                        if (
                            !Storage::disk('local')
                                ->put(
                                    $empresaPath,
                                    $assinaturaEmpresa
                                )
                        ) {
                            throw new RuntimeException(
                                'Não foi possível guardar a assinatura da empresa.'
                            );
                        }

                        $storedPaths[] =
                            $empresaPath;

                        if (
                            !Storage::disk('local')
                                ->put(
                                    $motoristaPath,
                                    $assinaturaMotorista
                                )
                        ) {
                            throw new RuntimeException(
                                'Não foi possível guardar a assinatura do motorista.'
                            );
                        }

                        $storedPaths[] =
                            $motoristaPath;

                        $checklist
                            ->assinatura_empresa_path =
                            $empresaPath;

                        $checklist
                            ->assinatura_motorista_path =
                            $motoristaPath;

                        $checklist->estado =
                            'finalizado';

                        $checklist->finalizado_em =
                            now();

                        $checklist->save();

                        return $checklist;
                    }
                );
        } catch (Throwable $exception) {
            foreach (
                $storedPaths as $path
            ) {
                Storage::disk('local')
                    ->delete($path);
            }

            throw $exception;
        }

        return response()->json([
            'message' =>
            'Checklist finalizado com sucesso.',
            'data' =>
            $checklist,
        ]);
    }

    public function destroy(
        string $id
    ): Response|JsonResponse {
        $checklist = $this
            ->findChecklist($id);

        if (
            $checklist->estado ===
            'finalizado'
        ) {
            return response()->json([
                'message' => 'Checklists finalizados não podem ser eliminados.',
            ], 422);
        }

        $checklist->delete();

        return response()->noContent();
    }

    private function findChecklist(
        string $id
    ): ChecklistRecord {
        return ChecklistRecord::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail($id);
    }

    private function decodeSignature(
        string $dataUrl
    ): string {
        $prefix =
            'data:image/png;base64,';

        $binary =
            base64_decode(
                substr(
                    $dataUrl,
                    strlen($prefix)
                ),
                true
            );

        if ($binary === false) {
            throw new RuntimeException(
                'Assinatura PNG inválida.'
            );
        }

        return $binary;
    }

    private function tenantId(): string
    {
        if (
            !$this->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this
            ->tenantContext
            ->requireId();
    }
}
