<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Multa extends Model
{
    use HasUuids;

    protected $fillable=[
        'veiculo_id',
        'motorista_id',
        'numero_notificacao',
        'data_multa',
        'tipo',
        'valor',
        'status',
        'localizacao',
        'descricao',
    ];

    protected function casts(): array
    {
        return [
            'data_multa'=>'date:Y-m-d',
            'valor'=>'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(MultaDocumento::class)->orderBy('created_at');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class,'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class,'updated_by');
    }
}
