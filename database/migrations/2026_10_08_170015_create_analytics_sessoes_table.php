<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_sessoes',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->uuid('visitor_id')->index();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('tenant_id')
                ->nullable()
                ->constrained('tenants')
                ->nullOnDelete();

            $table->string('ip_hash',64)->nullable();
            $table->text('landing_url')->nullable();
            $table->text('referrer')->nullable();

            $table->string('utm_source',150)->nullable();
            $table->string('utm_medium',150)->nullable();
            $table->string('utm_campaign',150)->nullable();
            $table->string('utm_content',150)->nullable();
            $table->string('utm_term',150)->nullable();

            $table->string('device_type',30)->nullable();
            $table->string('browser',80)->nullable();
            $table->string('os',80)->nullable();
            $table->string('language',30)->nullable();

            $table->unsignedInteger('screen_width')->nullable();
            $table->unsignedInteger('screen_height')->nullable();
            $table->unsignedInteger('pageviews')->default(0);
            $table->unsignedInteger('active_seconds')->default(0);

            $table->dateTime('started_at');
            $table->dateTime('last_seen_at');

            $table->timestamps();

            $table->index(
                ['started_at','last_seen_at'],
                'analytics_sessoes_periodo_index'
            );

            $table->index(
                ['utm_source','utm_medium'],
                'analytics_sessoes_origem_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_sessoes');
    }
};
