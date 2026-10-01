<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tvde_import_changes', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tvde_import_id')
                ->constrained('tvde_imports')
                ->cascadeOnDelete();

            $table->foreignUuid('tvde_operator_id')
                ->constrained('tvde_operators')
                ->cascadeOnDelete();

            $table->foreignUuid('tvde_operator_registration_id')
                ->nullable()
                ->constrained('tvde_operator_registrations')
                ->nullOnDelete();

            $table->string('change_type', 20)
                ->index();

            $table->json('changed_fields')
                ->nullable();

            $table->json('before_data')
                ->nullable();

            $table->json('after_data')
                ->nullable();

            $table->timestamps();

            $table->index(
                ['tvde_import_id', 'change_type'],
                'tvde_changes_import_type_idx'
            );

            $table->index(
                ['tvde_operator_id', 'created_at'],
                'tvde_changes_operator_date_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'tvde_import_changes'
        );
    }
};
