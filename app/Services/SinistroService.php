<?php

namespace App\Services;

use App\Models\Motorista;
use App\Models\Sinistro;
use App\Models\SinistroDocumento;
use App\Models\User;
use App\Models\Veiculo;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class SinistroService
{
    public function __construct(private PermissionService $permissionService){}

    public function create(array $data,User $actor,string $tenantId): Sinistro
    {
        $this->assertCanConfigure($actor,$tenantId);

        $veiculo=$this->resolveVeiculo(
            $data['veiculo_id'],
            $tenantId
        );

        $motorista=$this->resolveMotorista(
            $data['motorista_id'] ?? null,
            $tenantId
        );

        $this->assertDates(
            $data['data_sinistro'],
            $data['data_peritagem'] ?? null
        );

        return DB::transaction(function() use(
            $data,
            $actor,
            $tenantId,
            $veiculo,
            $motorista
        ){
            $teveTestemunha=(bool)$data['teve_testemunha'];

            $sinistro=new Sinistro([
                'veiculo_id'=>$veiculo->id,
                'motorista_id'=>$motorista?->id,
                'data_sinistro'=>$data['data_sinistro'],
                'status'=>$data['status'],
                'data_peritagem'=>$data['data_peritagem'] ?? null,
                'peritagem_realizada'=>
                    (bool)$data['peritagem_realizada'],
                'seguradora'=>$this->nullableTrim(
                    $data['seguradora'] ?? null
                ),
                'apolice'=>$this->nullableTrim(
                    $data['apolice'] ?? null
                ),
                'numero_processo'=>$this->nullableTrim(
                    $data['numero_processo'] ?? null
                ),
                'itens_danificados'=>$this->normalizeItems(
                    $data['itens_danificados'] ?? []
                ),
                'descricao'=>$this->nullableTrim(
                    $data['descricao'] ?? null
                ),
                'teve_testemunha'=>$teveTestemunha,
                'nome_testemunha'=>$teveTestemunha
                    ? $this->nullableTrim(
                        $data['nome_testemunha'] ?? null
                    )
                    : null,
                'telemovel_testemunha'=>$teveTestemunha
                    ? $this->nullableTrim(
                        $data['telemovel_testemunha'] ?? null
                    )
                    : null,
            ]);

            $sinistro->tenant_id=$tenantId;
            $sinistro->created_by=$actor->id;
            $sinistro->updated_by=$actor->id;
            $sinistro->save();

            return $this->load($sinistro);
        });
    }

    public function update(
        string $id,
        array $data,
        User $actor,
        string $tenantId
    ): Sinistro {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $id,
            $data,
            $actor,
            $tenantId
        ){
            $sinistro=Sinistro::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if(array_key_exists('veiculo_id',$data)){
                $sinistro->veiculo_id=$this
                    ->resolveVeiculo(
                        $data['veiculo_id'],
                        $tenantId
                    )
                    ->id;
            }

            if(array_key_exists('motorista_id',$data)){
                $sinistro->motorista_id=$this
                    ->resolveMotorista(
                        $data['motorista_id'] ?? null,
                        $tenantId
                    )
                    ?->id;
            }

            $dataSinistro=
                $data['data_sinistro']
                ?? $sinistro->data_sinistro?->toDateString();

            $dataPeritagem=array_key_exists(
                'data_peritagem',
                $data
            )
                ? $data['data_peritagem']
                : $sinistro->data_peritagem?->toDateString();

            $this->assertDates(
                $dataSinistro,
                $dataPeritagem
            );

            if(array_key_exists('data_sinistro',$data)){
                $sinistro->data_sinistro=
                    $data['data_sinistro'];
            }

            if(array_key_exists('status',$data)){
                $sinistro->status=$data['status'];
            }

            if(array_key_exists('data_peritagem',$data)){
                $sinistro->data_peritagem=
                    $data['data_peritagem'];
            }

            if(array_key_exists(
                'peritagem_realizada',
                $data
            )){
                $sinistro->peritagem_realizada=
                    (bool)$data['peritagem_realizada'];
            }

            foreach([
                'seguradora',
                'apolice',
                'numero_processo',
                'descricao',
            ] as $field){
                if(array_key_exists($field,$data)){
                    $sinistro->{$field}=
                        $this->nullableTrim(
                            $data[$field]
                        );
                }
            }

            if(array_key_exists(
                'itens_danificados',
                $data
            )){
                $sinistro->itens_danificados=
                    $this->normalizeItems(
                        $data['itens_danificados'] ?? []
                    );
            }

            if(array_key_exists(
                'teve_testemunha',
                $data
            )){
                $sinistro->teve_testemunha=
                    (bool)$data['teve_testemunha'];

                if(!$sinistro->teve_testemunha){
                    $sinistro->nome_testemunha=null;
                    $sinistro->telemovel_testemunha=null;
                }
            }

            if($sinistro->teve_testemunha){
                if(array_key_exists(
                    'nome_testemunha',
                    $data
                )){
                    $sinistro->nome_testemunha=
                        $this->nullableTrim(
                            $data['nome_testemunha']
                        );
                }

                if(array_key_exists(
                    'telemovel_testemunha',
                    $data
                )){
                    $sinistro->telemovel_testemunha=
                        $this->nullableTrim(
                            $data['telemovel_testemunha']
                        );
                }
            }

            $sinistro->updated_by=$actor->id;
            $sinistro->save();

            return $this->load($sinistro);
        });
    }

    public function delete(
        string $id,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $sinistro=Sinistro::query()
            ->where('tenant_id',$tenantId)
            ->with('documentos')
            ->findOrFail($id);

        $paths=$sinistro->documentos
            ->pluck('arquivo_path')
            ->filter()
            ->values()
            ->all();

        DB::transaction(
            fn()=>$sinistro->delete()
        );

        foreach($paths as $path){
            Storage::disk('local')
                ->delete($path);
        }
    }

    public function addDocument(
        string $sinistroId,
        string $tipo,
        UploadedFile $arquivo,
        User $actor,
        string $tenantId
    ): SinistroDocumento {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $sinistro=Sinistro::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($sinistroId);

        $extension=strtolower(
            $arquivo->getClientOriginalExtension()
                ?: 'bin'
        );

        $directory=
            "sinistros/{$tenantId}/{$sinistro->id}";

        $filename=
            Str::uuid()->toString().
            '.'.
            $extension;

        $path=$arquivo->storeAs(
            $directory,
            $filename,
            'local'
        );

        if(!$path){
            throw new RuntimeException(
                'Não foi possível guardar o documento do sinistro.'
            );
        }

        $absolutePath=Storage::disk('local')
            ->path($path);

        $hash=hash_file(
            'sha256',
            $absolutePath
        );

        if(!$hash){
            Storage::disk('local')
                ->delete($path);

            throw new RuntimeException(
                'Não foi possível calcular a integridade do documento.'
            );
        }

        try{
            return DB::transaction(function() use(
                $sinistro,
                $tipo,
                $arquivo,
                $actor,
                $tenantId,
                $path,
                $hash
            ){
                $documento=new SinistroDocumento([
                    'tipo'=>$tipo,
                ]);

                $documento->tenant_id=$tenantId;
                $documento->sinistro_id=$sinistro->id;

                $documento->arquivo_nome=
                    $arquivo->getClientOriginalName();

                $documento->arquivo_path=$path;

                $documento->arquivo_mime=
                    $arquivo->getMimeType()
                    ?? $arquivo->getClientMimeType()
                    ?? 'application/octet-stream';

                $documento->arquivo_tamanho=
                    $arquivo->getSize();

                $documento->hash_arquivo=$hash;
                $documento->created_by=$actor->id;

                $documento->save();

                return $documento->load(
                    'createdBy:id,name'
                );
            });
        }catch(Throwable $exception){
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }
    }

    public function deleteDocument(
        string $sinistroId,
        string $documentoId,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $documento=SinistroDocumento::query()
            ->where('tenant_id',$tenantId)
            ->where(
                'sinistro_id',
                $sinistroId
            )
            ->findOrFail($documentoId);

        $path=$documento->arquivo_path;

        $documento->delete();

        if($path){
            Storage::disk('local')
                ->delete($path);
        }
    }

    private function resolveVeiculo(
        string $id,
        string $tenantId
    ): Veiculo {
        $veiculo=Veiculo::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$veiculo){
            throw ValidationException::withMessages([
                'veiculo_id'=>
                    'O veículo selecionado não pertence a esta organização.',
            ]);
        }

        return $veiculo;
    }

    private function resolveMotorista(
        ?string $id,
        string $tenantId
    ): ?Motorista {
        if(blank($id)){
            return null;
        }

        $motorista=Motorista::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$motorista){
            throw ValidationException::withMessages([
                'motorista_id'=>
                    'O motorista selecionado não pertence a esta organização.',
            ]);
        }

        return $motorista;
    }

    private function assertDates(
        string $dataSinistro,
        ?string $dataPeritagem
    ): void {
        if(blank($dataPeritagem)){
            return;
        }

        $sinistro=CarbonImmutable::parse(
            $dataSinistro
        )->startOfDay();

        $peritagem=CarbonImmutable::parse(
            $dataPeritagem
        )->startOfDay();

        if($peritagem->lt($sinistro)){
            throw ValidationException::withMessages([
                'data_peritagem'=>
                    'A data da peritagem não pode ser anterior à data do sinistro.',
            ]);
        }
    }

    private function normalizeItems(
        array $items
    ): array {
        return collect($items)
            ->map(
                fn($item)=>trim((string)$item)
            )
            ->filter()
            ->unique(
                fn($item)=>mb_strtolower($item)
            )
            ->values()
            ->all();
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if(!$this->permissionService->allows(
            $actor,
            'sinistros',
            'configurar',
            $tenantId
        )){
            abort(
                403,
                'Sem permissão suficiente para gerir sinistros.'
            );
        }
    }

    private function load(
        Sinistro $sinistro
    ): Sinistro {
        return $sinistro->load([
            'veiculo:id,proprietario_id,matricula,marca,modelo',
            'veiculo.proprietario:id,tipo,nome_completo,nome_empresa,user_id',
            'motorista:id,nome_completo,nif,email,user_id',
            'documentos.createdBy:id,name',
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);
    }
}
