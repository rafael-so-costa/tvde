<?php

namespace App\Models;

use App\Casts\MailSettingsEncrypted;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailSetting extends Model
{
    use HasUuids;

    protected $fillable=[
        'enabled',
        'mailer',
        'host',
        'port',
        'scheme',
        'username',
        'smtp_password',
        'from_address',
        'from_name',
        'last_test_at',
        'last_test_status',
        'last_test_error',
        'updated_by',
    ];

    protected $hidden=[
        'smtp_password',
    ];

    protected function casts():array
    {
        return[
            'enabled'=>'boolean',
            'port'=>'integer',
            'smtp_password'=>MailSettingsEncrypted::class,
            'last_test_at'=>'datetime',
        ];
    }

    public function updatedBy():BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}