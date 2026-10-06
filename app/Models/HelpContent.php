<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HelpContent extends Model
{
    use HasUuids;

    protected $fillable=[
        'category_id','type','title','slug','excerpt','body',
        'youtube_url','youtube_video_id','feature_key','position',
        'featured','active','published_at',
        'created_by_user_id','updated_by_user_id', 'notification_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'position'=>'integer',
            'featured'=>'boolean',
            'active'=>'boolean',
            'published_at'=>'datetime',
            'notification_synced_at'=>'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(HelpCategory::class,'category_id');
    }

    public function audiences(): HasMany
    {
        return $this->hasMany(HelpContentAudience::class,'content_id');
    }

    public function viewRecords(): HasMany
    {
        return $this->hasMany(HelpContentView::class,'content_id');
    }
}
