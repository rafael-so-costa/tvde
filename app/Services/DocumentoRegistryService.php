<?php

namespace App\Services;

use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\Declaracao;
use App\Models\Documento;
use App\Models\ManutencaoDocumento;
use App\Models\MultaDocumento;
use App\Models\ReciboVerde;
use App\Models\RegistoCriminal;
use App\Models\SinistroDocumento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DocumentoRegistryService
{
    private static ?bool $ready=null;

    public function __construct(
        private DocumentoNumeroService $numeroService
    ) {}

    public function sync(
        Model $model,
        bool $reservarNumeroContrato = false
    ): ?Documento
    {
        if(!$this->ready()){
            return null;
        }

        /*
         * FROTAPRO_4P6_DOCUMENT_NUMBER_GATE
         *
         * Contratos sem PDF definitivo nao recebem
         * automaticamente um novo numero documental.
         *
         * A reserva de um novo numero ocorre apenas
         * mediante autorizacao explicita durante
         * a emissao do PDF.
         *
         * Documentos historicos ja numerados
         * continuam a poder ser sincronizados.
         */

        if (
            $model instanceof Contrato &&
            blank($model->pdf_gerado_url) &&
            !$reservarNumeroContrato
        ) {
            $exists = Documento::query()
                ->where('entidade_tipo','contrato')
                ->where(
                    'entidade_id',
                    (string)$model->getKey()
                )
                ->exists();

            if (!$exists) {
                return null;
            }
        }

        $payload=$this->payload($model);

        if(!$payload){
            return null;
        }

        return DB::transaction(function() use($model,$payload){
            $existing=Documento::query()
                ->where('entidade_tipo',$payload['entidade_tipo'])
                ->where('entidade_id',(string)$model->getKey())
                ->lockForUpdate()
                ->first();

            if($existing){
                $existing->fill($payload);
                $existing->save();

                return $existing;
            }

            $numero=$this->numeroService->next($payload['origem']);

            $documento=new Documento(array_merge($payload,$numero));
            $documento->tenant_id=$payload['tenant_id'];
            $documento->created_by=$payload['created_by']??Auth::id();
            $documento->save();

            return $documento;
        });
    }

    private function payload(Model $model): ?array
    {
        if($model instanceof Contrato){
            return [
                'origem'=>DocumentoNumeroService::ORIGEM_GERADO,
                'tenant_id'=>$model->tenant_id,
                'empresa_id'=>$model->empresa_id,
                'motorista_id'=>$model->motorista_id,
                'proprietario_id'=>$model->proprietario_id,
                'veiculo_id'=>$model->veiculo_id,
                'categoria'=>'contratos',
                'tipo'=>(string)$model->tipo,
                'titulo'=>'Contrato '.str_replace('_',' ',(string)$model->tipo),
                'entidade_tipo'=>'contrato',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->pdf_gerado_url?basename($model->pdf_gerado_url):null,
                'arquivo_path'=>$model->pdf_gerado_url,
                'arquivo_mime'=>$model->pdf_gerado_url?'application/pdf':null,
                'hash_arquivo'=>$model->hash_documento,
                'status'=>$model->status,
                'finalizado_em'=>$model->data_assinatura,
                'metadados'=>[
                    'versao'=>$model->versao_atual,
                    'tipo_contrato_id'=>$model->tipo_contrato_id,
                ],
            ];
        }

        if($model instanceof Declaracao){
            return [
                'origem'=>DocumentoNumeroService::ORIGEM_GERADO,
                'tenant_id'=>$model->tenant_id,
                'empresa_id'=>$model->empresa_id,
                'motorista_id'=>$model->motorista_id,
                'proprietario_id'=>$model->proprietario_id,
                'veiculo_id'=>$model->veiculo_id,
                'categoria'=>'declaracoes',
                'tipo'=>$model->tipo,
                'titulo'=>$model->titulo,
                'entidade_tipo'=>'declaracao',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->pdf_url?basename($model->pdf_url):null,
                'arquivo_path'=>$model->pdf_url,
                'arquivo_mime'=>$model->pdf_url?'application/pdf':null,
                'hash_arquivo'=>$model->hash_documento,
                'status'=>$model->status,
                'created_by'=>$model->created_by,
                'finalizado_em'=>$model->data_emissao,
            ];
        }

        if($model instanceof ChecklistRecord){
            return [
                'origem'=>DocumentoNumeroService::ORIGEM_GERADO,
                'tenant_id'=>$model->tenant_id,
                'motorista_id'=>$model->motorista_id,
                'veiculo_id'=>$model->veiculo_id,
                'categoria'=>'checklists',
                'tipo'=>'checklist_'.$model->tipo,
                'titulo'=>$model->tipo==='recolha'
                    ?'Checklist de recolha'
                    :'Checklist de entrega',
                'entidade_tipo'=>'checklist',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->pdf_url
                    ?basename($model->pdf_url)
                    :null,
                'arquivo_path'=>$model->pdf_url,
                'arquivo_mime'=>$model->pdf_url
                    ?'application/pdf'
                    :null,
                'hash_arquivo'=>$model->hash_documento,
                'status'=>$model->estado,
                'created_by'=>$model->realizado_por,
                'finalizado_em'=>$model->finalizado_em,
                'metadados'=>[
                    'contrato_id'=>$model->contrato_id,
                    'matricula'=>$model->matricula_snapshot,
                    'entrega_vinculada_id'=>$model->entrega_vinculada_id,
                    'entrega_documento_codigo'=>$model->entrega_vinculada_id
                        ?Documento::query()
                            ->where('entidade_tipo','checklist')
                            ->where('entidade_id',$model->entrega_vinculada_id)
                            ->value('codigo')
                        :null,
                ],
            ];
        }

        if($model instanceof RegistoCriminal){
            return [
                'origem'=>DocumentoNumeroService::ORIGEM_ANEXADO,
                'tenant_id'=>$model->tenant_id,
                'motorista_id'=>$model->motorista_id,
                'categoria'=>'motoristas',
                'tipo'=>'registo_criminal',
                'titulo'=>'Registo criminal',
                'entidade_tipo'=>'registo_criminal',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->arquivo_nome,
                'arquivo_path'=>$model->arquivo_path,
                'arquivo_mime'=>$model->arquivo_mime,
                'arquivo_tamanho'=>$model->arquivo_tamanho,
                'hash_arquivo'=>$model->hash_arquivo,
                'status'=>$model->status,
                'created_by'=>$model->enviado_por,
            ];
        }

        if($model instanceof ReciboVerde){
            return [
                'origem'=>DocumentoNumeroService::ORIGEM_ANEXADO,
                'tenant_id'=>$model->tenant_id,
                'empresa_id'=>$model->empresa_id,
                'motorista_id'=>$model->motorista_id,
                'categoria'=>'financeiro',
                'tipo'=>'recibo_verde',
                'titulo'=>'Recibo verde '.$model->numero_documento,
                'entidade_tipo'=>'recibo_verde',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->arquivo_nome,
                'arquivo_path'=>$model->arquivo_path,
                'arquivo_mime'=>$model->arquivo_mime,
                'arquivo_tamanho'=>$model->arquivo_tamanho,
                'hash_arquivo'=>$model->hash_arquivo,
                'status'=>$model->status,
                'created_by'=>$model->created_by,
            ];
        }

        if($model instanceof MultaDocumento){
            $model->loadMissing('multa');

            return [
                'origem'=>DocumentoNumeroService::ORIGEM_ANEXADO,
                'tenant_id'=>$model->tenant_id,
                'motorista_id'=>$model->multa?->motorista_id,
                'veiculo_id'=>$model->multa?->veiculo_id,
                'categoria'=>'multas',
                'tipo'=>$model->tipo,
                'titulo'=>'Documento de multa',
                'entidade_tipo'=>'multa_documento',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->arquivo_nome,
                'arquivo_path'=>$model->arquivo_path,
                'arquivo_mime'=>$model->arquivo_mime,
                'arquivo_tamanho'=>$model->arquivo_tamanho,
                'hash_arquivo'=>$model->hash_arquivo,
                'status'=>'ativo',
                'created_by'=>$model->created_by,
                'metadados'=>['multa_id'=>$model->multa_id],
            ];
        }

        if($model instanceof SinistroDocumento){
            $model->loadMissing('sinistro');

            return [
                'origem'=>DocumentoNumeroService::ORIGEM_ANEXADO,
                'tenant_id'=>$model->tenant_id,
                'motorista_id'=>$model->sinistro?->motorista_id,
                'veiculo_id'=>$model->sinistro?->veiculo_id,
                'categoria'=>'sinistros',
                'tipo'=>$model->tipo,
                'titulo'=>'Documento de sinistro',
                'entidade_tipo'=>'sinistro_documento',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->arquivo_nome,
                'arquivo_path'=>$model->arquivo_path,
                'arquivo_mime'=>$model->arquivo_mime,
                'arquivo_tamanho'=>$model->arquivo_tamanho,
                'hash_arquivo'=>$model->hash_arquivo,
                'status'=>'ativo',
                'created_by'=>$model->created_by,
                'metadados'=>['sinistro_id'=>$model->sinistro_id],
            ];
        }

        if($model instanceof ManutencaoDocumento){
            $model->loadMissing('manutencao');

            return [
                'origem'=>DocumentoNumeroService::ORIGEM_ANEXADO,
                'tenant_id'=>$model->tenant_id,
                'motorista_id'=>$model->manutencao?->motorista_id,
                'veiculo_id'=>$model->manutencao?->veiculo_id,
                'categoria'=>'manutencao',
                'tipo'=>$model->tipo,
                'titulo'=>'Documento de manutenção',
                'entidade_tipo'=>'manutencao_documento',
                'entidade_id'=>$model->id,
                'arquivo_nome'=>$model->arquivo_nome,
                'arquivo_path'=>$model->arquivo_path,
                'arquivo_mime'=>$model->arquivo_mime,
                'arquivo_tamanho'=>$model->arquivo_tamanho,
                'hash_arquivo'=>$model->hash_arquivo,
                'status'=>$model->processamento_status,
                'created_by'=>$model->created_by,
                'metadados'=>['manutencao_id'=>$model->manutencao_id],
            ];
        }

        return null;
    }

    private function ready(): bool
    {
        if(self::$ready!==null){
            return self::$ready;
        }

        return self::$ready=
            Schema::hasTable('document_sequences') &&
            Schema::hasTable('documentos');
    }
}
