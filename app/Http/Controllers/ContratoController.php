<?php

namespace App\Http\Controllers;

use App\Http\Requests\EncerrarContratoRequest;
use App\Http\Requests\StoreContratoRequest;
use App\Http\Requests\UpdateContratoRequest;
use App\Models\Contrato;
use App\Models\LogAuditoriaContrato;
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

            /*
             * Os tipos de contrato são agora configuráveis.
             * Não limitar esta validação aos tipos legados.
             */
            'tipo'=>[
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+$/',
            ],
        ]);

        $query=$this->leituraQuery($request)
            ->with([
                'template',
                'tipoContrato',
                'documento',
                'empresa',
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
                'tipoContrato',
                'documento',
                'empresa',
                'motorista',
                'proprietario',
                'veiculo',
                'template.checklistProcessTemplate.items',
                'checklistProcessRun.items',

                'versoes'=>fn($query)=>
                    $query->orderByDesc(
                        'versao_numero'
                    ),

                'assinaturas',

                'logsAuditoria'=>fn($query)=>
                    $query->latest(
                        'created_at'
                    ),
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
            'message'=>
                'Contrato atualizado com sucesso.',

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
                $request->validated(
                    'data_fim'
                ),
                $request->ip()
            );

        return response()->json([
            'message'=>
                'Contrato encerrado com sucesso.',

            'data'=>$contrato,
        ]);
    }

    public function previewRetificado(
        Request $request,
        string $id
    ): BinaryFileResponse {
        /*
         * Consulta apenas um PDF de auditoria
         * existente, pertencente ao contrato
         * do tenant autenticado.
         *
         * Nao emite PDF definitivo.
         * Nao altera contratos nem assinaturas.
         */

        $contrato=$this->leituraQuery($request)
            ->with('documento')
            ->findOrFail($id);

        $fields=(array)$contrato->campos_preenchidos;

        if(
            $contrato->status!=='rascunho' ||
            (int)$contrato->versao_atual<2 ||
            ($fields['FROTAPRO_RETIFICACAO_PENDENTE']??null)!=='v2' ||
            filled($contrato->pdf_gerado_url)
        ){
            abort(404,'Nao existe simulacao disponivel.');
        }

        $code=(string)($contrato->documento?->codigo??'');

        if(!preg_match('/^G[0-9]{6,}$/i',$code)){
            abort(404,'Codigo documental invalido.');
        }

        $folder='preview-audit/retificacoes';

        $prefix=
            strtolower($code).
            '-v'.(int)$contrato->versao_atual.
            '-assinaturas-v1-simulacao-';

        $pattern=
            '~^'.
            preg_quote($folder.'/'.$prefix,'~').
            '[0-9]{8}-[0-9]{6}\.pdf$~';

        $disk=Storage::disk('local');

        $matches=array_values(
            array_filter(
                $disk->files($folder),
                static fn(string $path):bool=>
                    preg_match($pattern,$path)===1
            )
        );

        rsort($matches,SORT_STRING);

        if($matches===[]){
            abort(
                404,
                'O PDF de teste ainda nao foi preparado.'
            );
        }

        $path=$disk->path($matches[0]);

        if(
            !is_file($path) ||
            file_get_contents($path,false,null,0,5)!=='%PDF-'
        ){
            abort(
                404,
                'O PDF de teste nao esta disponivel.'
            );
        }

        return response()->file(
            $path,
            [
                'Content-Type'=>'application/pdf',
                'Content-Disposition'=>
                    'inline; filename="'.
                    strtolower($code).
                    '-documento-de-teste.pdf"',
                'Cache-Control'=>'private, no-store',
                'Pragma'=>'no-cache',
                'X-Content-Type-Options'=>'nosniff',
            ]
        );
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

        $contrato->loadMissing(
            'documento'
        );

        return response()->json([
            'message'=>
                'PDF gerado com sucesso.',

            'data'=>[
                'id'=>
                    $contrato->id,

                'codigo_documento'=>
                    $contrato
                        ->documento
                        ?->codigo,

                'pdf_disponivel'=>
                    filled(
                        $contrato
                            ->pdf_gerado_url
                    ),

                'hash_documento'=>
                    $contrato
                        ->hash_documento,

                'versao'=>
                    $contrato
                        ->versao_atual,
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
            Storage::disk(
                'local'
            )->path(
                $contrato
                    ->pdf_gerado_url
            ),
            [
                'Content-Type'=>
                    'application/pdf',
            ]
        );

        $response
            ->headers
            ->set(
                'Content-Disposition',
                'inline; filename="'.
                $this->pdfFilename(
                    $contrato
                ).
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
            Storage::disk(
                'local'
            )->path(
                $contrato
                    ->pdf_gerado_url
            ),
            $this->pdfFilename(
                $contrato
            ),
            [
                'Content-Type'=>
                    'application/pdf',
            ]
        );
    }

    /*
     * Listar emissoes sem expor caminhos internos.
     * A autorizacao reutiliza o mesmo escopo
     * aplicado a leitura normal de contratos.
     */
    public function pdfHistorico(
        Request $request,
        string $id
    ): JsonResponse {
        $contrato=$this->leituraQuery($request)
            ->findOrFail($id);

        $logs=LogAuditoriaContrato::query()
            ->where('tenant_id',$this->tenantId())
            ->where('contrato_id',$contrato->id)
            ->where('acao','geracao_pdf')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $items=$logs->map(
            static function(LogAuditoriaContrato $log)
                use($contrato):array {
                $details=(array)($log->detalhes??[]);

                return [
                    'id'=>$log->id,
                    'versao'=>
                        isset($details['versao'])
                        ?(int)$details['versao']
                        :null,
                    'hash'=>$details['hash']??null,
                    'atual'=>
                        filled($details['pdf_path']??null) &&
                        (string)$details['pdf_path']===
                            (string)$contrato->pdf_gerado_url &&
                        (string)($details['hash']??'')===
                            (string)$contrato->hash_documento,
                    'motivo_revisao'=>
                        $details['motivo_revisao']??null,
                    'criado_em'=>$log->created_at,
                    'evidencia_completa'=>
                        filled($details['pdf_path']??null) &&
                        filled($details['hash']??null),
                ];
            }
        )->values()->all();

        return response()->json([
            'data'=>$items,
        ]);
    }

    /*
     * Recuperar uma emissao identificada pelo log.
     * Nao aceitar caminhos enviados pelo cliente.
     * Validar tenant, contrato, estrutura do caminho,
     * versao e SHA-256 antes de devolver o ficheiro.
     */
    public function pdfHistoricoEmissao(
        Request $request,
        string $id,
        string $emissaoId
    ): BinaryFileResponse {
        $contrato=$this->leituraQuery($request)
            ->with(['documento','tipoContrato'])
            ->findOrFail($id);

        $log=LogAuditoriaContrato::query()
            ->where('tenant_id',$this->tenantId())
            ->where('contrato_id',$contrato->id)
            ->where('acao','geracao_pdf')
            ->findOrFail($emissaoId);

        $details=(array)($log->detalhes??[]);
        $path=(string)($details['pdf_path']??'');
        $hash=(string)($details['hash']??'');
        $version=$details['versao']??null;

        $prefix=
            'contract-pdfs/'.
            $this->tenantId().'/'.
            $contrato->id.'/';

        if(
            !str_starts_with($path,$prefix) ||
            !preg_match('/^[a-f0-9]{64}$/D',$hash)
        ){
            abort(404,'Emissão histórica sem evidência válida.');
        }

        $filename=substr($path,strlen($prefix));

        if(!preg_match(
            '/^v([1-9][0-9]*)-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.pdf$/D',
            $filename,
            $matches
        )){
            abort(404,'Caminho histórico inválido.');
        }

        if(
            !is_int($version) &&
            !(
                is_string($version) &&
                ctype_digit($version)
            )
        ){
            abort(404,'Versão histórica inválida.');
        }

        if((int)$matches[1] !== (int)$version){
            abort(404,'Versão e ficheiro não correspondem.');
        }

        $disk=Storage::disk('local');

        if(!$disk->exists($path)){
            abort(404,'PDF histórico não encontrado.');
        }

        $absolutePath=$disk->path($path);
        $actualHash=hash_file('sha256',$absolutePath);

        if(
            $actualHash===false ||
            !hash_equals($hash,$actualHash)
        ){
            abort(
                409,
                'A integridade do PDF histórico não foi confirmada.'
            );
        }

        $name=preg_replace(
            '/\.pdf$/',
            '-v'.(int)$version.'-'.
                substr((string)$log->id,0,8).
                '.pdf',
            $this->pdfFilename($contrato)
        );

        return response()->file(
            $absolutePath,
            [
                'Content-Type'=>'application/pdf',
                'Content-Disposition'=>
                    'inline; filename="'.$name.'"',
                'X-Content-Type-Options'=>'nosniff',
            ]
        );
    }
    public function resendRemoteSignature(
        Request $request,
        string $id,
        string $assinaturaId
    ): JsonResponse {
        $assinatura=$this
            ->contratoService
            ->resendRemoteSignature(
                $id,
                $assinaturaId,
                $this->tenantId(),
                $request->user(),
                $request->ip()
            );

        return response()->json([
            'message'=>
                'Solicitação de assinatura reenviada com sucesso.',

            'data'=>[
                'id'=>
                    $assinatura->id,

                'status'=>
                    $assinatura->status,

                'signatario_nome'=>
                    $assinatura
                        ->signatario_nome,

                'signatario_email'=>
                    $assinatura
                        ->signatario_email,

                'solicitado_em'=>
                    $assinatura
                        ->solicitado_em,

                'otp_expira_em'=>
                    $assinatura
                        ->otp_expira_em,
            ],
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): Response {
        $this->contratoService
            ->delete(
                $id,
                $this->tenantId(),
                $request->user(),
                $request->ip()
            );

        return response()
            ->noContent();
    }

    private function pdfContrato(
        Request $request,
        string $id
    ): Contrato {
        $contrato=$this
            ->leituraQuery(
                $request
            )
            ->with([
                'documento',
                'tipoContrato',
            ])
            ->findOrFail(
                $id
            );

        if(
            blank(
                $contrato
                    ->pdf_gerado_url
            ) ||
            !Storage::disk(
                'local'
            )->exists(
                $contrato
                    ->pdf_gerado_url
            )
        ){
            abort(
                404,
                'PDF do contrato ainda não foi gerado.'
            );
        }

        /*
         * FROTAPRO_4N33_7_2
         *
         * O PDF atual so pode ser entregue
         * quando o hash do ficheiro corresponde
         * ao SHA-256 guardado no contrato.
         *
         * Protege tanto a visualizacao inline
         * como o download, porque ambos
         * utilizam este metodo.
         */
        $expectedHash=strtolower(
            trim(
                (string)$contrato->hash_documento
            )
        );

        if(!preg_match(
            '/^[a-f0-9]{64}$/D',
            $expectedHash
        )){
            abort(
                409,
                'O PDF não possui um hash SHA-256 válido para confirmar a sua integridade.'
            );
        }

        $disk=Storage::disk('local');

        $absolutePath=$disk->path(
            (string)$contrato->pdf_gerado_url
        );

        /*
         * Verificar novamente o ficheiro antes
         * de calcular o hash.
         */
        if(
            !is_file($absolutePath) ||
            !is_readable($absolutePath)
        ){
            abort(
                404,
                'O PDF do contrato não está disponível para leitura.'
            );
        }

        /*
         * hash_file processa o ficheiro sem
         * carregar todo o PDF em memoria.
         */
        $actualHash=hash_file(
            'sha256',
            $absolutePath
        );

        if(
            $actualHash===false ||
            !hash_equals(
                $expectedHash,
                $actualHash
            )
        ){
            abort(
                409,
                'A integridade do PDF do contrato não foi confirmada.'
            );
        }
        return $contrato;
    }

    private function pdfFilename(
        Contrato $contrato
    ): string {
        $contrato->loadMissing([
            'documento',
            'tipoContrato',
        ]);

        $codigo=
            $contrato
                ->documento
                ?->codigo
            ?? substr(
                $contrato->id,
                0,
                8
            );

        $tipo=
            $contrato
                ->tipoContrato
                ?->nome
            ?? $contrato->tipo;

        return 'contrato-'.
            Str::slug(
                $tipo
            ).
            '-'.
            Str::lower(
                $codigo
            ).
            '.pdf';
    }

    private function leituraQuery(
        Request $request
    ): Builder {
        $tenantId=
            $this->tenantId();

        $user=
            $request->user();

        $query=Contrato::query()
            ->where(
                'tenant_id',
                $tenantId
            );

        if(
            $this
                ->permissionService
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
                    ->value(
                        'id'
                    );

            if(!$motoristaId){
                $query->whereRaw(
                    '1 = 0'
                );
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
                    ->value(
                        'id'
                    );

            if(!$proprietarioId){
                $query->whereRaw(
                    '1 = 0'
                );
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
        if(
            !$this
                ->tenantContext
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
