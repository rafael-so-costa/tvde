<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_delivery_events', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('delivery_token', 64);

            $table
                ->foreignUuid('campaign_id')
                ->constrained('ad_campaigns')
                ->cascadeOnDelete();

            $table
                ->foreignUuid('creative_id')
                ->constrained('ad_creatives')
                ->cascadeOnDelete();

            $table
                ->foreignUuid('tenant_id')
                ->nullable()
                ->constrained('tenants')
                ->nullOnDelete();

            $table
                ->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('surface', 30);
            $table->string('event_type', 20);
            $table->string('viewer_key', 64);
            $table->timestamp('occurred_at');
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->unique(
                [
                    'delivery_token',
                    'event_type',
                ],
                'ad_delivery_events_token_event_unique'
            );

            $table->index(
                [
                    'campaign_id',
                    'event_type',
                    'occurred_at',
                ],
                'ad_delivery_events_campaign_event_idx'
            );

            $table->index(
                [
                    'creative_id',
                    'event_type',
                    'occurred_at',
                ],
                'ad_delivery_events_creative_event_idx'
            );

            $table->index(
                [
                    'viewer_key',
                    'campaign_id',
                    'event_type',
                    'occurred_at',
                ],
                'ad_delivery_events_viewer_campaign_idx'
            );

            $table->index(
                [
                    'surface',
                    'event_type',
                    'occurred_at',
                ],
                'ad_delivery_events_surface_event_idx'
            );
        });

        Schema::table('ad_daily_stats', function (Blueprint $table) {
            /*
             * Mantemos zone_id e o índice antigo por
             * retrocompatibilidade com métricas já existentes.
             *
             * O novo Delivery Engine utiliza surface.
             */
            $table
                ->string('surface', 30)
                ->nullable()
                ->after('zone_id');

            $table->unique(
                [
                    'campaign_id',
                    'creative_id',
                    'surface',
                    'date',
                ],
                'ad_daily_stats_surface_unique'
            );

            $table->index(
                [
                    'surface',
                    'date',
                ],
                'ad_daily_stats_surface_date_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('ad_daily_stats', function (Blueprint $table) {
            $table->dropUnique(
                'ad_daily_stats_surface_unique'
            );

            $table->dropIndex(
                'ad_daily_stats_surface_date_idx'
            );

            $table->dropColumn(
                'surface'
            );
        });

        Schema::dropIfExists(
            'ad_delivery_events'
        );
    }
};
