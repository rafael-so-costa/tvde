<?php

namespace App\Services;

use App\Models\Motorista;
use App\Models\Profile;
use App\Models\Role;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MotoristaAccountService
{
    public function create(
        Motorista $motorista,
        string $password
    ): User {
        return DB::transaction(function () use (
            $motorista,
            $password
        ) {
            $motorista = Motorista::query()
                ->whereKey($motorista->id)
                ->where('tenant_id', $motorista->tenant_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($motorista->user_id) {
                throw ValidationException::withMessages([
                    'conta' => 'Este motorista já possui uma conta de acesso.',
                ]);
            }

            $email = Str::lower(
                trim((string) $motorista->email)
            );

            if ($email === '') {
                throw ValidationException::withMessages([
                    'conta' => 'O motorista precisa ter um e-mail antes de criar a conta de acesso.',
                ]);
            }

            if (
                User::query()
                    ->whereRaw('LOWER(email) = ?', [$email])
                    ->exists()
            ) {
                throw ValidationException::withMessages([
                    'conta' => 'Já existe uma conta de utilizador com este e-mail.',
                ]);
            }

            if (
                $motorista->nif &&
                Profile::query()
                    ->where('nif', $motorista->nif)
                    ->exists()
            ) {
                throw ValidationException::withMessages([
                    'conta' => 'Este NIF já está associado a outra conta de utilizador.',
                ]);
            }

            $role = Role::query()
                ->where('codigo', 'motorista')
                ->first();

            if (!$role) {
                throw ValidationException::withMessages([
                    'conta' => 'A função de motorista não está configurada no sistema.',
                ]);
            }

            $name = filled($motorista->nome_completo)
                ? trim($motorista->nome_completo)
                : $email;

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'ativo' => true,
            ]);

            Profile::create([
                'user_id' => $user->id,
                'nif' => $motorista->nif,
                'telefone' => $motorista->telemovel,
                'data_nascimento' => $motorista->data_nascimento,
            ]);

            TenantUser::create([
                'tenant_id' => $motorista->tenant_id,
                'user_id' => $user->id,
                'status' => 'ativo',
                'principal' => true,
            ]);

            UserRole::create([
                'user_id' => $user->id,
                'role_id' => $role->id,
                'tenant_id' => $motorista->tenant_id,
            ]);

            $motorista->user_id = $user->id;
            $motorista->save();

            return $user;
        });
    }

    public function updatePassword(
        Motorista $motorista,
        string $password
    ): void {
        DB::transaction(function () use (
            $motorista,
            $password
        ) {
            if (!$motorista->user_id) {
                throw ValidationException::withMessages([
                    'conta' => 'Este motorista ainda não possui conta de acesso.',
                ]);
            }

            $user = User::query()
                ->whereKey($motorista->user_id)
                ->first();

            if (!$user) {
                throw ValidationException::withMessages([
                    'conta' => 'A conta associada ao motorista não foi encontrada.',
                ]);
            }

            $hasTenantAccess = TenantUser::query()
                ->where('tenant_id', $motorista->tenant_id)
                ->where('user_id', $user->id)
                ->exists();

            if (!$hasTenantAccess) {
                throw ValidationException::withMessages([
                    'conta' => 'A conta não está associada à organização deste motorista.',
                ]);
            }

            $user->forceFill([
                'password' => $password,
                'remember_token' => null,
            ])->save();

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->delete();
        });
    }
}
