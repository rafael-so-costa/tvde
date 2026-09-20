<?php

namespace App\Http\Controllers;

use App\Http\Requests\RejectReciboVerdeRequest;
use App\Http\Requests\StoreReciboVerdeRequest;
use App\Models\Motorista;
use App\Models\ReciboVerde;
use App\Services\PermissionService;
use App\Services\ReciboVerdeService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReciboVerdeController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private ReciboVerdeService $reciboVerdeService
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $validated=$request->validate([
            'status'=>[
                'nullable',
                Rule::in([
                    'pendente_validacao',
                    'validado',
                    'rejeitado',
                ]),
            ],

            'motorista_id'=>[
                'nullable',
                'uuid',
            ],

            'empresa_id'=>[
                'nullable',
                'uuid',
            ],

            'ano'=>[
                'nullable',
                'integer',
                'min:2000',
                'max:2100',
            ],

            'mes'=>[
                'nullable',
                'integer',
                'between:1,12',
            ],

            'search'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query=$this
            ->leituraQuery($request)
            ->with(
                $this->relations()
            )
            ->orderByDesc(
                'data_emissao'
            )
            ->orderByDesc(
                'created_at'
            );

        if(
            !empty(
                $validated['status']
            )
        ){
            $query->where(
                'status',
                $validated['status']
            );
        }

        if(
            !empty(
                $validated['motorista_id']
            )
        ){
            $query->where(
                'motorista_id',
                $validated['motorista_id']
            );
        }

        if(
            !empty(
                $validated['empresa_id']
            )
        ){
            $query->where(
                'empresa_id',
                $validated['empresa_id']
            );
        }

        if(
            !empty(
                $validated['ano']
            )
        ){
            $query->where(
                'ano',
                $validated['ano']
            );
        }

        if(
            !empty(
                $validated['mes']
            )
        ){
            $query->where(
                'mes',
                $validated['mes']
            );
        }

        if(
            !empty(
                $validated['search']
            )
        ){
            $search=trim(
                $validated['search']
            );

            $query->where(
                function(
                    Builder $query
                ) use($search){
                    $query
                        ->where(
                            'numero_documento',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif_emitente',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nome_emitente',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif_adquirente',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nome_adquirente',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'motorista',
                            function(
                                Builder $query
                            ) use($search){
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
                            'empresa',
                            function(
                                Builder $query
                            ) use($search){
                                $query
                                    ->where(
                                        'nome_empresa',
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

    public function store(
        StoreReciboVerdeRequest $request
    ): JsonResponse {
        $data=$request->validated();

        $arquivo=$request->file(
            'arquivo'
        );

        unset(
            $data['arquivo']
        );

        $recibo=$this
            ->reciboVerdeService
            ->create(
                $data,
                $arquivo,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message'=>
                'Recibo verde enviado com sucesso.',
            'data'=>$recibo,
        ],201);
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

    public function approve(
        Request $request,
        string $id
    ): JsonResponse {
        $recibo=$this
            ->reciboVerdeService
            ->approve(
                $id,
                $this->tenantId(),
                $request->user()
            );

        return response()->json([
            'message'=>
                'Recibo verde validado com sucesso.',
            'data'=>$recibo,
        ]);
    }

    public function reject(
        RejectReciboVerdeRequest $request,
        string $id
    ): JsonResponse {
        $recibo=$this
            ->reciboVerdeService
            ->reject(
                $id,
                $this->tenantId(),
                $request->user(),
                $request->validated(
                    'motivo'
                )
            );

        return response()->json([
            'message'=>
                'Recibo verde rejeitado.',
            'data'=>$recibo,
        ]);
    }

    public function arquivo(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $recibo=$this
            ->arquivoRecibo(
                $request,
                $id
            );

        $response=response()->file(
            Storage::disk('local')
                ->path(
                    $recibo->arquivo_path
                ),
            [
                'Content-Type'=>
                    $recibo->arquivo_mime,
            ]
        );

        $response->headers->set(
            'Content-Disposition',
            'inline; filename="'.
            $this->filename(
                $recibo
            ).
            '"'
        );

        return $response;
    }

    public function downloadArquivo(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $recibo=$this
            ->arquivoRecibo(
                $request,
                $id
            );

        return response()->download(
            Storage::disk('local')
                ->path(
                    $recibo->arquivo_path
                ),
            $this->filename(
                $recibo
            ),
            [
                'Content-Type'=>
                    $recibo->arquivo_mime,
            ]
        );
    }

    private function arquivoRecibo(
        Request $request,
        string $id
    ): ReciboVerde {
        $recibo=$this
            ->findScoped(
                $request,
                $id
            );

        if(
            blank(
                $recibo->arquivo_path
            ) ||
            !Storage::disk('local')
                ->exists(
                    $recibo->arquivo_path
                )
        ){
            abort(
                404,
                'Documento do recibo verde não encontrado.'
            );
        }

        return $recibo;
    }

    private function filename(
        ReciboVerde $recibo
    ): string {
        $numero=Str::slug(
            $recibo->numero_documento
        );

        if(blank($numero)){
            $numero=substr(
                $recibo->id,
                0,
                8
            );
        }

        return 'recibo-verde-'.
            $numero.
            '.pdf';
    }

    private function findScoped(
        Request $request,
        string $id
    ): ReciboVerde {
        return $this
            ->leituraQuery(
                $request
            )
            ->findOrFail($id);
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId=
            $this->tenantId();

        $user=
            $request->user();

        $query=
            ReciboVerde::query()
                ->where(
                    'tenant_id',
                    $tenantId
                );

        if(
            $this->permissionService
                ->allows(
                    $user,
                    'recibos_verdes',
                    'visualizar',
                    $tenantId
                )
        ){
            return $query;
        }

        if(
            $user->hasRole(
                'motorista',
                $tenantId
            )
        ){
            $motoristaId=
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

            if(!$motoristaId){
                return $query
                    ->whereRaw(
                        '1 = 0'
                    );
            }

            return $query->where(
                'motorista_id',
                $motoristaId
            );
        }

        abort(
            403,
            'Sem permissão suficiente para este recurso.'
        );
    }

    private function relations(): array
    {
        return [
            'motorista:id,nome_completo,nif,email,telemovel,user_id',
            'empresa:id,nome_empresa,nif',
            'createdBy:id,name',
            'validadoPor:id,name',
            'rejeitadoPor:id,name',
        ];
    }

    private function tenantId(): string
    {
        if(
            !$this->tenantContext
                ->hasTenant()
        ){
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
