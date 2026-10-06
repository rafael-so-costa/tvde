<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('help_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('slug', 150)->unique();
            $table->string('description', 500)->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('active')->default(true);
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['active', 'position']);
        });

        Schema::create('help_contents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('help_categories')->restrictOnDelete();
            $table->string('type', 20);
            $table->string('title', 200);
            $table->string('slug', 230)->unique();
            $table->string('excerpt', 500)->nullable();
            $table->longText('body')->nullable();
            $table->string('youtube_url', 1000)->nullable();
            $table->string('youtube_video_id', 30)->nullable();
            $table->string('feature_key', 80)->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('featured')->default(false);
            $table->boolean('active')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['active', 'published_at']);
            $table->index(['category_id', 'active', 'position']);
            $table->index(['type', 'active']);
            $table->index(['feature_key', 'active']);
            $table->index(['featured', 'active']);
        });

        Schema::create('help_content_audiences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('content_id')->constrained('help_contents')->cascadeOnDelete();
            $table->string('audience', 30);

            $table->unique(['content_id', 'audience']);
            $table->index('audience');
        });

        Schema::create('help_content_views', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('content_id')->constrained('help_contents')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->json('audiences')->nullable();
            $table->unsignedInteger('views')->default(1);
            $table->dateTime('first_viewed_at');
            $table->dateTime('last_viewed_at');
            $table->timestamps();

            $table->unique(['content_id', 'user_id', 'tenant_id']);
            $table->index(['tenant_id', 'last_viewed_at']);
            $table->index(['content_id', 'last_viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('help_content_views');
        Schema::dropIfExists('help_content_audiences');
        Schema::dropIfExists('help_contents');
        Schema::dropIfExists('help_categories');
    }
};
