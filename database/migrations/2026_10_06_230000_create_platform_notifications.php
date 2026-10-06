<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_notifications',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->string('type',30);
            $table->string('title');
            $table->text('message');

            $table->string('severity',20)->default('medium');
            $table->string('target_scope',20)->default('all');

            $table->json('audiences');
            $table->json('channels');

            $table->string('action_url',500)->nullable();

            $table->boolean('active')->default(false);

            $table->dateTime('published_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->dateTime('synced_at')->nullable();

            $table->foreignUuid('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('updated_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['type','active']);
            $table->index(['active','published_at']);
            $table->index(['target_scope','active']);
            $table->index('expires_at');
        });

        Schema::create('platform_notification_tenants',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('platform_notification_id')
                ->constrained('platform_notifications')
                ->cascadeOnDelete();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(
                ['platform_notification_id','tenant_id'],
                'platform_notification_tenant_unique'
            );
        });

        Schema::table('help_contents',function(Blueprint $table){
            $table->dateTime('notification_synced_at')
                ->nullable()
                ->after('published_at');

            $table->index(
                'notification_synced_at',
                'help_contents_notification_synced_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('help_contents',function(Blueprint $table){
            $table->dropIndex(
                'help_contents_notification_synced_index'
            );

            $table->dropColumn(
                'notification_synced_at'
            );
        });

        Schema::dropIfExists(
            'platform_notification_tenants'
        );

        Schema::dropIfExists(
            'platform_notifications'
        );
    }
};
