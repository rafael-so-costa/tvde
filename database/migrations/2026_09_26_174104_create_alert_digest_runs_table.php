<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'alert_digest_runs',
            function(Blueprint $table){
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table->foreignUuid('user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->string(
                    'channel',
                    30
                )->default('email');

                $table->date(
                    'digest_date'
                );

                $table->string(
                    'timezone',
                    64
                );

                $table->string(
                    'status',
                    30
                )->default('queued');

                $table->unsignedInteger(
                    'alert_count'
                )->default(0);

                $table->json(
                    'alert_recipient_ids'
                );

                $table->unsignedSmallInteger(
                    'attempts'
                )->default(0);

                $table->string(
                    'provider',
                    100
                )->nullable();

                $table->timestamp(
                    'queued_at'
                )->nullable();

                $table->timestamp(
                    'sent_at'
                )->nullable();

                $table->timestamp(
                    'failed_at'
                )->nullable();

                $table->text(
                    'error'
                )->nullable();

                $table->json(
                    'metadata'
                )->nullable();

                $table->timestamps();

                $table->unique(
                    [
                        'tenant_id',
                        'user_id',
                        'channel',
                        'digest_date',
                    ],
                    'alert_digest_runs_daily_unique'
                );

                $table->index(
                    [
                        'tenant_id',
                        'status',
                        'digest_date',
                    ],
                    'alert_digest_runs_status_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'alert_digest_runs'
        );
    }
};
