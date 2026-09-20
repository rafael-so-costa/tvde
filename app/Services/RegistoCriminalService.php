<?php

namespace App\Services;

use App\Models\Motorista;
use App\Models\RegistoCriminal;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class RegistoCriminalService
{
    public function __construct(
        private PermissionService $permissionService
    ) {}

    public function create(
        array $data,
        UploadedFile $arquivo,
        User $actor,
        string $tenantId
    ): RegistoCriminal {
        $motorista=$this->resolveMotorista(
            $data,
            $actor,
            $tenantId
        );

        $extension=strtolower(
            $arquivo->getClientOriginalExtension()
        );

        if(blank($extension)){
            $extension=match($arquivo->getMimeType()){
                'application/pdf'=>'pdf',
                'image/jpeg'=>'jpg',
                'image/png'=>'png',
                default=>'bin',
            };
        }

        $directory=
            'registos-criminais/'.
            $tenantId.'/'.
            $motorista->id;

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
                'Não foi possível guardar o registo criminal.'
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
                $data,
                $arquivo,
                $actor,
                $tenantId,
                $motorista,
                $path,
                $hash
            ){
                $registo=new RegistoCriminal([
                    'motorista_id'=>$motorista->id,
                    'codigo_consulta'=>
                        $data['codigo_consulta'],
                    'data_emissao'=>
                        $data['data_emissao'] ?? null,
                    'data_validade'=>
                        $data['data_validade'],
                    'dados_extraidos'=>
                        $data['dados_extraidos'] ?? null,
                ]);

                $registo->tenant_id=$tenantId;
                $registo->status='pendente_validacao';

                $registo->arquivo_path=$path;
                $registo->arquivo_nome=
                    $arquivo->getClientOriginalName();
                $registo->arquivo_mime=
                    $arquivo->getMimeType() ??
                    $arquivo->getClientMimeType() ??
                    'application/octet-stream';
                $registo->arquivo_tamanho=
                    $arquivo->getSize();
                $registo->hash_arquivo=$hash;

                $registo->enviado_por=$actor->id;

                $registo->save();

                return $this->load($registo);
            });
        }catch(Throwable $exception){
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }
    }

    public function approve(
        string $id,
        string $tenantId,
        User $actor
    ): RegistoCriminal {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $id,
            $tenantId,
            $actor
        ){
            $registo=RegistoCriminal::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if(
                $registo->status!==
                'pendente_validacao'
            ){
                throw ValidationException::withMessages([
                    'registo_criminal'=>
                        'Apenas registos pendentes podem ser validados.',
                ]);
            }

            $registo->status='validado';
            $registo->validado_por=$actor->id;
            $registo->validado_em=now();

            $registo->rejeitado_por=null;
            $registo->rejeitado_em=null;
            $registo->observacoes_empresa=null;

            $registo->save();

            $motorista=Motorista::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($registo->motorista_id)
                ->lockForUpdate()
                ->firstOrFail();

            $melhorValidade=RegistoCriminal::query()
                ->where('tenant_id',$tenantId)
                ->where(
                    'motorista_id',
                    $motorista->id
                )
                ->where('status','validado')
                ->max('data_validade');

            $motorista->registo_criminal_valid_until=
                $melhorValidade;

            $motorista->sincronizarCadastro();
            $motorista->save();

            return $this->load($registo);
        });
    }

    public function reject(
        string $id,
        string $tenantId,
        User $actor,
        string $motivo
    ): RegistoCriminal {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $id,
            $tenantId,
            $actor,
            $motivo
        ){
            $registo=RegistoCriminal::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if(
                $registo->status!==
                'pendente_validacao'
            ){
                throw ValidationException::withMessages([
                    'registo_criminal'=>
                        'Apenas registos pendentes podem ser rejeitados.',
                ]);
            }

            $registo->status='rejeitado';
            $registo->observacoes_empresa=$motivo;
            $registo->rejeitado_por=$actor->id;
            $registo->rejeitado_em=now();

            $registo->validado_por=null;
            $registo->validado_em=null;

            $registo->save();

            return $this->load($registo);
        });
    }

    private function resolveMotorista(
        array $data,
        User $actor,
        string $tenantId
    ): Motorista {
        if(
            $this->permissionService
                ->allows(
                    $actor,
                    'registos_criminais',
                    'configurar',
                    $tenantId
                )
        ){
            if(
                blank(
                    $data['motorista_id'] ??
                    null
                )
            ){
                throw ValidationException::withMessages([
                    'motorista_id'=>
                        'Selecione o motorista.',
                ]);
            }

            return Motorista::query()
                ->where('tenant_id',$tenantId)
                ->findOrFail(
                    $data['motorista_id']
                );
        }

        if(
            !$actor->hasRole(
                'motorista',
                $tenantId
            )
        ){
            abort(
                403,
                'Sem permissão suficiente para enviar registos criminais.'
            );
        }

        $motorista=Motorista::query()
            ->where('tenant_id',$tenantId)
            ->where('user_id',$actor->id)
            ->first();

        if(!$motorista){
            throw ValidationException::withMessages([
                'motorista'=>
                    'A conta não possui um motorista associado.',
            ]);
        }

        if(
            !empty($data['motorista_id']) &&
            $data['motorista_id']!==$motorista->id
        ){
            throw ValidationException::withMessages([
                'motorista_id'=>
                    'O motorista só pode enviar documentos para o próprio cadastro.',
            ]);
        }

        return $motorista;
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if(
            !$this->permissionService
                ->allows(
                    $actor,
                    'registos_criminais',
                    'configurar',
                    $tenantId
                )
        ){
            abort(
                403,
                'Sem permissão suficiente para este recurso.'
            );
        }
    }

    private function load(
        RegistoCriminal $registo
    ): RegistoCriminal {
        return $registo->load([
            'motorista:id,nome_completo,nif,email,telemovel,registo_criminal_valid_until,user_id',
            'enviadoPor:id,name',
            'validadoPor:id,name',
            'rejeitadoPor:id,name',
        ]);
    }
}
