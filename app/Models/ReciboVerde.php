<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReciboVerde extends Model
{
    use HasUuids;

    protected $table='recibos_verdes';

    protected $attributes=[
        'status'=>'pendente_validacao',
    ];

    protected $fillable=[
        'motorista_id',
        'numero_documento',
        'data_emissao',
        'nif_emitente',
        'nome_emitente',
        'nif_adquirente',
        'nome_adquirente',
        'valor_base',
        'valor_iva',
        'retencao_irs',
        'valor_total',
        'dados_extraidos',
    ];

    protected function casts(): array
    {
        return [
            'data_emissao'=>'date',
            'ano'=>'integer',
            'mes'=>'integer',
            'valor_base'=>'decimal:2',
            'valor_iva'=>'decimal:2',
            'retencao_irs'=>'decimal:2',
            'valor_total'=>'decimal:2',
            'arquivo_tamanho'=>'integer',
            'dados_extraidos'=>'array',
            'avisos_validacao'=>'array',
            'validado_em'=>'datetime',
            'rejeitado_em'=>'datetime',
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'validado_por'
        );
    }

    public function rejeitadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'rejeitado_por'
        );
    }
}
