<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalyticsSessao extends Model
{
    use HasUuids;

    protected $table='analytics_sessoes';

    protected $guarded=[];

    protected function casts(): array
    {
        return [
            'pageviews'=>'integer',
            'active_seconds'=>'integer',
            'screen_width'=>'integer',
            'screen_height'=>'integer',
            'started_at'=>'datetime',
            'last_seen_at'=>'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(AnalyticsEvento::class,'session_id');
    }
}
