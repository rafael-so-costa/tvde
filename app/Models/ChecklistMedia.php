<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistMedia extends Model
{
    use HasUuids;

    protected $table='checklist_media';

    protected $fillable=[
        'tipo',
        'contexto',
        'titulo',
        'arquivo_nome',
        'arquivo_path',
        'arquivo_mime',
        'arquivo_tamanho',
        'hash_arquivo',
        'capturado_em',
        'metadados',
    ];

    protected function casts(): array
    {
        return [
            'arquivo_tamanho'=>'integer',
            'capturado_em'=>'datetime',
            'metadados'=>'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(
            ChecklistRecord::class,
            'checklist_record_id'
        );
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class,'uploaded_by');
    }
}
