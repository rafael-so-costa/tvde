<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'nif_enrichment_batch_items',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->foreignUuid(
                    'nif_enrichment_batch_id'
                )
                    ->constrained(
                        'nif_enrichment_batches'
                    )
                    ->cascadeOnDelete();

                $table->foreignUuid(
                    'tvde_operator_id'
                )
                    ->nullable()
                    ->constrained(
                        'tvde_operators'
                    )
                    ->nullOnDelete();

                $table->foreignUuid(
                    'nif_enrichment_id'
                )
                    ->nullable()
                    ->constrained(
                        'nif_enrichments'
                    )
                    ->nullOnDelete();

                $table->foreignUuid(
                    'nif_lookup_attempt_id'
                )
                    ->nullable()
                    ->constrained(
                        'nif_lookup_attempts'
                    )
                    ->nullOnDelete();

                $table->char(
                    'nif',
                    9
                )
                    ->index();

                $table->string(
                    'status',
                    20
                )
                    ->default('pending')
                    ->index();

                $table->boolean(
                    'used_cache'
                )
                    ->default(false);

                $table->boolean(
                    'external_lookup'
                )
                    ->default(false);

                $table->unsignedSmallInteger(
                    'attempt_count'
                )
                    ->default(0);

                $table->text(
                    'error_message'
                )
                    ->nullable();

                $table->timestamp(
                    'started_at'
                )
                    ->nullable();

                $table->timestamp(
                    'processed_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamps();

                $table->unique(
                    [
                        'nif_enrichment_batch_id',
                        'nif',
                    ],
                    'nif_batch_items_batch_nif_unique'
                );

                $table->index(
                    [
                        'nif_enrichment_batch_id',
                        'status',
                    ],
                    'nif_batch_items_batch_status_idx'
                );

                $table->index(
                    [
                        'tvde_operator_id',
                        'status',
                    ],
                    'nif_batch_items_operator_status_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'nif_enrichment_batch_items'
        );
    }
};
