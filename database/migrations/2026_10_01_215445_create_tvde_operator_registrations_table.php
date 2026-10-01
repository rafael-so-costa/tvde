<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tvde_operator_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tvde_operator_id')
                ->constrained('tvde_operators')
                ->cascadeOnDelete();

            $table->string('source', 30)
                ->index();

            $table->string('jurisdiction', 30)
                ->index();

            $table->string('source_key', 100)
                ->unique();

            $table->string('denomination');

            $table->string('license_number', 50)
                ->nullable()
                ->index();

            $table->string('district', 100)
                ->nullable()
                ->index();

            $table->string('municipality', 150)
                ->nullable()
                ->index();

            $table->string('postal_locality', 150)
                ->nullable();

            $table->boolean('active')
                ->default(true)
                ->index();

            $table->char('record_hash', 64);

            $table->json('raw_data')
                ->nullable();

            $table->foreignUuid('first_seen_import_id')
                ->nullable()
                ->constrained('tvde_imports')
                ->nullOnDelete();

            $table->foreignUuid('last_seen_import_id')
                ->nullable()
                ->constrained('tvde_imports')
                ->nullOnDelete();

            $table->foreignUuid('removed_in_import_id')
                ->nullable()
                ->constrained('tvde_imports')
                ->nullOnDelete();

            $table->timestamp('first_seen_at')
                ->nullable();

            $table->timestamp('last_seen_at')
                ->nullable();

            $table->timestamp('removed_at')
                ->nullable();

            $table->timestamps();

            $table->index(
                ['source', 'active'],
                'tvde_reg_source_active_idx'
            );

            $table->index(
                ['jurisdiction', 'active'],
                'tvde_reg_jurisdiction_active_idx'
            );

            $table->index(
                ['tvde_operator_id', 'source'],
                'tvde_reg_operator_source_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'tvde_operator_registrations'
        );
    }
};
