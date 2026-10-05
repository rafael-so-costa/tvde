<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdCreative extends Model
{
    use HasUuids;

    public const MEDIA_IMAGE = 'image';

    public const MEDIA_VIDEO = 'video';

    public const MEDIA_NONE = 'none';

    public const DESTINATION_WEBSITE = 'website';

    public const DESTINATION_WHATSAPP = 'whatsapp';

    public const DESTINATION_PHONE = 'phone';

    public const DESTINATION_NONE = 'none';

    protected $fillable = [
        'campaign_id',
        'type',
        'media_type',
        'name',
        'headline',
        'body',
        'cta_label',
        'destination_type',
        'target_url',
        'phone',
        'whatsapp',
        'whatsapp_message',
        'image_path',
        'mobile_image_path',
        'video_path',
        'video_url',
        'alt_text',
        'active',
        'sort_order',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public static function mediaTypes(): array
    {
        return [
            self::MEDIA_IMAGE,
            self::MEDIA_VIDEO,
            self::MEDIA_NONE,
        ];
    }

    public static function destinationTypes(): array
    {
        return [
            self::DESTINATION_WEBSITE,
            self::DESTINATION_WHATSAPP,
            self::DESTINATION_PHONE,
            self::DESTINATION_NONE,
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(
            AdCampaign::class
        );
    }
}
