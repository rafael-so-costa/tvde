<?php

namespace App\Services;

use App\Jobs\SendFuncionarioInvitation;
use App\Models\Funcionario;
use App\Models\FuncionarioInvitation;
use App\Models\Profile;
use App\Models\Role;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FuncionarioAccessService
{
    public function provision(
        Funcionario $funcionario,
        User $actor,
        bool $confirmExisting=false
    ): array {
        return DB::transaction(
            function() use(
                $funcionario,
                $actor,
                $confirmExisting
            ){
                $funcionario=
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
                    $funcionario->estado!==
                    'ativo'
                ){
                    throw ValidationException::withMessages([
                        'acesso'=>
                            'Apenas funcionários ativos podem receber acesso ao FrotaPRO.',
                    ]);
                }

                if($funcionario->user_id){
                    throw ValidationException::withMessages([
                        'acesso'=>
                            'Este funcionário já possui uma conta associada.',
                    ]);
                }

                $email=Str::lower(
                    trim(
                        (string)
                        $funcionario->email
                    )
                );

                if($email===''){
                    throw ValidationException::withMessages([
                        'email'=>
                            'O funcionário precisa ter um e-mail antes de receber acesso.',
                    ]);
                }

                $existing=
                    User::query()
                        ->whereRaw(
                            'LOWER(email) = ?',
                            [$email]
                        )
                        ->first();

                if($existing){
                    if(!$existing->ativo){
                        throw ValidationException::withMessages([
                            'existing_user'=>
                                'Já existe uma conta global com este e-mail, mas ela está bloqueada. A reativação global deve ser feita por um super administrador.',
                        ]);
                    }

                    if(!$confirmExisting){
                        throw ValidationException::withMessages([
                            'existing_user'=>
                                'Já existe uma conta FrotaPRO com este e-mail. Confirme explicitamente se pretende associar essa conta a este funcionário.',
                        ]);
                    }

                    $this->attachExisting(
                        $funcionario,
                        $existing
                    );

                    return [
                        'mode'=>
                            'linked_existing',

                        'user'=>$existing,
                    ];
                }

                $invitation=
                    $this->createInvitation(
                        $funcionario,
                        $actor
                    );

                return [
                    'mode'=>'invited',
                    'invitation'=>
                        $invitation,
                ];
            }
        );
    }

    public function resend(
        Funcionario $funcionario,
        User $actor
    ): FuncionarioInvitation {
        return DB::transaction(
            function() use(
                $funcionario,
                $actor
            ){
                $funcionario=
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

                if($funcionario->user_id){
                    throw ValidationException::withMessages([
                        'acesso'=>
                            'A conta já está associada. Não existe convite pendente para reenviar.',
                    ]);
                }

                $existing=
                    User::query()
                        ->whereRaw(
                            'LOWER(email) = ?',
                            [
                                Str::lower(
                                    trim(
                                        (string)
                                        $funcionario
                                            ->email
                                    )
                                ),
                            ]
                        )
                        ->exists();

                if($existing){
                    throw ValidationException::withMessages([
                        'existing_user'=>
                            'Já existe uma conta com este e-mail. Utilize a associação explícita de conta existente.',
                    ]);
                }

                return $this
                    ->createInvitation(
                        $funcionario,
                        $actor
                    );
            }
        );
    }

    public function setStatus(
        Funcionario $funcionario,
        bool $active
    ): void {
        if(!$funcionario->user_id){
            throw ValidationException::withMessages([
                'acesso'=>
                    'Este funcionário não possui conta associada.',
            ]);
        }

        if(
            $active &&
            $funcionario->estado!==
            'ativo'
        ){
            throw ValidationException::withMessages([
                'acesso'=>
                    'O vínculo laboral precisa estar ativo antes de reativar o acesso.',
            ]);
        }

        $user=User::query()
            ->findOrFail(
                $funcionario->user_id
            );

        if(
            $active &&
            !$user->ativo
        ){
            throw ValidationException::withMessages([
                'acesso'=>
                    'A conta global está bloqueada e não pode ser reativada por esta organização.',
            ]);
        }

        $membership=
            TenantUser::query()
                ->where(
                    'tenant_id',
                    $funcionario->tenant_id
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->firstOrFail();

        $membership->update([
            'status'=>$active
                ? 'ativo'
                : 'inativo',
        ]);
    }

    public function invitationByToken(
        string $token
    ): FuncionarioInvitation {
        $invitation=
            FuncionarioInvitation::query()
                ->with([
                    'funcionario',
                    'tenant:id,nome',
                ])
                ->where(
                    'token_hash',
                    hash(
                        'sha256',
                        $token
                    )
                )
                ->firstOrFail();

        $this->assertInvitationValid(
            $invitation
        );

        return $invitation;
    }

    public function accept(
        string $token,
        string $password
    ): User {
        return DB::transaction(
            function() use(
                $token,
                $password
            ){
                $invitation=
                    FuncionarioInvitation::query()
                        ->where(
                            'token_hash',
                            hash(
                                'sha256',
                                $token
                            )
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                $this->assertInvitationValid(
                    $invitation
                );

                $funcionario=
                    Funcionario::query()
                        ->whereKey(
                            $invitation
                                ->funcionario_id
                        )
                        ->where(
                            'tenant_id',
                            $invitation
                                ->tenant_id
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                if(
                    $funcionario->estado!==
                    'ativo'
                ){
                    throw ValidationException::withMessages([
                        'convite'=>
                            'Este vínculo laboral já não está ativo.',
                    ]);
                }

                if($funcionario->user_id){
                    throw ValidationException::withMessages([
                        'convite'=>
                            'Este funcionário já possui uma conta associada.',
                    ]);
                }

                if(
                    Str::lower(
                        trim(
                            (string)
                            $funcionario->email
                        )
                    ) !==
                    Str::lower(
                        $invitation->email
                    )
                ){
                    throw ValidationException::withMessages([
                        'convite'=>
                            'O e-mail do funcionário foi alterado depois da emissão do convite.',
                    ]);
                }

                if(
                    User::query()
                        ->whereRaw(
                            'LOWER(email) = ?',
                            [
                                Str::lower(
                                    $invitation->email
                                ),
                            ]
                        )
                        ->exists()
                ){
                    throw ValidationException::withMessages([
                        'convite'=>
                            'Já existe uma conta com este e-mail. O administrador deve associá-la explicitamente ao funcionário.',
                    ]);
                }

                $role=$this
                    ->employeeRole();

                $user=User::create([
                    'name'=>$funcionario->nome,
                    'email'=>Str::lower(
                        $invitation->email
                    ),
                    'password'=>$password,
                    'ativo'=>true,
                ]);

                $user->forceFill([
                    'email_verified_at'=>now(),
                ])->save();

                Profile::create([
                    'user_id'=>$user->id,

                    'telefone'=>
                        $funcionario
                            ->telefone,

                    'data_nascimento'=>
                        $funcionario
                            ->data_nascimento,

                    'timezone'=>
                        config(
                            'app.timezone',
                            'Europe/Lisbon'
                        ),

                    'locale'=>'pt_PT',
                ]);

                TenantUser::create([
                    'tenant_id'=>
                        $funcionario
                            ->tenant_id,

                    'user_id'=>$user->id,

                    'status'=>'ativo',
                    'principal'=>true,
                ]);

                UserRole::create([
                    'user_id'=>$user->id,
                    'role_id'=>$role->id,

                    'tenant_id'=>
                        $funcionario
                            ->tenant_id,
                ]);

                $funcionario->user_id=
                    $user->id;

                $funcionario->save();

                $invitation->accepted_at=
                    now();

                $invitation
                    ->token_ciphertext=
                    null;

                $invitation->save();

                FuncionarioInvitation::query()
                    ->where(
                        'funcionario_id',
                        $funcionario->id
                    )
                    ->whereKeyNot(
                        $invitation->id
                    )
                    ->whereNull('accepted_at')
                    ->whereNull('revoked_at')
                    ->update([
                        'revoked_at'=>now(),
                        'token_ciphertext'=>null,
                    ]);

                return $user;
            }
        );
    }

    private function attachExisting(
        Funcionario $funcionario,
        User $user
    ): void {
        $alreadyLinked=
            Funcionario::query()
                ->where(
                    'tenant_id',
                    $funcionario->tenant_id
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->whereKeyNot(
                    $funcionario->id
                )
                ->exists();

        if($alreadyLinked){
            throw ValidationException::withMessages([
                'existing_user'=>
                    'Esta conta já está associada a outro funcionário da mesma organização.',
            ]);
        }

        $hasPrincipal=
            TenantUser::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->where(
                    'principal',
                    true
                )
                ->exists();

        TenantUser::query()
            ->updateOrCreate(
                [
                    'tenant_id'=>
                        $funcionario
                            ->tenant_id,

                    'user_id'=>$user->id,
                ],
                [
                    'status'=>'ativo',

                    'principal'=>
                        !$hasPrincipal,
                ]
            );

        $role=$this->employeeRole();

        UserRole::query()
            ->firstOrCreate([
                'user_id'=>$user->id,
                'role_id'=>$role->id,

                'tenant_id'=>
                    $funcionario
                        ->tenant_id,
            ]);

        $funcionario->user_id=
            $user->id;

        $funcionario->save();

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

    private function createInvitation(
        Funcionario $funcionario,
        User $actor
    ): FuncionarioInvitation {
        if(!$funcionario->email){
            throw ValidationException::withMessages([
                'email'=>
                    'O funcionário precisa ter um e-mail antes de receber acesso.',
            ]);
        }

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

        $token=Str::random(64);

        $invitation=
            new FuncionarioInvitation();

        $invitation->tenant_id=
            $funcionario->tenant_id;

        $invitation->funcionario_id=
            $funcionario->id;

        $invitation->email=
            Str::lower(
                $funcionario->email
            );

        $invitation->token_hash=
            hash(
                'sha256',
                $token
            );

        $invitation->token_ciphertext=
            Crypt::encryptString(
                $token
            );

        $invitation->expires_at=
            now()->addHours(48);

        $invitation->created_by=
            $actor->id;

        $invitation->save();

        SendFuncionarioInvitation::dispatch(
            $invitation->id
        )->afterCommit();

        return $invitation;
    }

    private function employeeRole(): Role
    {
        $role=Role::query()
            ->where(
                'codigo',
                'funcionario'
            )
            ->first();

        if(!$role){
            throw ValidationException::withMessages([
                'role'=>
                    'A função de funcionário não está configurada no sistema.',
            ]);
        }

        return $role;
    }

    private function assertInvitationValid(
        FuncionarioInvitation $invitation
    ): void {
        if($invitation->accepted_at){
            abort(
                410,
                'Este convite já foi utilizado.'
            );
        }

        if($invitation->revoked_at){
            abort(
                410,
                'Este convite foi revogado.'
            );
        }

        if(
            !$invitation->expires_at ||
            $invitation
                ->expires_at
                ->isPast()
        ){
            abort(
                410,
                'Este convite expirou.'
            );
        }
    }
}
