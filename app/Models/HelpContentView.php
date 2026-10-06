<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HelpContentView extends Model
{
    use HasUuids;

    protected $fillable=[
        'content_id','user_id','tenant_id','audiences','views',
        'first_viewed_at','last_viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'audiences'=>'array',
            'views'=>'integer',
            'first_viewed_at'=>'datetime',
            'last_viewed_at'=>'datetime',
        ];
    }

    public function content(): BelongsTo
    {
        return $this->belongsTo(HelpContent::class,'content_id');
    }
}
