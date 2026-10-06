<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HelpContentAudience extends Model
{
    use HasUuids;

    public $timestamps=false;

    protected $fillable=[
        'content_id','audience',
    ];

    public function content(): BelongsTo
    {
        return $this->belongsTo(HelpContent::class,'content_id');
    }
}
