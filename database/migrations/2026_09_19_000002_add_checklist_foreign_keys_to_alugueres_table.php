<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'alugueres',
            function (Blueprint $table) {
                $table->foreign(
                    'checklist_entrega_id'
                )
                    ->references('id')
                    ->on('checklist_records')
                    ->nullOnDelete();

                $table->foreign(
                    'checklist_devolucao_id'
                )
                    ->references('id')
                    ->on('checklist_records')
                    ->nullOnDelete();
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'alugueres',
            function (Blueprint $table) {
                $table->dropForeign([
                    'checklist_entrega_id',
                ]);

                $table->dropForeign([
                    'checklist_devolucao_id',
                ]);
            }
        );
    }
};
