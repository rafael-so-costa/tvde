<?php

namespace App\Http\Controllers;

use App\Http\Requests\RespondManutencaoAprovacaoRequest;
use App\Http\Requests\StoreManutencaoAprovacaoRequest;
use App\Http\Requests\StoreManutencaoDocumentoRequest;
use App\Http\Requests\StoreManutencaoItemRequest;
use App\Http\Requests\StoreManutencaoRequest;
use App\Http\Requests\UpdateManutencaoItemRequest;
use App\Http\Requests\UpdateManutencaoRequest;
use App\Models\Manutencao;
use App\Models\ManutencaoAprovacao;
use App\Models\ManutencaoDocumento;
use App\Models\ManutencaoGarantia;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Services\ManutencaoAprovacaoService;
use App\Services\ManutencaoDocumentoService;
use App\Services\ManutencaoGarantiaService;
use App\Services\ManutencaoService;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ManutencaoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private ManutencaoService $service,
        private ManutencaoDocumentoService $documentoService,
        private ManutencaoAprovacaoService $aprovacaoService,
        private ManutencaoGarantiaService $garantiaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'rascunho',
                    'aguardando_aprovacao',
                    'aprovada',
                    'agendada',
                    'em_andamento',
                    'aguardando_pecas',
                    'concluida',
                    'cancelada',
                ]),
            ],
            'origem' => [
                'nullable',
                Rule::in([
                    'preventiva',
                    'avaria',
                    'checklist',
                    'sinistro',
                    'diagnostico',
                    'manual',
                ]),
            ],
            'prioridade' => [
                'nullable',
                Rule::in([
                    'baixa',
                    'normal',
                    'alta',
                    'critica',
                ]),
            ],
            'veiculo_id' => [
                'nullable',
                'uuid',
            ],
            'motorista_id' => [
                'nullable',
                'uuid',
            ],
            'fornecedor_id' => [
                'nullable',
                'uuid',
            ],
            'plano_id' => [
                'nullable',
                'uuid',
            ],
            'data_inicio' => [
                'nullable',
                'date',
            ],
            'data_fim' => [
                'nullable',
                'date',
                'after_or_equal:data_inicio',
            ],
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query = $this
            ->leituraQuery($request)
            ->with($this->relations())
            ->orderByRaw(
                "CASE
                    WHEN status='em_andamento' THEN 1
                    WHEN status='aguardando_pecas' THEN 2
                    WHEN status='aguardando_aprovacao' THEN 3
                    WHEN status='agendada' THEN 4
                    ELSE 5
                END"
            )
            ->orderByDesc('data_solicitacao')
            ->orderByDesc('created_at');

        foreach (
            [
                'status',
                'origem',
                'prioridade',
                'veiculo_id',
                'motorista_id',
                'fornecedor_id',
                'plano_id',
            ] as $field
        ) {
            if (!empty($validated[$field])) {
                $query->where(
                    $field,
                    $validated[$field]
                );
            }
        }

        if (!empty($validated['data_inicio'])) {
            $query->whereDate(
                'data_solicitacao',
                '>=',
                $validated['data_inicio']
            );
        }

        if (!empty($validated['data_fim'])) {
            $query->whereDate(
                'data_solicitacao',
                '<=',
                $validated['data_fim']
            );
        }

        if (!empty($validated['search'])) {
            $search = trim(
                $validated['search']
            );

            $query->where(
                function (Builder $query) use ($search) {
                    $query
                        ->where(
                            'numero_ordem',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'tipo_servico',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'problema_reportado',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'veiculo',
                            function (Builder $query) use ($search) {
                                $query
                                    ->where(
                                        'matricula',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'marca',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'modelo',
                                        'like',
                                        "%{$search}%"
                                    );
                            }
                        )
                        ->orWhereHas(
                            'motorista',
                            function (Builder $query) use ($search) {
                                $query
                                    ->where(
                                        'nome_completo',
                                        'like',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'nif',
                                        'like',
                                        "%{$search}%"
                                    );
                            }
                        )
                        ->orWhereHas(
                            'fornecedor',
                            fn(Builder $query) =>
                            $query->where(
                                'nome',
                                'like',
                                "%{$search}%"
                            )
                        );
                }
            );
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'data' => $this
                ->findScoped(
                    $request,
                    $id
                )
                ->load(
                    $this->relations()
                ),
        ]);
    }

    public function store(
        StoreManutencaoRequest $request
    ): JsonResponse {
        $manutencao = $this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção criada com sucesso.',
            'data' => $manutencao,
        ], 201);
    }

    public function update(
        UpdateManutencaoRequest $request,
        string $id
    ): JsonResponse {
        $manutencao = $this->service->update(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção atualizada com sucesso.',
            'data' => $manutencao,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $this->service->delete(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção eliminada com sucesso.',
        ]);
    }

    public function storeItem(
        StoreManutencaoItemRequest $request,
        string $id
    ): JsonResponse {
        $item = $this->service->addItem(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Item adicionado com sucesso.',
            'data' => $item,
        ], 201);
    }

    public function updateItem(
        UpdateManutencaoItemRequest $request,
        string $id,
        string $itemId
    ): JsonResponse {
        $item = $this->service->updateItem(
            $id,
            $itemId,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Item atualizado com sucesso.',
            'data' => $item,
        ]);
    }

    public function destroyItem(
        Request $request,
        string $id,
        string $itemId
    ): JsonResponse {
        $this->service->deleteItem(
            $id,
            $itemId,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Item eliminado com sucesso.',
        ]);
    }

    public function agendar(
        Request $request,
        string $id
    ): JsonResponse {
        $validated = $request->validate([
            'data_agendada' => [
                'required',
                'date',
            ],
        ]);

        $manutencao = $this->service->agendar(
            $id,
            $validated['data_agendada'],
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção agendada com sucesso.',
            'data' => $manutencao,
        ]);
    }

    public function iniciar(
        Request $request,
        string $id
    ): JsonResponse {
        $manutencao = $this->service->iniciar(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção iniciada com sucesso.',
            'data' => $manutencao,
        ]);
    }

    public function aguardarPecas(
        Request $request,
        string $id
    ): JsonResponse {
        $manutencao =
            $this->service->aguardarPecas(
                $id,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' => 'Manutenção marcada como aguardando peças.',
            'data' => $manutencao,
        ]);
    }

    public function retomar(
        Request $request,
        string $id
    ): JsonResponse {
        $manutencao = $this->service->retomar(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção retomada com sucesso.',
            'data' => $manutencao,
        ]);
    }

    public function concluir(
        Request $request,
        string $id
    ): JsonResponse {
        $manutencao = $this->service->concluir(
            $id,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Manutenção concluída com sucesso.',
            'data' => $manutencao,
        ]);
    }

    public function cancelar(
        Request $request,
        string $id
    ): JsonResponse {
        $validated = $request->validate([
            'motivo' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        $manutencao = $this->service->cancelar(
            $id,
            $request->user(),
            $this->tenantId(),
            $validated['motivo'] ?? null
        );

        return response()->json([
            'message' => 'Manutenção cancelada.',
            'data' => $manutencao,
        ]);
    }

    public function fromChecklist(
        Request $request,
        string $checklistId
    ): JsonResponse {
        $data = $this->validateOriginPayload(
            $request
        );

        $manutencao =
            $this->service
            ->createFromChecklist(
                $checklistId,
                $data,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Manutenção criada a partir do checklist.',
            'data' => $manutencao,
        ], 201);
    }

    public function fromSinistro(
        Request $request,
        string $sinistroId
    ): JsonResponse {
        $data = $this->validateOriginPayload(
            $request
        );

        $manutencao =
            $this->service
            ->createFromSinistro(
                $sinistroId,
                $data,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Manutenção criada a partir do sinistro.',
            'data' => $manutencao,
        ], 201);
    }

    public function fromDiagnostico(
        Request $request,
        string $diagnosticoId
    ): JsonResponse {
        $data = $this->validateOriginPayload(
            $request
        );

        $manutencao =
            $this->service
            ->createFromDiagnostico(
                $diagnosticoId,
                $data,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Manutenção criada a partir do diagnóstico.',
            'data' => $manutencao,
        ], 201);
    }

    public function storeDocumento(
        StoreManutencaoDocumentoRequest $request,
        string $id
    ): JsonResponse {
        $documento =
            $this->documentoService->add(
                $id,
                $request->validated('tipo'),
                $request->file('arquivo'),
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' => 'Documento adicionado com sucesso.',
            'data' => $documento,
        ], 201);
    }

    public function processarDocumento(
        Request $request,
        string $id,
        string $documentoId
    ): JsonResponse {
        $this->findScoped(
            $request,
            $id
        );

        $documento =
            ManutencaoDocumento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->where(
                'manutencao_id',
                $id
            )
            ->findOrFail(
                $documentoId
            );

        $documento =
            $this->documentoService
            ->processarPdf(
                $documento->id,
                $this->tenantId()
            );

        return response()->json([
            'message' => 'Documento processado.',
            'data' => $documento,
        ]);
    }

    public function registrarOcr(
        Request $request,
        string $id,
        string $documentoId
    ): JsonResponse {
        $validated = $request->validate([
            'texto' => [
                'required',
                'string',
                'max:2000000',
            ],
        ]);

        $this->findScoped(
            $request,
            $id
        );

        $documento =
            ManutencaoDocumento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->where(
                'manutencao_id',
                $id
            )
            ->findOrFail(
                $documentoId
            );

        $documento =
            $this->documentoService
            ->registrarOcr(
                $documento->id,
                $validated['texto'],
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' => 'OCR registado com sucesso.',
            'data' => $documento,
        ]);
    }

    public function arquivo(
        Request $request,
        string $id,
        string $documentoId
    ): BinaryFileResponse {
        $documento = $this->documentoScoped(
            $request,
            $id,
            $documentoId
        );

        $response = response()->file(
            Storage::disk('local')->path(
                $documento->arquivo_path
            ),
            [
                'Content-Type' =>
                $documento->arquivo_mime,
            ]
        );

        $response->headers->set(
            'Content-Disposition',
            'inline; filename="' .
                $this->safeFilename(
                    $documento
                ) .
                '"'
        );

        return $response;
    }

    public function downloadArquivo(
        Request $request,
        string $id,
        string $documentoId
    ): BinaryFileResponse {
        $documento = $this->documentoScoped(
            $request,
            $id,
            $documentoId
        );

        return response()->download(
            Storage::disk('local')->path(
                $documento->arquivo_path
            ),
            $this->safeFilename(
                $documento
            ),
            [
                'Content-Type' =>
                $documento->arquivo_mime,
            ]
        );
    }

    public function destroyDocumento(
        Request $request,
        string $id,
        string $documentoId
    ): JsonResponse {
        $this->documentoService->delete(
            $id,
            $documentoId,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message' => 'Documento eliminado com sucesso.',
        ]);
    }

    public function solicitarAprovacao(
        StoreManutencaoAprovacaoRequest $request,
        string $id
    ): JsonResponse {
        $resultado =
            $this->aprovacaoService
            ->solicitar(
                $id,
                $request->validated(),
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message' =>
            'Aprovação solicitada com sucesso.',
            'data' => $resultado['aprovacao'],
            /*
             * O frontend usa este token para montar
             * o link externo. Ele não volta a ser
             * recuperável depois desta resposta.
             */
            'token' => $resultado['token'],
        ], 201);
    }

    public function responderAprovacaoInterna(
        RespondManutencaoAprovacaoRequest $request,
        string $id,
        string $aprovacaoId
    ): JsonResponse {
        $aprovacao =
            ManutencaoAprovacao::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->where(
                'manutencao_id',
                $id
            )
            ->findOrFail(
                $aprovacaoId
            );

        $aprovacao =
            $this->aprovacaoService
            ->responderInterno(
                $aprovacao->id,
                $request->validated(
                    'decisao'
                ),
                $request->user(),
                $this->tenantId(),
                $request->validated(
                    'observacoes'
                )
            );

        return response()->json([
            'message' => 'Aprovação registada.',
            'data' => $aprovacao,
        ]);
    }

    public function utilizarGarantia(
        Request $request,
        string $id,
        string $garantiaId
    ): JsonResponse {
        $validated = $request->validate([
            'observacoes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        ManutencaoGarantia::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->where(
                'manutencao_id',
                $id
            )
            ->findOrFail(
                $garantiaId
            );

        $garantia =
            $this->garantiaService->utilizar(
                $garantiaId,
                $request->user(),
                $this->tenantId(),
                $validated['observacoes']
                    ?? null
            );

        return response()->json([
            'message' => 'Garantia marcada como utilizada.',
            'data' => $garantia,
        ]);
    }

    /*
     * Endpoint público.
     * Não usa TenantContext porque o token é global,
     * aleatório e armazenado apenas como hash.
     */
    public function showAprovacaoPublica(
        string $token
    ): JsonResponse {
        $aprovacao =
            $this->findPublicApproval(
                $token
            );

        return response()->json([
            'data' => [
                'status' =>
                $aprovacao->status === 'pendente' &&
                    $aprovacao->expires_at &&
                    $aprovacao->expires_at->isPast()
                    ? 'expirada'
                    : $aprovacao->status,
                'valor_orcamento' =>
                $aprovacao
                    ->valor_orcamento,
                'aprovador_nome' =>
                $aprovacao
                    ->aprovador_nome,
                'expires_at' =>
                $aprovacao
                    ->expires_at,
                'respondido_em' =>
                $aprovacao
                    ->respondido_em,
                'manutencao' => [
                    'numero_ordem' =>
                    $aprovacao
                        ->manutencao
                        ->numero_ordem,
                    'tipo_servico' =>
                    $aprovacao
                        ->manutencao
                        ->tipo_servico,
                    'problema_reportado' =>
                    $aprovacao
                        ->manutencao
                        ->problema_reportado,
                    'veiculo' => [
                        'matricula' =>
                        $aprovacao
                            ->manutencao
                            ->veiculo
                            ->matricula,
                        'marca' =>
                        $aprovacao
                            ->manutencao
                            ->veiculo
                            ->marca,
                        'modelo' =>
                        $aprovacao
                            ->manutencao
                            ->veiculo
                            ->modelo,
                    ],
                ],
            ],
        ]);
    }

    public function responderAprovacaoPublica(
        RespondManutencaoAprovacaoRequest $request,
        string $token
    ): JsonResponse {
        $aprovacao =
            $this->aprovacaoService
            ->responderExterno(
                $token,
                $request->validated(
                    'decisao'
                ),
                $request->validated(
                    'observacoes'
                ),
                $request->ip(),
                $request->userAgent()
            );

        return response()->json([
            'message' => 'Resposta registada com sucesso.',
            'data' => [
                'status' => $aprovacao->status,
                'respondido_em' =>
                $aprovacao
                    ->respondido_em,
            ],
        ]);
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId = $this->tenantId();
        $user = $request->user();

        $query = Manutencao::query()
            ->where(
                'tenant_id',
                $tenantId
            );

        if ($this->permissionService->allows(
            $user,
            'manutencao',
            'visualizar',
            $tenantId
        )) {
            return $query;
        }

        if ($user->hasRole(
            'motorista',
            $tenantId
        )) {
            $motoristaId =
                Motorista::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->value('id');

            return $motoristaId
                ? $query->where(
                    'motorista_id',
                    $motoristaId
                )
                : $query->whereRaw(
                    '1 = 0'
                );
        }

        if ($user->hasRole(
            'proprietario',
            $tenantId
        )) {
            $proprietarioId =
                Proprietario::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->value('id');

            return $proprietarioId
                ? $query->whereHas(
                    'veiculo',
                    fn(Builder $query) =>
                    $query->where(
                        'proprietario_id',
                        $proprietarioId
                    )
                )
                : $query->whereRaw(
                    '1 = 0'
                );
        }

        abort(
            403,
            'Sem permissão suficiente para consultar manutenções.'
        );
    }

    private function findScoped(
        Request $request,
        string $id
    ): Manutencao {
        return $this
            ->leituraQuery($request)
            ->findOrFail($id);
    }

    private function documentoScoped(
        Request $request,
        string $manutencaoId,
        string $documentoId
    ): ManutencaoDocumento {
        $manutencao = $this->findScoped(
            $request,
            $manutencaoId
        );

        $documento =
            ManutencaoDocumento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->where(
                'manutencao_id',
                $manutencao->id
            )
            ->findOrFail(
                $documentoId
            );

        if (
            blank(
                $documento->arquivo_path
            ) ||
            !Storage::disk('local')
                ->exists(
                    $documento
                        ->arquivo_path
                )
        ) {
            abort(
                404,
                'Documento da manutenção não encontrado.'
            );
        }

        return $documento;
    }

    private function safeFilename(
        ManutencaoDocumento $documento
    ): string {
        $name = basename(
            str_replace(
                ['"', "\r", "\n"],
                '',
                $documento
                    ->arquivo_nome
            )
        );

        return blank($name)
            ? 'documento-manutencao'
            : $name;
    }

    private function findPublicApproval(
        string $token
    ): ManutencaoAprovacao {
        if (
            strlen($token) < 32 ||
            strlen($token) > 128
        ) {
            abort(
                404,
                'Solicitação de aprovação não encontrada.'
            );
        }

        $aprovacao =
            ManutencaoAprovacao::query()
            ->where(
                'token_hash',
                hash(
                    'sha256',
                    $token
                )
            )
            ->with([
                'manutencao:id,veiculo_id,numero_ordem,tipo_servico,problema_reportado',
                'manutencao.veiculo:id,matricula,marca,modelo',
            ])
            ->first();

        if (!$aprovacao) {
            abort(
                404,
                'Solicitação de aprovação não encontrada.'
            );
        }

        return $aprovacao;
    }

    private function validateOriginPayload(
        Request $request
    ): array {
        return $request->validate([
            'tipo_servico' => [
                'required',
                'string',
                'max:150',
            ],
            'motorista_id' => [
                'nullable',
                'uuid',
            ],
            'fornecedor_id' => [
                'nullable',
                'uuid',
            ],
            'plano_id' => [
                'nullable',
                'uuid',
            ],
            'prioridade' => [
                'nullable',
                Rule::in([
                    'baixa',
                    'normal',
                    'alta',
                    'critica',
                ]),
            ],
            'problema_reportado' => [
                'nullable',
                'string',
                'max:10000',
            ],
            'km' => [
                'nullable',
                'integer',
                'min:0',
                'max:999999999',
            ],
            'data_solicitacao' => [
                'nullable',
                'date',
            ],
            'data_agendada' => [
                'nullable',
                'date',
            ],
            'aprovacao_obrigatoria' => [
                'nullable',
                'boolean',
            ],
            'indisponibiliza_veiculo' => [
                'nullable',
                'boolean',
            ],
            'valor_orcamento' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],
            'observacoes' => [
                'nullable',
                'string',
                'max:20000',
            ],
        ]);
    }

    private function relations(): array
    {
        return [
            'veiculo:id,proprietario_id,matricula,marca,modelo,km_atual,disponibilidade',
            'veiculo.proprietario:id,tipo,nome_completo,nome_empresa,user_id',
            'motorista:id,nome_completo,nif,email,user_id',
            'fornecedor:id,tipo,nome,nif,email,telemovel',
            'plano:id,nome,tipo_servico,intervalo_km,intervalo_meses,alerta_antecedencia_km,alerta_antecedencia_dias',
            'checklist:id,tipo,estado,quilometragem,data_operacao',
            'sinistro:id,numero_processo,status,data_sinistro',
            'itens.peca:id,codigo,nome,unidade,estoque_atual,estoque_minimo,custo_medio',
            'documentos.createdBy:id,name',
            'aprovacoes.solicitadoPor:id,name',
            'aprovacoes.aprovadoPor:id,name',
            'garantias.peca:id,codigo,nome',
            'garantias.fornecedor:id,nome',
            'diagnosticos:id,manutencao_id,fonte,codigo_dtc,severidade,status,titulo,detectado_em',
            'createdBy:id,name',
            'updatedBy:id,name',
        ];
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
