<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alugueres', function (Blueprint $table) {
            $table->foreign('contrato_aluguer_id')
                ->references('id')
                ->on('contratos')
                ->nullOnDelete();

            $table->foreign('contrato_prestacao_id')
                ->references('id')
                ->on('contratos')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('alugueres', function (Blueprint $table) {
            $table->dropForeign([
                'contrato_aluguer_id',
            ]);

            $table->dropForeign([
                'contrato_prestacao_id',
            ]);
        });
    }
};
