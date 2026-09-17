<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\UserPermission;
use App\Models\UserRole;

class PermissionService
{
    private const LEVELS = [
        'nenhum' => 0,
        'visualizar' => 1,
        'configurar' => 2,
    ];

    public function level(User $user, string $permissionCode, ?string $tenantId = null): string
    {
        if ($user->isSuperAdmin()) {
            return 'configurar';
        }

        if (!$tenantId) {
            return 'nenhum';
        }

        if ($user->hasRole('admin_empresa', $tenantId)) {
            return 'configurar';
        }

        $permissionId = Permission::query()
            ->where('codigo', $permissionCode)
            ->value('id');

        if (!$permissionId) {
            return 'nenhum';
        }

        $directLevel = UserPermission::query()
            ->where('user_id', $user->id)
            ->where('permission_id', $permissionId)
            ->where('tenant_id', $tenantId)
            ->value('nivel');

        if ($directLevel !== null) {
            return $this->normalize($directLevel);
        }

        $roleIds = UserRole::query()
            ->where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->pluck('role_id');

        if ($roleIds->isEmpty()) {
            return 'nenhum';
        }

        $levels = RolePermission::query()
            ->where('permission_id', $permissionId)
            ->whereIn('role_id', $roleIds)
            ->pluck('nivel');

        $bestLevel = 'nenhum';

        foreach ($levels as $level) {
            $level = $this->normalize($level);

            if (self::LEVELS[$level] > self::LEVELS[$bestLevel]) {
                $bestLevel = $level;
            }
        }

        return $bestLevel;
    }

    public function allows(
        User $user,
        string $permissionCode,
        string $requiredLevel = 'visualizar',
        ?string $tenantId = null
    ): bool {
        if (!array_key_exists($requiredLevel, self::LEVELS)) {
            return false;
        }

        $currentLevel = $this->level(
            $user,
            $permissionCode,
            $tenantId
        );

        return self::LEVELS[$currentLevel] >= self::LEVELS[$requiredLevel];
    }

    private function normalize(?string $level): string
    {
        return $level !== null && array_key_exists($level, self::LEVELS)
            ? $level
            : 'nenhum';
    }
}
