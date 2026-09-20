<?php

namespace App\Services;

use App\Models\Declaracao;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class DeclaracaoService
{
    public function create(
        array $data,
        string $tenantId,
        User $actor
    ): Declaracao {
        $declaracao=new Declaracao($data);
        $declaracao->tenant_id=$tenantId;
        $declaracao->status='rascunho';
        $declaracao->created_by=$actor->id;

        $this->validateRequiredEntities($declaracao);

        $declaracao->save();

        return $this->load($declaracao);
    }

    public function update(
        string $id,
        array $data,
        string $tenantId
    ): Declaracao {
        return DB::transaction(function() use(
            $id,
            $data,
            $tenantId
        ){
            $declaracao=Declaracao::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if($declaracao->status!=='rascunho'){
                throw ValidationException::withMessages([
                    'declaracao'=>'Apenas declarações em rascunho podem ser alteradas.',
                ]);
            }

            $declaracao->fill($data);

            $this->validateRequiredEntities($declaracao);

            $declaracao->save();

            return $this->load($declaracao);
        });
    }

    public function issue(
        string $id,
        string $tenantId,
        User $actor
    ): Declaracao {
        $declaracao=Declaracao::query()
            ->where('tenant_id',$tenantId)
            ->with($this->relations())
            ->findOrFail($id);

        if($declaracao->status!=='rascunho'){
            throw ValidationException::withMessages([
                'declaracao'=>'Apenas declarações em rascunho podem ser emitidas.',
            ]);
        }

        $this->validateRequiredEntities($declaracao);

        $sourceHash=$this->sourceHash($declaracao);

        $pdf=Pdf::loadView('pdf.declaracao',[
            'declaracao'=>$declaracao,
            'generatedAt'=>now(),
        ])
            ->setPaper('a4','portrait')
            ->setOptions([
                'isRemoteEnabled'=>false,
                'isPhpEnabled'=>false,
                'defaultFont'=>'DejaVu Sans',
            ]);

        $binary=$pdf->output();

        if(
            $binary==='' ||
            !str_starts_with($binary,'%PDF-')
        ){
            throw new RuntimeException(
                'Não foi possível gerar um PDF válido.'
            );
        }

        $path=
            'declaration-pdfs/'.
            $tenantId.'/'.
            $declaracao->id.'/'.
            Str::uuid()->toString().
            '.pdf';

        if(!Storage::disk('local')->put($path,$binary)){
            throw new RuntimeException(
                'Não foi possível guardar o PDF da declaração.'
            );
        }

        $hash=hash('sha256',$binary);

        try{
            DB::transaction(function() use(
                $id,
                $tenantId,
                $actor,
                $path,
                $hash,
                $sourceHash
            ){
                $locked=Declaracao::query()
                    ->where('tenant_id',$tenantId)
                    ->whereKey($id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if($locked->status!=='rascunho'){
                    throw ValidationException::withMessages([
                        'declaracao'=>'A declaração já não está disponível para emissão.',
                    ]);
                }

                if(
                    !hash_equals(
                        $sourceHash,
                        $this->sourceHash($locked)
                    )
                ){
                    throw ValidationException::withMessages([
                        'declaracao'=>'A declaração foi alterada durante a emissão. Tente novamente.',
                    ]);
                }

                $locked->status='emitida';
                $locked->data_emissao=now();
                $locked->pdf_url=$path;
                $locked->hash_documento=$hash;
                $locked->emitted_by=$actor->id;
                $locked->save();
            });
        }catch(Throwable $exception){
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return Declaracao::query()
            ->where('tenant_id',$tenantId)
            ->with($this->relations())
            ->findOrFail($id);
    }

    public function delete(
        string $id,
        string $tenantId
    ): void {
        DB::transaction(function() use(
            $id,
            $tenantId
        ){
            $declaracao=Declaracao::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if($declaracao->status!=='rascunho'){
                throw ValidationException::withMessages([
                    'declaracao'=>'Apenas declarações em rascunho podem ser eliminadas.',
                ]);
            }

            $declaracao->delete();
        });
    }

    private function validateRequiredEntities(
        Declaracao $declaracao
    ): void {
        if(
            in_array(
                $declaracao->tipo,
                [
                    'vinculo_motorista',
                    'atividade_tvde',
                ],
                true
            ) &&
            !$declaracao->motorista_id
        ){
            throw ValidationException::withMessages([
                'motorista_id'=>'Selecione um motorista para este tipo de declaração.',
            ]);
        }

        if(
            $declaracao->tipo==='utilizacao_veiculo' &&
            !$declaracao->veiculo_id
        ){
            throw ValidationException::withMessages([
                'veiculo_id'=>'Selecione um veículo para este tipo de declaração.',
            ]);
        }
    }

    private function sourceHash(
        Declaracao $declaracao
    ): string {
        return hash(
            'sha256',
            json_encode([
                $declaracao->tipo,
                $declaracao->titulo,
                $declaracao->destinatario,
                $declaracao->conteudo,
                $declaracao->observacoes,
                $declaracao->empresa_id,
                $declaracao->motorista_id,
                $declaracao->proprietario_id,
                $declaracao->veiculo_id,
            ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)
        );
    }

    private function load(
        Declaracao $declaracao
    ): Declaracao {
        return $declaracao->load(
            $this->relations()
        );
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
}
