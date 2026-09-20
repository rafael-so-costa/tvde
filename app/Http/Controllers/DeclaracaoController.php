<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDeclaracaoRequest;
use App\Http\Requests\UpdateDeclaracaoRequest;
use App\Models\Declaracao;
use App\Services\DeclaracaoService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DeclaracaoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private DeclaracaoService $declaracaoService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated=$request->validate([
            'status'=>[
                'nullable',
                Rule::in([
                    'rascunho',
                    'emitida',
                ]),
            ],
            'tipo'=>[
                'nullable',
                Rule::in([
                    'vinculo_motorista',
                    'utilizacao_veiculo',
                    'atividade_tvde',
                    'livre',
                ]),
            ],
            'search'=>[
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $query=Declaracao::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->with($this->relations())
            ->latest('updated_at');

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

        if(!empty($validated['search'])){
            $search=trim(
                $validated['search']
            );

            $query->where(function($query) use($search){
                $query
                    ->where(
                        'titulo',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'destinatario',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhereHas(
                        'motorista',
                        fn($query)=>
                            $query->where(
                                'nome_completo',
                                'like',
                                "%{$search}%"
                            )
                    )
                    ->orWhereHas(
                        'veiculo',
                        fn($query)=>
                            $query->where(
                                'matricula',
                                'like',
                                "%{$search}%"
                            )
                    );
            });
        }

        return response()->json([
            'data'=>$query->get(),
        ]);
    }

    public function store(
        StoreDeclaracaoRequest $request
    ): JsonResponse {
        $declaracao=$this
            ->declaracaoService
            ->create(
                $request->validated(),
                $this->tenantId(),
                $request->user()
            );

        return response()->json([
            'message'=>'Declaração criada com sucesso.',
            'data'=>$declaracao,
        ],201);
    }

    public function show(
        string $id
    ): JsonResponse {
        return response()->json([
            'data'=>$this->find($id)
                ->load(
                    $this->relations()
                ),
        ]);
    }

    public function update(
        UpdateDeclaracaoRequest $request,
        string $id
    ): JsonResponse {
        $declaracao=$this
            ->declaracaoService
            ->update(
                $id,
                $request->validated(),
                $this->tenantId()
            );

        return response()->json([
            'message'=>'Declaração atualizada com sucesso.',
            'data'=>$declaracao,
        ]);
    }

    public function issue(
        Request $request,
        string $id
    ): JsonResponse {
        $declaracao=$this
            ->declaracaoService
            ->issue(
                $id,
                $this->tenantId(),
                $request->user()
            );

        return response()->json([
            'message'=>'Declaração emitida com sucesso.',
            'data'=>$declaracao,
        ]);
    }

    public function pdf(
        string $id
    ): BinaryFileResponse {
        $declaracao=$this
            ->pdfDeclaracao($id);

        $response=response()->file(
            Storage::disk('local')
                ->path(
                    $declaracao->pdf_url
                ),
            [
                'Content-Type'=>'application/pdf',
            ]
        );

        $response->headers->set(
            'Content-Disposition',
            'inline; filename="'.
            $this->filename($declaracao).
            '"'
        );

        return $response;
    }

    public function downloadPdf(
        string $id
    ): BinaryFileResponse {
        $declaracao=$this
            ->pdfDeclaracao($id);

        return response()->download(
            Storage::disk('local')
                ->path(
                    $declaracao->pdf_url
                ),
            $this->filename($declaracao),
            [
                'Content-Type'=>'application/pdf',
            ]
        );
    }

    public function destroy(
        string $id
    ): Response {
        $this->declaracaoService
            ->delete(
                $id,
                $this->tenantId()
            );

        return response()->noContent();
    }

    private function find(
        string $id
    ): Declaracao {
        return Declaracao::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail($id);
    }

    private function pdfDeclaracao(
        string $id
    ): Declaracao {
        $declaracao=$this->find($id);

        if(
            blank($declaracao->pdf_url) ||
            !Storage::disk('local')
                ->exists(
                    $declaracao->pdf_url
                )
        ){
            abort(
                404,
                'PDF da declaração ainda não foi emitido.'
            );
        }

        return $declaracao;
    }

    private function filename(
        Declaracao $declaracao
    ): string {
        return 'declaracao-'.
            Str::slug(
                $declaracao->titulo
            ).
            '-'.
            substr(
                $declaracao->id,
                0,
                8
            ).
            '.pdf';
    }

    private function relations(): array
    {
        return [
            'empresa:id,nome_empresa,nif,email,telemovel,nome_gerente',
            'motorista:id,nome_completo,nif,email,telemovel,certificado_tvde',
            'proprietario:id,tipo,nome_completo,nome_empresa,nif,email,telemovel',
            'veiculo:id,matricula,marca,modelo,proprietario_id',
            'criador:id,name',
            'emissor:id,name',
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
