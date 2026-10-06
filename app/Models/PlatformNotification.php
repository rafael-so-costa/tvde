<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PlatformNotification extends Model
{
    use HasUuids;

    protected $fillable=[
        'type',
        'title',
        'message',
        'severity',
        'target_scope',
        'audiences',
        'channels',
        'action_url',
        'active',
        'published_at',
        'expires_at',
        'resolved_at',
        'synced_at',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'audiences'=>'array',
            'channels'=>'array',
            'active'=>'boolean',
            'published_at'=>'datetime',
            'expires_at'=>'datetime',
            'resolved_at'=>'datetime',
            'synced_at'=>'datetime',
        ];
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(
            Tenant::class,
            'platform_notification_tenants'
        )
            ->using(
                PlatformNotificationTenant::class
            )
            ->withTimestamps();
    }
}
