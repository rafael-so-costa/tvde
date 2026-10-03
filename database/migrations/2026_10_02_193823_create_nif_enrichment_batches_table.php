<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'nif_enrichment_batches',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->foreignUuid(
                    'created_by_user_id'
                )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table->string(
                    'name'
                )
                    ->nullable();

                $table->string(
                    'status',
                    20
                )
                    ->default('pending')
                    ->index();

                $table->boolean(
                    'force_refresh'
                )
                    ->default(false);

                $table->unsignedInteger(
                    'total_items'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'pending_items'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'processing_items'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'success_items'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'error_items'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'skipped_items'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'cache_hits'
                )
                    ->default(0);

                $table->unsignedInteger(
                    'external_lookups'
                )
                    ->default(0);

                $table->json(
                    'metadata'
                )
                    ->nullable();

                $table->text(
                    'error_message'
                )
                    ->nullable();

                $table->timestamp(
                    'started_at'
                )
                    ->nullable();

                $table->timestamp(
                    'last_processed_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamp(
                    'completed_at'
                )
                    ->nullable();

                $table->timestamp(
                    'canceled_at'
                )
                    ->nullable();

                $table->timestamps();

                $table->index(
                    [
                        'status',
                        'created_at',
                    ],
                    'nif_batches_status_created_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'nif_enrichment_batches'
        );
    }
};
