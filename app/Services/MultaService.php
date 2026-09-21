<?php

namespace App\Services;

use App\Models\Motorista;
use App\Models\Multa;
use App\Models\MultaDocumento;
use App\Models\User;
use App\Models\Veiculo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class MultaService
{
    public function __construct(private PermissionService $permissionService){}

    public function create(array $data,User $actor,string $tenantId): Multa
    {
        $this->assertCanConfigure($actor,$tenantId);

        $veiculo=$this->resolveVeiculo($data['veiculo_id'],$tenantId);
        $motorista=$this->resolveMotorista($data['motorista_id'] ?? null,$tenantId);

        return DB::transaction(function() use($data,$actor,$tenantId,$veiculo,$motorista){
            $multa=new Multa([
                'veiculo_id'=>$veiculo->id,
                'motorista_id'=>$motorista?->id,
                'numero_notificacao'=>$this->nullableTrim($data['numero_notificacao'] ?? null),
                'data_multa'=>$data['data_multa'],
                'tipo'=>$data['tipo'],
                'valor'=>round((float)$data['valor'],2),
                'status'=>$data['status'],
                'localizacao'=>$this->nullableTrim($data['localizacao'] ?? null),
                'descricao'=>$this->nullableTrim($data['descricao'] ?? null),
            ]);

            $multa->tenant_id=$tenantId;
            $multa->created_by=$actor->id;
            $multa->updated_by=$actor->id;
            $multa->save();

            return $this->load($multa);
        });
    }

    public function update(string $id,array $data,User $actor,string $tenantId): Multa
    {
        $this->assertCanConfigure($actor,$tenantId);

        return DB::transaction(function() use($id,$data,$actor,$tenantId){
            $multa=Multa::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if(array_key_exists('veiculo_id',$data)){
                $multa->veiculo_id=$this
                    ->resolveVeiculo($data['veiculo_id'],$tenantId)
                    ->id;
            }

            if(array_key_exists('motorista_id',$data)){
                $multa->motorista_id=$this
                    ->resolveMotorista($data['motorista_id'] ?? null,$tenantId)
                    ?->id;
            }

            foreach([
                'numero_notificacao',
                'data_multa',
                'tipo',
                'status',
                'localizacao',
                'descricao',
            ] as $field){
                if(!array_key_exists($field,$data)){
                    continue;
                }

                $multa->{$field}=in_array($field,[
                    'numero_notificacao',
                    'localizacao',
                    'descricao',
                ],true)
                    ? $this->nullableTrim($data[$field])
                    : $data[$field];
            }

            if(array_key_exists('valor',$data)){
                $multa->valor=round((float)$data['valor'],2);
            }

            $multa->updated_by=$actor->id;
            $multa->save();

            return $this->load($multa);
        });
    }

    public function delete(string $id,User $actor,string $tenantId): void
    {
        $this->assertCanConfigure($actor,$tenantId);

        $multa=Multa::query()
            ->where('tenant_id',$tenantId)
            ->with('documentos')
            ->findOrFail($id);

        DB::transaction(function() use($multa){
            $paths=$multa->documentos
                ->pluck('arquivo_path')
                ->filter()
                ->values()
                ->all();

            $multa->delete();

            foreach($paths as $path){
                Storage::disk('local')->delete($path);
            }
        });
    }

    public function addDocument(
        string $multaId,
        string $tipo,
        UploadedFile $arquivo,
        User $actor,
        string $tenantId
    ): MultaDocumento {
        $this->assertCanConfigure($actor,$tenantId);

        $multa=Multa::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($multaId);

        $extension=strtolower(
            $arquivo->getClientOriginalExtension() ?: 'bin'
        );

        $directory="multas/{$tenantId}/{$multa->id}";
        $filename=Str::uuid()->toString().'.'.$extension;

        $path=$arquivo->storeAs(
            $directory,
            $filename,
            'local'
        );

        if(!$path){
            throw new RuntimeException(
                'Não foi possível guardar o documento da multa.'
            );
        }

        $absolutePath=Storage::disk('local')->path($path);
        $hash=hash_file('sha256',$absolutePath);

        if(!$hash){
            Storage::disk('local')->delete($path);

            throw new RuntimeException(
                'Não foi possível calcular a integridade do documento.'
            );
        }

        try{
            return DB::transaction(function() use(
                $multa,
                $tipo,
                $arquivo,
                $actor,
                $tenantId,
                $path,
                $hash
            ){
                $documento=new MultaDocumento([
                    'tipo'=>$tipo,
                ]);

                $documento->tenant_id=$tenantId;
                $documento->multa_id=$multa->id;
                $documento->arquivo_nome=$arquivo->getClientOriginalName();
                $documento->arquivo_path=$path;
                $documento->arquivo_mime=
                    $arquivo->getMimeType()
                    ?? $arquivo->getClientMimeType()
                    ?? 'application/octet-stream';
                $documento->arquivo_tamanho=$arquivo->getSize();
                $documento->hash_arquivo=$hash;
                $documento->created_by=$actor->id;
                $documento->save();

                return $documento->load('createdBy:id,name');
            });
        }catch(Throwable $exception){
            Storage::disk('local')->delete($path);
            throw $exception;
        }
    }

    public function deleteDocument(
        string $multaId,
        string $documentoId,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure($actor,$tenantId);

        $documento=MultaDocumento::query()
            ->where('tenant_id',$tenantId)
            ->where('multa_id',$multaId)
            ->findOrFail($documentoId);

        $path=$documento->arquivo_path;

        $documento->delete();

        if($path){
            Storage::disk('local')->delete($path);
        }
    }

    private function resolveVeiculo(string $id,string $tenantId): Veiculo
    {
        $veiculo=Veiculo::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$veiculo){
            throw ValidationException::withMessages([
                'veiculo_id'=>'O veículo selecionado não pertence a esta organização.',
            ]);
        }

        return $veiculo;
    }

    private function resolveMotorista(?string $id,string $tenantId): ?Motorista
    {
        if(blank($id)){
            return null;
        }

        $motorista=Motorista::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$motorista){
            throw ValidationException::withMessages([
                'motorista_id'=>'O motorista selecionado não pertence a esta organização.',
            ]);
        }

        return $motorista;
    }

    private function assertCanConfigure(User $actor,string $tenantId): void
    {
        if(!$this->permissionService->allows(
            $actor,
            'multas',
            'configurar',
            $tenantId
        )){
            abort(403,'Sem permissão suficiente para gerir multas.');
        }
    }

    private function nullableTrim(?string $value): ?string
    {
        return blank($value) ? null : trim($value);
    }

    private function load(Multa $multa): Multa
    {
        return $multa->load([
            'veiculo:id,proprietario_id,matricula,marca,modelo',
            'motorista:id,nome_completo,nif,email,user_id',
            'documentos',
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);
    }
}
