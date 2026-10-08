<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalyticsEvento extends Model
{
    use HasUuids;

    protected $table='analytics_eventos';

    protected $guarded=[];

    protected function casts(): array
    {
        return [
            'metadados'=>'array',
            'active_seconds'=>'integer',
            'scroll_percent'=>'integer',
            'ocorrido_em'=>'datetime',
        ];
    }

    public function sessao(): BelongsTo
    {
        return $this->belongsTo(AnalyticsSessao::class,'session_id');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(ConteudoPost::class,'content_post_id');
    }
}
