<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('scope', 50)->default('global')->unique();
            $table->boolean('tenant_internal_free_enabled')->default(true);
            $table->boolean('tenant_internal_requires_approval')->default(true);
            $table->unsignedInteger('tenant_internal_max_active')->default(3);
            $table->unsignedInteger('tenant_internal_max_days')->default(30);
            $table->boolean('tenant_internal_allow_partners')->default(true);
            $table->boolean('public_marketplace_enabled')->default(true);
            $table->boolean('manager_panel_external_ads_enabled')->default(false);
            $table->unsignedTinyInteger('saas_inventory_reserved_percent')->default(30);
            $table->unsignedSmallInteger('default_frequency_cap_daily')->default(3);
            $table->string('currency', 3)->default('EUR');
            $table->timestamps();
        });

        Schema::create('ad_advertisers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('type', 30);
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('nif', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('website')->nullable();
            $table->string('status', 30)->default('active');
            $table->timestamp('verified_at')->nullable();
            $table->foreignUuid('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('tenant_id');
            $table->index('nif');
        });

        Schema::create('ad_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('parent_id')->nullable()->constrained('ad_categories')->nullOnDelete();
            $table->string('slug', 100)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('allowed_on_public')->default(true);
            $table->boolean('requires_special_review')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['active', 'sort_order']);
        });

        Schema::create('ad_zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 100)->unique();
            $table->string('name');
            $table->string('channel', 50);
            $table->string('audience', 30)->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('max_concurrent_campaigns')->default(5);
            $table->unsignedTinyInteger('saas_reserved_percent')->default(30);
            $table->json('allowed_sources')->nullable();
            $table->json('allowed_categories')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['channel', 'active']);
            $table->index(['audience', 'active']);
        });

        Schema::create('ad_price_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->foreignUuid('zone_id')->nullable()->constrained('ad_zones')->nullOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('ad_categories')->nullOnDelete();
            $table->string('channel', 50)->nullable();
            $table->string('audience', 30)->nullable();
            $table->unsignedInteger('duration_days');
            $table->decimal('price', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->unsignedInteger('priority')->default(100);
            $table->boolean('active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['active', 'priority']);
            $table->index(['channel', 'audience']);
        });

        Schema::create('ad_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('advertiser_id')->constrained('ad_advertisers')->restrictOnDelete();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('ad_categories')->nullOnDelete();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('source', 30);
            $table->string('kind', 30);
            $table->string('name');
            $table->string('title');
            $table->text('description')->nullable();

            $table->string('status', 30)->default('draft');
            $table->string('pricing_model', 30)->default('fixed_period');
            $table->decimal('quoted_price', 12, 2)->default(0);
            $table->string('currency', 3)->default('EUR');

            $table->boolean('payment_required')->default(false);
            $table->string('payment_status', 30)->default('not_required');

            $table->unsignedSmallInteger('priority')->default(50);
            $table->unsignedSmallInteger('weight')->default(1);
            $table->unsignedBigInteger('max_impressions')->nullable();
            $table->unsignedBigInteger('max_clicks')->nullable();
            $table->unsignedSmallInteger('frequency_cap_daily')->nullable();

            $table->timestamp('start_at')->nullable();
            $table->timestamp('end_at')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignUuid('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->text('admin_notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['status', 'start_at', 'end_at']);
            $table->index(['source', 'kind']);
            $table->index(['payment_status', 'status']);
            $table->index('tenant_id');
        });

        Schema::create('ad_campaign_channels', function (Blueprint $table) {
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->string('channel', 50);

            $table->unique(['campaign_id', 'channel']);
            $table->index('channel');
        });

        Schema::create('ad_campaign_audiences', function (Blueprint $table) {
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->string('audience', 30);

            $table->unique(['campaign_id', 'audience']);
            $table->index('audience');
        });

        Schema::create('ad_campaign_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->string('country_code', 2)->default('PT');
            $table->string('district')->nullable();
            $table->string('municipality')->nullable();

            $table->index(['campaign_id', 'country_code']);
            $table->index(['district', 'municipality']);
        });

        Schema::create('ad_campaign_zone', function (Blueprint $table) {
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->foreignUuid('zone_id')->constrained('ad_zones')->cascadeOnDelete();

            $table->unique(['campaign_id', 'zone_id']);
        });

        Schema::create('ad_creatives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->string('type', 30)->default('native_card');
            $table->string('name');
            $table->string('headline');
            $table->text('body')->nullable();
            $table->string('cta_label', 80)->nullable();
            $table->string('target_url')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('whatsapp', 50)->nullable();
            $table->string('image_path')->nullable();
            $table->string('mobile_image_path')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'active', 'sort_order']);
        });

        Schema::create('ad_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->foreignUuid('reviewer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decision', 30);
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->json('snapshot')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'created_at']);
        });

        Schema::create('ad_campaign_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 50);
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30)->nullable();
            $table->json('data')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'created_at']);
        });

        Schema::create('ad_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->foreignUuid('advertiser_id')->constrained('ad_advertisers')->restrictOnDelete();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('number', 50)->unique();
            $table->string('status', 30)->default('pending');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->timestamp('due_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('campaign_id');
        });

        Schema::create('ad_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('ad_orders')->cascadeOnDelete();
            $table->string('provider', 50);
            $table->string('provider_reference')->nullable();
            $table->string('status', 30);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['status', 'paid_at']);
        });

        Schema::create('ad_daily_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('ad_campaigns')->cascadeOnDelete();
            $table->foreignUuid('creative_id')->nullable()->constrained('ad_creatives')->cascadeOnDelete();
            $table->foreignUuid('zone_id')->nullable()->constrained('ad_zones')->nullOnDelete();
            $table->date('date');
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('viewable_impressions')->default(0);
            $table->unsignedBigInteger('unique_impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->unsignedBigInteger('unique_clicks')->default(0);
            $table->timestamps();

            $table->unique(
                ['campaign_id', 'creative_id', 'zone_id', 'date'],
                'ad_daily_stats_unique'
            );

            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_daily_stats');
        Schema::dropIfExists('ad_payments');
        Schema::dropIfExists('ad_orders');
        Schema::dropIfExists('ad_campaign_events');
        Schema::dropIfExists('ad_reviews');
        Schema::dropIfExists('ad_creatives');
        Schema::dropIfExists('ad_campaign_zone');
        Schema::dropIfExists('ad_campaign_locations');
        Schema::dropIfExists('ad_campaign_audiences');
        Schema::dropIfExists('ad_campaign_channels');
        Schema::dropIfExists('ad_campaigns');
        Schema::dropIfExists('ad_price_rules');
        Schema::dropIfExists('ad_zones');
        Schema::dropIfExists('ad_categories');
        Schema::dropIfExists('ad_advertisers');
        Schema::dropIfExists('ad_settings');
    }
};
