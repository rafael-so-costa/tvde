<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sinistro extends Model
{
    use HasUuids;

    protected $attributes=[
        'status'=>'aberto',
        'itens_danificados'=>'[]',
        'peritagem_realizada'=>false,
        'teve_testemunha'=>false,
    ];

    protected $fillable=[
        'veiculo_id',
        'motorista_id',
        'data_sinistro',
        'status',
        'data_peritagem',
        'peritagem_realizada',
        'seguradora',
        'apolice',
        'numero_processo',
        'itens_danificados',
        'descricao',
        'teve_testemunha',
        'nome_testemunha',
        'telemovel_testemunha',
    ];

    protected function casts(): array
    {
        return [
            'data_sinistro'=>'date:Y-m-d',
            'data_peritagem'=>'date:Y-m-d',
            'peritagem_realizada'=>'boolean',
            'itens_danificados'=>'array',
            'teve_testemunha'=>'boolean',
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
        return $this
            ->hasMany(SinistroDocumento::class)
            ->orderBy('created_at');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}
