<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'templates_contrato',
            function (Blueprint $table) {
                $table->foreignUuid(
                    'checklist_process_template_id'
                )
                    ->nullable()
                    ->after('perfil_id')
                    ->constrained(
                        'checklist_process_templates'
                    )
                    ->nullOnDelete();
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'templates_contrato',
            function (Blueprint $table) {
                $table->dropConstrainedForeignId(
                    'checklist_process_template_id'
                );
            }
        );
    }
};
