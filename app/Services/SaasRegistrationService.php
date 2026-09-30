<?php

namespace App\Services;

use App\Models\Empresa;
use App\Models\Profile;
use App\Models\Role;
use App\Models\SaasPlan;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class SaasRegistrationService
{
    public function register(array $data): array
    {
        $adminRole = Role::query()
            ->where(
                'codigo',
                'admin_empresa'
            )
            ->first();

        if (! $adminRole) {
            throw new RuntimeException(
                'A role admin_empresa não está configurada.'
            );
        }

        $starterPlan = SaasPlan::query()
            ->where(
                'codigo',
                'starter'
            )
            ->where(
                'ativo',
                true
            )
            ->first();

        if (! $starterPlan) {
            throw new RuntimeException(
                'O plano starter não está configurado.'
            );
        }

        return DB::transaction(
            function () use (
                $data,
                $adminRole,
                $starterPlan
            ): array {
                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => $data['password'],
                    'ativo' => true,
                ]);

                Profile::create([
                    'user_id' => $user->id,
                    'telefone' => $data['phone'],
                    'timezone' => 'Europe/Lisbon',
                    'locale' => 'pt_PT',
                ]);

                $tenant = Tenant::create([
                    'saas_plan_id' => $starterPlan->id,

                    'nome' => $data['company_name'],

                    'slug' => $this->uniqueSlug(
                        $data['company_name']
                    ),

                    'nif' => $data['company_nif'],

                    'email' => $data['company_email']
                        ?? $data['email'],

                    'telefone' => $data['company_phone']
                        ?? $data['phone'],

                    'ativo' => true,

                    'settings' => [
                        'onboarding' => [
                            'required' => true,
                            'completed_at' => null,
                        ],
                    ],
                ]);

                $empresa = new Empresa([
                    'nome_empresa' => $data['company_name'],

                    'nif' => $data['company_nif'],

                    'email' => $data['company_email']
                        ?? $data['email'],

                    'telemovel' => $data['company_phone']
                        ?? $data['phone'],

                    'nome_gerente' => $data['name'],

                    'ativo' => true,

                    'status_cadastro' => 'pendente',
                ]);

                $empresa->tenant_id =
                    $tenant->id;

                $empresa->save();

                TenantUser::create([
                    'tenant_id' => $tenant->id,
                    'user_id' => $user->id,
                    'status' => 'ativo',
                    'principal' => true,
                ]);

                UserRole::create([
                    'user_id' => $user->id,
                    'role_id' => $adminRole->id,
                    'tenant_id' => $tenant->id,
                ]);

                return [
                    'user' => $user,
                    'tenant' => $tenant,
                    'empresa' => $empresa,
                ];
            }
        );
    }

    private function uniqueSlug(
        string $name
    ): string {
        $base = Str::slug(
            $name
        );

        if ($base === '') {
            $base = 'empresa';
        }

        $slug = $base;
        $suffix = 2;

        while (
            Tenant::query()
                ->where(
                    'slug',
                    $slug
                )
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";

            $suffix++;
        }

        return $slug;
    }
}
