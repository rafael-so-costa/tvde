<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Documento extends Model
{
    use HasUuids;

    protected $fillable=[
        'numero_global',
        'codigo',
        'origem',
        'empresa_id',
        'motorista_id',
        'proprietario_id',
        'veiculo_id',
        'categoria',
        'tipo',
        'titulo',
        'entidade_tipo',
        'entidade_id',
        'arquivo_nome',
        'arquivo_path',
        'arquivo_mime',
        'arquivo_tamanho',
        'hash_arquivo',
        'status',
        'metadados',
        'created_by',
        'finalizado_em',
    ];

    protected function casts(): array
    {
        return [
            'numero_global'=>'integer',
            'arquivo_tamanho'=>'integer',
            'metadados'=>'array',
            'finalizado_em'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function proprietario(): BelongsTo
    {
        return $this->belongsTo(Proprietario::class);
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class,'created_by');
    }

    public function acessos(): HasMany
    {
        return $this->hasMany(DocumentoAcesso::class);
    }
}
