<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Declaracao extends Model
{
    use HasUuids;

    protected $table='declaracoes';

    protected $attributes=[
        'status'=>'rascunho',
    ];

    protected $fillable=[
        'empresa_id',
        'motorista_id',
        'proprietario_id',
        'veiculo_id',
        'tipo',
        'titulo',
        'destinatario',
        'conteudo',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_emissao'=>'datetime',
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

    public function emissor(): BelongsTo
    {
        return $this->belongsTo(User::class,'emitted_by');
    }
}
