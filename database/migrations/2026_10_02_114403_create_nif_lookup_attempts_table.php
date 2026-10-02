<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'nif_lookup_attempts',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->foreignUuid(
                    'nif_enrichment_id'
                )
                    ->constrained(
                        'nif_enrichments'
                    )
                    ->cascadeOnDelete();

                $table->char(
                    'nif',
                    9
                )
                    ->index();

                $table->string(
                    'provider',
                    30
                )
                    ->default('nif_pt');

                $table->string(
                    'status',
                    20
                )
                    ->index();

                $table->unsignedSmallInteger(
                    'http_status'
                )
                    ->nullable();

                $table->string(
                    'provider_result',
                    50
                )
                    ->nullable();

                $table->string(
                    'credit_type',
                    30
                )
                    ->nullable();

                $table->json(
                    'credits'
                )
                    ->nullable();

                $table->unsignedInteger(
                    'duration_ms'
                )
                    ->nullable();

                $table->text(
                    'error_message'
                )
                    ->nullable();

                $table->timestamp(
                    'requested_at'
                )
                    ->index();

                $table->timestamps();

                $table->index([
                    'nif_enrichment_id',
                    'requested_at',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'nif_lookup_attempts'
        );
    }
};
