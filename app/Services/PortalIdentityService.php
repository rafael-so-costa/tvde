<?php

namespace App\Services;

use App\Models\Motorista;
use App\Models\Permission;
use App\Models\Proprietario;
use App\Models\User;

class PortalIdentityService
{
    public function __construct(
        private PermissionService $permissionService
    ) {}

    public function resolve(
        User $user,
        ?string $tenantId
    ): array {
        if (!$tenantId) {
            return $this->withoutTenant(
                $user
            );
        }

        $roles = $user
            ->roles()
            ->wherePivot(
                'tenant_id',
                $tenantId
            )
            ->pluck(
                'roles.codigo'
            )
            ->values()
            ->all();

        if (
            $user->isSuperAdmin() &&
            !in_array(
                'super_admin',
                $roles,
                true
            )
        ) {
            array_unshift(
                $roles,
                'super_admin'
            );
        }

        $motorista =
            Motorista::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->first([
                    'id',
                    'ativo',
                    'status_cadastro',
                ]);

        $proprietario =
            Proprietario::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->first([
                    'id',
                    'tipo',
                    'ativo',
                    'status_cadastro',
                ]);

        $hasMotoristaRole =
            in_array(
                'motorista',
                $roles,
                true
            );

        $hasProprietarioRole =
            in_array(
                'proprietario',
                $roles,
                true
            );

        $areas = [];

        if (
            $this->hasManagementAccess(
                $user,
                $tenantId,
                $roles
            )
        ) {
            $areas[] =
                $this->area(
                    'gestao',
                    'Gestão',
                    '/'
                );
        }

        if (
            $hasMotoristaRole &&
            $motorista
        ) {
            $areas[] =
                $this->area(
                    'motorista',
                    'Portal do Motorista',
                    '/portal/motorista'
                );
        }

        if (
            $hasProprietarioRole &&
            $proprietario
        ) {
            $areas[] =
                $this->area(
                    'proprietario',
                    'Portal do Proprietário',
                    '/portal/proprietario'
                );
        }

        return [
            'tenant_id' =>
                $tenantId,

            'roles' =>
                $roles,

            'links' => [
                'motorista' => [
                    'has_role' =>
                        $hasMotoristaRole,

                    'linked' =>
                        $motorista !== null,

                    'id' =>
                        $motorista?->id,

                    'ativo' =>
                        $motorista?->ativo,

                    'status_cadastro' =>
                        $motorista
                            ?->status_cadastro,
                ],

                'proprietario' => [
                    'has_role' =>
                        $hasProprietarioRole,

                    'linked' =>
                        $proprietario !== null,

                    'id' =>
                        $proprietario?->id,

                    'tipo' =>
                        $proprietario?->tipo,

                    'ativo' =>
                        $proprietario?->ativo,

                    'status_cadastro' =>
                        $proprietario
                            ?->status_cadastro,
                ],
            ],

            'areas' =>
                $areas,

            'default_area' =>
                $areas[0]['code']
                    ?? null,

            'default_path' =>
                $areas[0]['path']
                    ?? null,
        ];
    }

    private function withoutTenant(
        User $user
    ): array {
        $areas = [];

        if ($user->isSuperAdmin()) {
            $areas[] =
                $this->area(
                    'gestao',
                    'Gestão',
                    '/'
                );
        }

        return [
            'tenant_id' =>
                null,

            'roles' =>
                $user->isSuperAdmin()
                    ? ['super_admin']
                    : [],

            'links' => [
                'motorista' => [
                    'has_role' => false,
                    'linked' => false,
                    'id' => null,
                    'ativo' => null,
                    'status_cadastro' => null,
                ],

                'proprietario' => [
                    'has_role' => false,
                    'linked' => false,
                    'id' => null,
                    'tipo' => null,
                    'ativo' => null,
                    'status_cadastro' => null,
                ],
            ],

            'areas' =>
                $areas,

            'default_area' =>
                $areas[0]['code']
                    ?? null,

            'default_path' =>
                $areas[0]['path']
                    ?? null,
        ];
    }

    private function hasManagementAccess(
        User $user,
        string $tenantId,
        array $roles
    ): bool {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (
            in_array(
                'admin_empresa',
                $roles,
                true
            )
        ) {
            return true;
        }

        if (
            !in_array(
                'funcionario',
                $roles,
                true
            )
        ) {
            return false;
        }

        $permissionCodes =
            Permission::query()
                ->pluck('codigo');

        foreach (
            $permissionCodes
            as $permissionCode
        ) {
            if (
                $this
                    ->permissionService
                    ->allows(
                        $user,
                        $permissionCode,
                        'visualizar',
                        $tenantId
                    )
            ) {
                return true;
            }
        }

        return false;
    }

    private function area(
        string $code,
        string $label,
        string $path
    ): array {
        return [
            'code' => $code,
            'label' => $label,
            'path' => $path,
        ];
    }
}
