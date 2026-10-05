<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdAdvertiser extends Model
{
    use HasUuids;

    public const TYPE_SAAS = 'saas';

    public const TYPE_TENANT = 'tenant';

    public const TYPE_EXTERNAL = 'external';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_PENDING = 'pending';

    protected $fillable = [
        'tenant_id',
        'type',
        'name',
        'legal_name',
        'nif',
        'email',
        'phone',
        'website',
        'status',
        'verified_at',
        'verified_by_user_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public static function types(): array
    {
        return [
            self::TYPE_SAAS,
            self::TYPE_TENANT,
            self::TYPE_EXTERNAL,
        ];
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_SUSPENDED,
            self::STATUS_PENDING,
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(AdCampaign::class, 'advertiser_id');
    }
}
