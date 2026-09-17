<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserPermission extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'permission_id',
        'tenant_id',
        'nivel',
    ];
}
