<?php

namespace App\Services;

use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Collection;

class AlertRecipientResolver
{
    public function __construct(
        private PermissionService $permissionService
    ){}

    public function managementUserIds(
        string $tenantId
    ): Collection {
        return TenantUser::query()
            ->where('tenant_id',$tenantId)
            ->where('status','ativo')
            ->whereHas(
                'user',
                fn($query)=>
                    $query->where('ativo',true)
            )
            ->with('user')
            ->get()
            ->map(
                fn(TenantUser $membership)=>
                    $membership->user
            )
            ->filter(
                fn(?User $user)=>
                    $user &&
                    $this->permissionService->allows(
                        $user,
                        'alertas',
                        'visualizar',
                        $tenantId
                    )
            )
            ->pluck('id')
            ->unique()
            ->values();
    }

    public function merge(
        iterable ...$groups
    ): Collection {
        $ids=collect();

        foreach($groups as $group){
            foreach($group as $id){
                if($id){
                    $ids->push(
                        (string)$id
                    );
                }
            }
        }

        return $ids
            ->filter()
            ->unique()
            ->values();
    }
}
