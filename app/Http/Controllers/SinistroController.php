<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSinistroDocumentoRequest;
use App\Http\Requests\StoreSinistroRequest;
use App\Http\Requests\UpdateSinistroRequest;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Sinistro;
use App\Models\SinistroDocumento;
use App\Services\PermissionService;
use App\Services\SinistroService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SinistroController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private SinistroService $service
    ){}

    public function index(
        Request $request
    ): JsonResponse {
        $validated=$request->validate([
            'status'=>[
                'nullable',
                Rule::in([
                    'aberto',
                    'em_andamento',
                    'encerrado',
                ]),
            ],

            'motorista_id'=>[
                'nullable',
                'uuid',
            ],

            'veiculo_id'=>[
                'nullable',
                'uuid',
            ],

            'peritagem_realizada'=>[
                'nullable',
                'boolean',
            ],

            'data_inicio'=>[
                'nullable',
                'date',
            ],

            'data_fim'=>[
                'nullable',
                'date',
                'after_or_equal:data_inicio',
            ],

            'search'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query=$this
            ->leituraQuery($request)
            ->with($this->relations())
            ->orderByDesc('data_sinistro')
            ->orderByDesc('created_at');

        foreach([
            'status',
            'motorista_id',
            'veiculo_id',
        ] as $field){
            if(!empty($validated[$field])){
                $query->where(
                    $field,
                    $validated[$field]
                );
            }
        }

        if(array_key_exists(
            'peritagem_realizada',
            $validated
        )){
            $query->where(
                'peritagem_realizada',
                (bool)$validated['peritagem_realizada']
            );
        }

        if(!empty($validated['data_inicio'])){
            $query->whereDate(
                'data_sinistro',
                '>=',
                $validated['data_inicio']
            );
        }

        if(!empty($validated['data_fim'])){
            $query->whereDate(
                'data_sinistro',
                '<=',
                $validated['data_fim']
            );
        }

        if(!empty($validated['search'])){
            $search=trim(
                $validated['search']
            );

            $query->where(
                function(Builder $query) use($search){
                    $query
                        ->where(
                            'numero_processo',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'seguradora',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'apolice',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'veiculo',
                            fn(Builder $query)=>
                                $query->where(
                                    'matricula',
                                    'like',
                                    "%{$search}%"
                                )
                        )
                        ->orWhereHas(
                            'motorista',
                            function(Builder $query) use($search){
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
                        );
                }
            );
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>$this
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
        StoreSinistroRequest $request
    ): JsonResponse {
        $sinistro=$this->service->create(
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Sinistro registado com sucesso.',
            'data'=>$sinistro,
        ],201);
    }

    public function update(
        UpdateSinistroRequest $request,
        string $id
    ): JsonResponse {
        $sinistro=$this->service->update(
            $id,
            $request->validated(),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Sinistro atualizado com sucesso.',
            'data'=>$sinistro,
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
            'message'=>'Sinistro eliminado com sucesso.',
        ]);
    }

    public function storeDocumento(
        StoreSinistroDocumentoRequest $request,
        string $id
    ): JsonResponse {
        $documento=$this->service->addDocument(
            $id,
            $request->validated('tipo'),
            $request->file('arquivo'),
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Documento adicionado com sucesso.',
            'data'=>$documento,
        ],201);
    }

    public function arquivo(
        Request $request,
        string $id,
        string $documentoId
    ): BinaryFileResponse {
        $documento=$this->documentoScoped(
            $request,
            $id,
            $documentoId
        );

        $response=response()->file(
            Storage::disk('local')
                ->path(
                    $documento->arquivo_path
                ),
            [
                'Content-Type'=>
                    $documento->arquivo_mime,
            ]
        );

        $response->headers->set(
            'Content-Disposition',
            'inline; filename="'.
            $this->safeFilename($documento).
            '"'
        );

        return $response;
    }

    public function downloadArquivo(
        Request $request,
        string $id,
        string $documentoId
    ): BinaryFileResponse {
        $documento=$this->documentoScoped(
            $request,
            $id,
            $documentoId
        );

        return response()->download(
            Storage::disk('local')
                ->path(
                    $documento->arquivo_path
                ),
            $this->safeFilename($documento),
            [
                'Content-Type'=>
                    $documento->arquivo_mime,
            ]
        );
    }

    public function destroyDocumento(
        Request $request,
        string $id,
        string $documentoId
    ): JsonResponse {
        $this->service->deleteDocument(
            $id,
            $documentoId,
            $request->user(),
            $this->tenantId()
        );

        return response()->json([
            'message'=>'Documento eliminado com sucesso.',
        ]);
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId=$this->tenantId();
        $user=$request->user();

        $query=Sinistro::query()
            ->where(
                'tenant_id',
                $tenantId
            );

        if($this->permissionService->allows(
            $user,
            'sinistros',
            'visualizar',
            $tenantId
        )){
            return $query;
        }

        if($user->hasRole(
            'motorista',
            $tenantId
        )){
            $motoristaId=Motorista::query()
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

        if($user->hasRole(
            'proprietario',
            $tenantId
        )){
            $proprietarioId=
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
                    fn(Builder $query)=>
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
            'Sem permissão suficiente para consultar sinistros.'
        );
    }

    private function findScoped(
        Request $request,
        string $id
    ): Sinistro {
        return $this
            ->leituraQuery($request)
            ->findOrFail($id);
    }

    private function documentoScoped(
        Request $request,
        string $sinistroId,
        string $documentoId
    ): SinistroDocumento {
        $sinistro=$this->findScoped(
            $request,
            $sinistroId
        );

        $documento=SinistroDocumento::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->where(
                'sinistro_id',
                $sinistro->id
            )
            ->findOrFail(
                $documentoId
            );

        if(
            blank($documento->arquivo_path) ||
            !Storage::disk('local')->exists(
                $documento->arquivo_path
            )
        ){
            abort(
                404,
                'Documento do sinistro não encontrado.'
            );
        }

        return $documento;
    }

    private function safeFilename(
        SinistroDocumento $documento
    ): string {
        $name=basename(
            str_replace(
                ['"',"\r","\n"],
                '',
                $documento->arquivo_nome
            )
        );

        return blank($name)
            ? 'documento-sinistro'
            : $name;
    }

    private function relations(): array
    {
        return [
            'veiculo:id,proprietario_id,matricula,marca,modelo',
            'veiculo.proprietario:id,tipo,nome_completo,nome_empresa,user_id',
            'motorista:id,nome_completo,nif,email,user_id',
            'documentos.createdBy:id,name',
            'createdBy:id,name',
            'updatedBy:id,name',
        ];
    }

    private function tenantId(): string
    {
        if(!$this->tenantContext->hasTenant()){
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
