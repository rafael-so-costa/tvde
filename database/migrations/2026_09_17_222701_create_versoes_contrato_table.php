<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('versoes_contrato', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('contrato_id')
                ->constrained('contratos')
                ->cascadeOnDelete();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants');

            $table->integer('versao_numero')
                ->default(1);

            $table->json('dados_campos')
                ->default('{}');

            $table->foreignUuid('criado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('observacoes')
                ->nullable();

            $table->timestamp('created_at')
                ->useCurrent();

            $table->index(
                ['contrato_id', 'versao_numero'],
                'versoes_contrato_contrato_versao_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('versoes_contrato');
    }
};
