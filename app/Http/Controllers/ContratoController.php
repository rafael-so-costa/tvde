<?php

namespace App\Http\Controllers;

use App\Http\Requests\EncerrarContratoRequest;
use App\Http\Requests\StoreContratoRequest;
use App\Http\Requests\UpdateContratoRequest;
use App\Models\Contrato;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Services\ContratoPdfService;
use App\Services\ContratoService;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ContratoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ContratoService $contratoService,
        private PermissionService $permissionService,
        private ContratoPdfService $contratoPdfService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'status'=>[
                'nullable',
                Rule::in([
                    'rascunho',
                    'enviado',
                    'assinado',
                    'cancelado',
                    'renovado',
                    'expirado',
                    'encerrado',
                ]),
            ],
            'tipo'=>[
                'nullable',
                Rule::in([
                    'prestacao_servico',
                    'aluguer',
                    'checklist_entrega',
                    'checklist_devolucao',
                ]),
            ],
        ]);

        $query=$this->leituraQuery($request)
            ->with([
                'template',
                'motorista',
                'proprietario',
                'veiculo',
                'template.checklistProcessTemplate',
                'checklistProcessRun.items',
            ])
            ->latest('created_at');

        if(!empty($validated['status'])){
            $query->where(
                'status',
                $validated['status']
            );
        }

        if(!empty($validated['tipo'])){
            $query->where(
                'tipo',
                $validated['tipo']
            );
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function store(
        StoreContratoRequest $request
    ): JsonResponse {
        $contrato=$this->contratoService
            ->create(
                $request->validated(),
                $request->user(),
                $this->tenantId(),
                $request->ip(),
                $request->userAgent()
            );

        return response()->json([
            'message'=>'Contrato criado com sucesso.',
            'data'=>$contrato,
        ],201);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        $contrato=$this->leituraQuery($request)
            ->with([
                'template',
                'motorista',
                'proprietario',
                'veiculo',
                'template.checklistProcessTemplate.items',
                'checklistProcessRun.items',
                'versoes'=>fn($query)=>
                    $query->orderByDesc('versao_numero'),
                'assinaturas',
                'logsAuditoria'=>fn($query)=>
                    $query->latest('created_at'),
            ])
            ->findOrFail($id);

        return response()->json([
            'data'=>$contrato,
        ]);
    }

    public function update(
        UpdateContratoRequest $request,
        string $id
    ): JsonResponse {
        $contrato=$this->contratoService
            ->updateDraft(
                $id,
                $this->tenantId(),
                $request->validated(),
                $request->user(),
                $request->ip()
            );

        return response()->json([
            'message'=>'Contrato atualizado com sucesso.',
            'data'=>$contrato,
        ]);
    }

    public function encerrar(
        EncerrarContratoRequest $request,
        string $id
    ): JsonResponse {
        $contrato=$this->contratoService
            ->encerrar(
                $id,
                $this->tenantId(),
                $request->user(),
                $request->validated('data_fim'),
                $request->ip()
            );

        return response()->json([
            'message'=>'Contrato encerrado com sucesso.',
            'data'=>$contrato,
        ]);
    }

    public function generatePdf(
        Request $request,
        string $id
    ): JsonResponse {
        $contrato=$this->contratoPdfService
            ->generate(
                $id,
                $this->tenantId(),
                $request->user(),
                $request->ip()
            );

        return response()->json([
            'message'=>'PDF gerado com sucesso.',
            'data'=>[
                'id'=>$contrato->id,
                'pdf_disponivel'=>
                    filled($contrato->pdf_gerado_url),
                'hash_documento'=>
                    $contrato->hash_documento,
                'versao'=>
                    $contrato->versao_atual,
            ],
        ]);
    }

    public function pdf(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $contrato=$this->pdfContrato(
            $request,
            $id
        );

        $response=response()->file(
            Storage::disk('local')
                ->path($contrato->pdf_gerado_url),
            [
                'Content-Type'=>'application/pdf',
            ]
        );

        $response->headers->set(
            'Content-Disposition',
            'inline; filename="'.
            $this->pdfFilename($contrato).
            '"'
        );

        return $response;
    }

    public function downloadPdf(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $contrato=$this->pdfContrato(
            $request,
            $id
        );

        return response()->download(
            Storage::disk('local')
                ->path($contrato->pdf_gerado_url),
            $this->pdfFilename($contrato),
            [
                'Content-Type'=>'application/pdf',
            ]
        );
    }

    public function resendRemoteSignature(
        Request $request,
        string $id,
        string $assinaturaId
    ): JsonResponse {
        $assinatura=$this->contratoService
            ->resendRemoteSignature(
                $id,
                $assinaturaId,
                $this->tenantId(),
                $request->user(),
                $request->ip()
            );

        return response()->json([
            'message'=>'Solicitação de assinatura reenviada com sucesso.',
            'data'=>[
                'id'=>$assinatura->id,
                'status'=>$assinatura->status,
                'signatario_nome'=>
                    $assinatura->signatario_nome,
                'signatario_email'=>
                    $assinatura->signatario_email,
                'solicitado_em'=>
                    $assinatura->solicitado_em,
                'otp_expira_em'=>
                    $assinatura->otp_expira_em,
            ],
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): Response {
        $this->contratoService->delete(
            $id,
            $this->tenantId(),
            $request->user(),
            $request->ip()
        );

        return response()->noContent();
    }

    private function pdfContrato(
        Request $request,
        string $id
    ): Contrato {
        $contrato=$this->leituraQuery($request)
            ->findOrFail($id);

        if(
            blank($contrato->pdf_gerado_url) ||
            !Storage::disk('local')
                ->exists($contrato->pdf_gerado_url)
        ){
            abort(
                404,
                'PDF do contrato ainda não foi gerado.'
            );
        }

        return $contrato;
    }

    private function pdfFilename(
        Contrato $contrato
    ): string {
        return 'contrato-'.
            Str::slug($contrato->tipo).
            '-'.
            substr($contrato->id,0,8).
            '.pdf';
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId=$this->tenantId();
        $user=$request->user();

        $query=Contrato::query()
            ->where('tenant_id',$tenantId);

        if(
            $this->permissionService
                ->allows(
                    $user,
                    'contratos',
                    'visualizar',
                    $tenantId
                )
        ){
            return $query;
        }

        $temEscopoProprio=false;

        if(
            $user->hasRole(
                'motorista',
                $tenantId
            )
        ){
            $temEscopoProprio=true;

            $motoristaId=Motorista::query()
                ->where('tenant_id',$tenantId)
                ->where('user_id',$user->id)
                ->value('id');

            if(!$motoristaId){
                $query->whereRaw('1 = 0');
            }else{
                $query->where(
                    'motorista_id',
                    $motoristaId
                );
            }
        }

        if(
            $user->hasRole(
                'proprietario',
                $tenantId
            )
        ){
            $temEscopoProprio=true;

            $proprietarioId=Proprietario::query()
                ->where('tenant_id',$tenantId)
                ->where('user_id',$user->id)
                ->value('id');

            if(!$proprietarioId){
                $query->whereRaw('1 = 0');
            }else{
                $query->where(
                    'proprietario_id',
                    $proprietarioId
                );
            }
        }

        if(!$temEscopoProprio){
            abort(
                403,
                'Sem permissão suficiente para este recurso.'
            );
        }

        return $query;
    }

    private function tenantId(): string
    {
        if(!$this->tenantContext->hasTenant()){
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this->tenantContext
            ->requireId();
    }
}
