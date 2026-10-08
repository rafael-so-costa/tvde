<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\DocumentoIndexRequest;
use App\Models\Documento;
use App\Models\DocumentoAcesso;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BackofficeDocumentoController extends Controller
{
    public function index(
        DocumentoIndexRequest $request
    ): JsonResponse {
        $query=$this->baseQuery();
        $filters=$request->validated();

        foreach([
            'tenant_id',
            'origem',
            'categoria',
            'tipo',
            'status',
            'empresa_id',
            'motorista_id',
            'proprietario_id',
            'veiculo_id',
        ] as $field){
            if(filled($filters[$field]??null)){
                $query->where($field,$filters[$field]);
            }
        }

        if(filled($filters['codigo']??null)){
            $query->where(
                'codigo',
                mb_strtoupper(trim($filters['codigo']))
            );
        }

        if(filled($filters['q']??null)){
            $term='%'.trim($filters['q']).'%';

            $query->where(function($query) use($term){
                $query
                    ->where('codigo','like',$term)
                    ->orWhere('titulo','like',$term)
                    ->orWhere('arquivo_nome','like',$term)
                    ->orWhereHas('tenant',fn($query)=>$query->where('nome','like',$term))
                    ->orWhereHas('motorista',fn($query)=>$query->where('nome_completo','like',$term))
                    ->orWhereHas('veiculo',fn($query)=>$query->where('matricula','like',$term));
            });
        }

        if(!empty($filters['data_inicio'])){
            $query->whereDate('created_at','>=',$filters['data_inicio']);
        }

        if(!empty($filters['data_fim'])){
            $query->whereDate('created_at','<=',$filters['data_fim']);
        }

        return response()->json(
            $query
                ->latest('created_at')
                ->paginate(
                    (int)$request->input('per_page',25)
                )
                ->withQueryString()
        );
    }

    public function show(
        Request $request,
        string $identifier
    ): JsonResponse {
        $documento=$this->find($identifier);

        $this->audit($request,$documento,'visualizar_metadados');

        return response()->json([
            'data'=>$documento,
        ]);
    }

    public function file(
        Request $request,
        string $identifier
    ){
        $documento=$this->find($identifier);
        $this->ensureFile($documento);
        $this->audit($request,$documento,'visualizar_arquivo');

        return Storage::disk('local')->response(
            $documento->arquivo_path,
            $documento->arquivo_nome?:basename($documento->arquivo_path),
            ['Content-Disposition'=>'inline']
        );
    }

    public function download(
        Request $request,
        string $identifier
    ){
        $documento=$this->find($identifier);
        $this->ensureFile($documento);
        $this->audit($request,$documento,'download');

        return Storage::disk('local')->download(
            $documento->arquivo_path,
            $documento->arquivo_nome?:basename($documento->arquivo_path)
        );
    }

    private function baseQuery(): Builder
    {
        return Documento::query()->with([
            'tenant:id,nome,slug',
            'empresa:id,nome_empresa',
            'motorista:id,nome_completo',
            'proprietario:id,nome_completo,nome_empresa',
            'veiculo:id,matricula,marca,modelo',
            'criador:id,name',
        ]);
    }

    private function find(string $identifier): Documento
    {
        return $this->baseQuery()
            ->where(function($query) use($identifier){
                $query
                    ->whereKey($identifier)
                    ->orWhere('codigo',mb_strtoupper(trim($identifier)));
            })
            ->firstOrFail();
    }

    private function ensureFile(Documento $documento): void
    {
        if(
            !$documento->arquivo_path ||
            !Storage::disk('local')->exists($documento->arquivo_path)
        ){
            abort(404,'Arquivo não encontrado.');
        }
    }

    private function audit(
        Request $request,
        Documento $documento,
        string $acao
    ): void {
        DocumentoAcesso::create([
            'documento_id'=>$documento->id,
            'user_id'=>$request->user()?->id,
            'contexto'=>'backoffice',
            'acao'=>$acao,
            'ip_address'=>$request->ip(),
            'user_agent'=>$request->userAgent(),
        ]);
    }
}
