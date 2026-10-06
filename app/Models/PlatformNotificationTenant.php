<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class PlatformNotificationTenant extends Pivot
{
    use HasUuids;

    protected $table='platform_notification_tenants';

    public $incrementing=false;

    protected $keyType='string';
}
