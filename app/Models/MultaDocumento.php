<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MultaDocumento extends Model
{
    use HasUuids;

    protected $fillable=[
        'tipo',
    ];

    protected function casts(): array
    {
        return [
            'arquivo_tamanho'=>'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function multa(): BelongsTo
    {
        return $this->belongsTo(Multa::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class,'created_by');
    }
}
