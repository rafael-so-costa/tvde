<?php

namespace App\Http\Controllers;

use App\Http\Requests\RejectRegistoCriminalRequest;
use App\Http\Requests\StoreRegistoCriminalRequest;
use App\Models\Motorista;
use App\Models\RegistoCriminal;
use App\Services\PermissionService;
use App\Services\RegistoCriminalService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RegistoCriminalController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private RegistoCriminalService $registoCriminalService
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
            'validade'=>[
                'nullable',
                Rule::in([
                    'valido',
                    'a_expirar',
                    'expirado',
                ]),
            ],
            'motorista_id'=>[
                'nullable',
                'uuid',
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
            ->latest('created_at');

        if(!empty($validated['status'])){
            $query->where(
                'status',
                $validated['status']
            );
        }

        if(!empty($validated['motorista_id'])){
            $query->where(
                'motorista_id',
                $validated['motorista_id']
            );
        }

        if(!empty($validated['validade'])){
            $query->where(
                'status',
                'validado'
            );

            $hoje=today()
                ->toDateString();

            $limite=today()
                ->addDays(30)
                ->toDateString();

            if(
                $validated['validade']===
                'expirado'
            ){
                $query->where(
                    'data_validade',
                    '<',
                    $hoje
                );
            }

            if(
                $validated['validade']===
                'a_expirar'
            ){
                $query->whereBetween(
                    'data_validade',
                    [
                        $hoje,
                        $limite,
                    ]
                );
            }

            if(
                $validated['validade']===
                'valido'
            ){
                $query->where(
                    'data_validade',
                    '>',
                    $limite
                );
            }
        }

        if(!empty($validated['search'])){
            $search=trim(
                $validated['search']
            );

            $query->where(function($query) use($search){
                $query
                    ->where(
                        'codigo_consulta',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhereHas(
                        'motorista',
                        function($query) use($search){
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
            });
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function store(
        StoreRegistoCriminalRequest $request
    ): JsonResponse {
        $data=$request->validated();
        $arquivo=$request->file('arquivo');

        unset($data['arquivo']);

        $registo=$this
            ->registoCriminalService
            ->create(
                $data,
                $arquivo,
                $request->user(),
                $this->tenantId()
            );

        return response()->json([
            'message'=>
                'Registo criminal enviado com sucesso.',
            'data'=>$registo,
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
        $registo=$this
            ->registoCriminalService
            ->approve(
                $id,
                $this->tenantId(),
                $request->user()
            );

        return response()->json([
            'message'=>
                'Registo criminal validado com sucesso.',
            'data'=>$registo,
        ]);
    }

    public function reject(
        RejectRegistoCriminalRequest $request,
        string $id
    ): JsonResponse {
        $registo=$this
            ->registoCriminalService
            ->reject(
                $id,
                $this->tenantId(),
                $request->user(),
                $request->validated('motivo')
            );

        return response()->json([
            'message'=>
                'Registo criminal rejeitado.',
            'data'=>$registo,
        ]);
    }

    public function arquivo(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $registo=$this
            ->arquivoRegisto(
                $request,
                $id
            );

        $response=response()->file(
            Storage::disk('local')
                ->path(
                    $registo->arquivo_path
                ),
            [
                'Content-Type'=>
                    $registo->arquivo_mime,
            ]
        );

        $response->headers->set(
            'Content-Disposition',
            'inline; filename="'.
            $this->filename($registo).
            '"'
        );

        return $response;
    }

    public function downloadArquivo(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $registo=$this
            ->arquivoRegisto(
                $request,
                $id
            );

        return response()->download(
            Storage::disk('local')
                ->path(
                    $registo->arquivo_path
                ),
            $this->filename($registo),
            [
                'Content-Type'=>
                    $registo->arquivo_mime,
            ]
        );
    }

    private function arquivoRegisto(
        Request $request,
        string $id
    ): RegistoCriminal {
        $registo=$this
            ->findScoped(
                $request,
                $id
            )
            ->load(
                'motorista:id,nome_completo'
            );

        if(
            blank($registo->arquivo_path) ||
            !Storage::disk('local')
                ->exists(
                    $registo->arquivo_path
                )
        ){
            abort(
                404,
                'Documento do registo criminal não encontrado.'
            );
        }

        return $registo;
    }

    private function filename(
        RegistoCriminal $registo
    ): string {
        $extension=pathinfo(
            $registo->arquivo_path,
            PATHINFO_EXTENSION
        );

        $motorista=
            $registo->motorista
                ?->nome_completo ??
            'motorista';

        return 'registo-criminal-'.
            Str::slug($motorista).
            '-'.
            substr(
                $registo->id,
                0,
                8
            ).
            '.'.
            $extension;
    }

    private function findScoped(
        Request $request,
        string $id
    ): RegistoCriminal {
        return $this
            ->leituraQuery($request)
            ->findOrFail($id);
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId=$this->tenantId();
        $user=$request->user();

        $query=RegistoCriminal::query()
            ->where(
                'tenant_id',
                $tenantId
            );

        if(
            $this->permissionService
                ->allows(
                    $user,
                    'registos_criminais',
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

            if(!$motoristaId){
                return $query
                    ->whereRaw('1 = 0');
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
            'motorista:id,nome_completo,nif,email,telemovel,registo_criminal_valid_until,user_id',
            'enviadoPor:id,name',
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
