<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantCustomField extends Model
{
    use HasUuids;

    public const ENTITIES=[
        'empresa',
        'proprietario',
        'motorista',
        'veiculo',
    ];

    public const TYPES=[
        'text',
        'textarea',
        'number',
        'date',
        'boolean',
        'select',
    ];

    protected $fillable=[
        'tenant_id',
        'entity',
        'key',
        'label',
        'type',
        'required',
        'active',
        'options',
        'placeholder',
        'help_text',
        'default_value',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'required'=>'boolean',
            'active'=>'boolean',
            'options'=>'array',
            'sort_order'=>'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
