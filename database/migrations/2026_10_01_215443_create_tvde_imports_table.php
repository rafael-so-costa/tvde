<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tvde_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('source', 30)->index();
            $table->date('reference_date');
            $table->string('original_filename');
            $table->char('file_hash', 64)->unique();

            $table->string('status', 20)
                ->default('processing')
                ->index();

            $table->unsignedInteger('total_records')
                ->default(0);

            $table->unsignedInteger('new_records')
                ->default(0);

            $table->unsignedInteger('changed_records')
                ->default(0);

            $table->unsignedInteger('removed_records')
                ->default(0);

            $table->unsignedInteger('restored_records')
                ->default(0);

            $table->unsignedInteger('unchanged_records')
                ->default(0);

            $table->json('metadata')->nullable();

            $table->foreignUuid('imported_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->text('error_message')->nullable();

            $table->timestamps();

            $table->index(
                ['source', 'reference_date'],
                'tvde_imports_source_date_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tvde_imports');
    }
};
