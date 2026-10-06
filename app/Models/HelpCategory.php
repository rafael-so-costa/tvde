<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HelpCategory extends Model
{
    use HasUuids;

    protected $fillable=[
        'name','slug','description','position','active',
        'created_by_user_id','updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'position'=>'integer',
            'active'=>'boolean',
        ];
    }

    public function contents(): HasMany
    {
        return $this->hasMany(HelpContent::class,'category_id');
    }
}
