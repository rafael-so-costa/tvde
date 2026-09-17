<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerfilTemplate extends Model
{
    use HasUuids;

    protected $table = 'perfis_template';

    protected $fillable = [
        'nome',
        'descricao',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(
            TemplateContrato::class,
            'perfil_id'
        );
    }
}
