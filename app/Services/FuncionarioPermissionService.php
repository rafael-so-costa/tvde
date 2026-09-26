<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FuncionarioPermissionService
{
    public function __construct(
        private PermissionService $permissionService
    ){}

    public function matrix(
        User $user,
        string $tenantId
    ): array {
        $direct=
            UserPermission::query()
                ->where(
                    'user_id',
                    $user->id
                )
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->get()
                ->keyBy(
                    'permission_id'
                );

        return Permission::query()
            ->orderBy('nome')
            ->get()
            ->map(
                function(
                    Permission $permission
                ) use(
                    $user,
                    $tenantId,
                    $direct
                ){
                    $override=
                        $direct->get(
                            $permission->id
                        );

                    return [
                        'id'=>$permission->id,
                        'codigo'=>
                            $permission->codigo,
                        'modulo'=>
                            $permission->modulo,
                        'nome'=>
                            $permission->nome,
                        'descricao'=>
                            $permission->descricao,

                        'nivel_direto'=>
                            $override?->nivel,

                        'nivel_efetivo'=>
                            $this
                                ->permissionService
                                ->level(
                                    $user,
                                    $permission
                                        ->codigo,
                                    $tenantId
                                ),
                    ];
                }
            )
            ->values()
            ->all();
    }

    public function replace(
        User $user,
        string $tenantId,
        array $levels
    ): void {
        DB::transaction(
            function() use(
                $user,
                $tenantId,
                $levels
            ){
                $codes=array_keys(
                    $levels
                );

                $permissions=
                    Permission::query()
                        ->whereIn(
                            'codigo',
                            $codes
                        )
                        ->get()
                        ->keyBy(
                            'codigo'
                        );

                $unknown=array_diff(
                    $codes,
                    $permissions
                        ->keys()
                        ->all()
                );

                if($unknown){
                    throw ValidationException::withMessages([
                        'permissions'=>
                            'Permissões desconhecidas: '.
                            implode(
                                ', ',
                                $unknown
                            ),
                    ]);
                }

                UserPermission::query()
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->delete();

                foreach(
                    $levels as
                    $code=>$level
                ){
                    if($level===null){
                        continue;
                    }

                    UserPermission::create([
                        'user_id'=>$user->id,

                        'permission_id'=>
                            $permissions[
                                $code
                            ]->id,

                        'tenant_id'=>$tenantId,

                        'nivel'=>$level,
                    ]);
                }
            }
        );
    }
}
