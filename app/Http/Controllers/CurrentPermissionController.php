<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrentPermissionController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService
    ){}

    public function index(
        Request $request
    ): JsonResponse {
        $tenantId=
            $this->tenantContext
                ->requireId();

        $user=$request->user();

        $permissions=
            Permission::query()
                ->orderBy('nome')
                ->get()
                ->mapWithKeys(
                    fn(Permission $permission)=>[
                        $permission->codigo=>
                            $this
                                ->permissionService
                                ->level(
                                    $user,
                                    $permission
                                        ->codigo,
                                    $tenantId
                                ),
                    ]
                );

        return response()->json([
            'data'=>$permissions,

            'capabilities'=>[
                'manage_employee_permissions'=>
                    $user->isSuperAdmin() ||
                    $user->hasRole(
                        'admin_empresa',
                        $tenantId
                    ),
            ],
        ]);
    }
}
