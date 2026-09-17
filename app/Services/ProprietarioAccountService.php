<?php

namespace App\Services;

use App\Models\Profile;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProprietarioAccountService
{
    public function create(
        Proprietario $proprietario,
        string $password
    ): User {
        return DB::transaction(function () use (
            $proprietario,
            $password
        ) {
            $proprietario = Proprietario::query()
                ->whereKey($proprietario->id)
                ->where('tenant_id', $proprietario->tenant_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($proprietario->user_id) {
                throw ValidationException::withMessages([
                    'conta' => 'Este proprietário já possui uma conta de acesso.',
                ]);
            }

            $email = Str::lower(
                trim((string) $proprietario->email)
            );

            if ($email === '') {
                throw ValidationException::withMessages([
                    'conta' => 'O proprietário precisa ter um e-mail antes de criar a conta de acesso.',
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
                $proprietario->nif &&
                Profile::query()
                    ->where('nif', $proprietario->nif)
                    ->exists()
            ) {
                throw ValidationException::withMessages([
                    'conta' => 'Este NIF já está associado a outra conta de utilizador.',
                ]);
            }

            $role = Role::query()
                ->where('codigo', 'proprietario')
                ->first();

            if (!$role) {
                throw ValidationException::withMessages([
                    'conta' => 'A função de proprietário não está configurada no sistema.',
                ]);
            }

            $name = $this->resolveName($proprietario, $email);

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'ativo' => true,
            ]);

            Profile::create([
                'user_id' => $user->id,
                'nif' => $proprietario->nif,
                'telefone' => $proprietario->telemovel,
                'data_nascimento' => $proprietario->data_nascimento,
            ]);

            TenantUser::create([
                'tenant_id' => $proprietario->tenant_id,
                'user_id' => $user->id,
                'status' => 'ativo',
                'principal' => true,
            ]);

            UserRole::create([
                'user_id' => $user->id,
                'role_id' => $role->id,
                'tenant_id' => $proprietario->tenant_id,
            ]);

            $proprietario->user_id = $user->id;
            $proprietario->save();

            return $user;
        });
    }

    public function updatePassword(
        Proprietario $proprietario,
        string $password
    ): void {
        DB::transaction(function () use (
            $proprietario,
            $password
        ) {
            if (!$proprietario->user_id) {
                throw ValidationException::withMessages([
                    'conta' => 'Este proprietário ainda não possui conta de acesso.',
                ]);
            }

            $user = User::query()
                ->whereKey($proprietario->user_id)
                ->first();

            if (!$user) {
                throw ValidationException::withMessages([
                    'conta' => 'A conta associada ao proprietário não foi encontrada.',
                ]);
            }

            $hasTenantAccess = TenantUser::query()
                ->where('tenant_id', $proprietario->tenant_id)
                ->where('user_id', $user->id)
                ->exists();

            if (!$hasTenantAccess) {
                throw ValidationException::withMessages([
                    'conta' => 'A conta não está associada à organização deste proprietário.',
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

    private function resolveName(
        Proprietario $proprietario,
        string $email
    ): string {
        if (
            $proprietario->tipo === 'pessoa_fisica' &&
            filled($proprietario->nome_completo)
        ) {
            return trim($proprietario->nome_completo);
        }

        if (
            $proprietario->tipo === 'empresa' &&
            filled($proprietario->nome_gerente)
        ) {
            return trim($proprietario->nome_gerente);
        }

        if (filled($proprietario->nome_empresa)) {
            return trim($proprietario->nome_empresa);
        }

        return $email;
    }
}
