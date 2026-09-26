<?php

namespace App\Services;

use App\Models\Funcionario;
use App\Models\FuncionarioInvitation;
use App\Models\TenantUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FuncionarioService
{
    public function create(
        string $tenantId,
        string $actorId,
        array $data
    ): Funcionario {
        return DB::transaction(
            function() use(
                $tenantId,
                $actorId,
                $data
            ){
                return Funcionario::create([
                    'tenant_id'=>$tenantId,

                    'numero_funcionario'=>
                        $this->clean(
                            $data[
                                'numero_funcionario'
                            ] ?? null
                        ),

                    'nome'=>trim(
                        $data['nome']
                    ),

                    'nif'=>$this->clean(
                        $data['nif'] ?? null
                    ),

                    'email'=>
                        $this->email(
                            $data[
                                'email'
                            ] ?? null
                        ),

                    'telefone'=>
                        $this->clean(
                            $data[
                                'telefone'
                            ] ?? null
                        ),

                    'data_nascimento'=>
                        $data[
                            'data_nascimento'
                        ] ?? null,

                    'cargo'=>$this->clean(
                        $data['cargo'] ?? null
                    ),

                    'departamento'=>
                        $this->clean(
                            $data[
                                'departamento'
                            ] ?? null
                        ),

                    'data_admissao'=>
                        $data[
                            'data_admissao'
                        ] ??
                        now()->toDateString(),

                    'estado'=>'ativo',

                    'observacoes'=>
                        $this->clean(
                            $data[
                                'observacoes'
                            ] ?? null
                        ),

                    'created_by'=>$actorId,
                    'updated_by'=>$actorId,
                ]);
            }
        );
    }

    public function update(
        Funcionario $funcionario,
        string $actorId,
        array $data
    ): Funcionario {
        return DB::transaction(
            function() use(
                $funcionario,
                $actorId,
                $data
            ){
                $locked=
                    Funcionario::query()
                        ->whereKey(
                            $funcionario->id
                        )
                        ->where(
                            'tenant_id',
                            $funcionario
                                ->tenant_id
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                $oldEmail=$locked->email;

                foreach(
                    [
                        'numero_funcionario',
                        'nif',
                        'telefone',
                        'cargo',
                        'departamento',
                        'observacoes',
                    ] as $field
                ){
                    if(
                        array_key_exists(
                            $field,
                            $data
                        )
                    ){
                        $locked->{$field}=
                            $this->clean(
                                $data[$field]
                            );
                    }
                }

                if(
                    array_key_exists(
                        'nome',
                        $data
                    )
                ){
                    $locked->nome=trim(
                        $data['nome']
                    );
                }

                if(
                    array_key_exists(
                        'email',
                        $data
                    )
                ){
                    $locked->email=
                        $this->email(
                            $data['email']
                        );
                }

                foreach(
                    [
                        'data_nascimento',
                        'data_admissao',
                    ] as $field
                ){
                    if(
                        array_key_exists(
                            $field,
                            $data
                        )
                    ){
                        $locked->{$field}=
                            $data[$field];
                    }
                }

                $locked->updated_by=
                    $actorId;

                $locked->save();

                if(
                    $oldEmail !==
                    $locked->email
                ){
                    $this->revokeInvitations(
                        $locked
                    );
                }

                return $locked->refresh();
            }
        );
    }

    public function updateStatus(
        Funcionario $funcionario,
        string $actorId,
        string $estado,
        ?string $dataSaida=null
    ): Funcionario {
        return DB::transaction(
            function() use(
                $funcionario,
                $actorId,
                $estado,
                $dataSaida
            ){
                $locked=
                    Funcionario::query()
                        ->whereKey(
                            $funcionario->id
                        )
                        ->where(
                            'tenant_id',
                            $funcionario
                                ->tenant_id
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                if(
                    $locked->estado===
                    'desligado' &&
                    $estado!==
                    'desligado'
                ){
                    throw ValidationException::withMessages([
                        'estado'=>
                            'Um funcionário desligado não pode ser reativado. Crie um novo vínculo laboral se houver uma nova admissão.',
                    ]);
                }

                if(
                    $estado===
                    'desligado'
                ){
                    $dataSaida=
                        $dataSaida ??
                        now()->toDateString();

                    if(
                        $locked->data_admissao &&
                        $dataSaida<
                        $locked
                            ->data_admissao
                            ->toDateString()
                    ){
                        throw ValidationException::withMessages([
                            'data_saida'=>
                                'A data de saída não pode ser anterior à data de admissão.',
                        ]);
                    }
                }else{
                    $dataSaida=null;
                }

                $locked->estado=
                    $estado;

                $locked->data_saida=
                    $dataSaida;

                $locked->updated_by=
                    $actorId;

                $locked->save();

                if(
                    $estado!=='ativo'
                ){
                    $this->suspendAccess(
                        $locked
                    );

                    $this->revokeInvitations(
                        $locked
                    );
                }

                return $locked->refresh();
            }
        );
    }

    private function suspendAccess(
        Funcionario $funcionario
    ): void {
        if(!$funcionario->user_id){
            return;
        }

        TenantUser::query()
            ->where(
                'tenant_id',
                $funcionario->tenant_id
            )
            ->where(
                'user_id',
                $funcionario->user_id
            )
            ->update([
                'status'=>'inativo',
            ]);
    }

    private function revokeInvitations(
        Funcionario $funcionario
    ): void {
        FuncionarioInvitation::query()
            ->where(
                'funcionario_id',
                $funcionario->id
            )
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->update([
                'revoked_at'=>now(),
                'token_ciphertext'=>null,
            ]);
    }

    private function clean(
        mixed $value
    ): ?string {
        if($value===null){
            return null;
        }

        $value=trim(
            (string)$value
        );

        return $value===''
            ? null
            : $value;
    }

    private function email(
        mixed $value
    ): ?string {
        $value=$this->clean(
            $value
        );

        return $value
            ? Str::lower($value)
            : null;
    }
}
