<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencao_itens', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('manutencao_id')
                ->constrained('manutencoes')
                ->cascadeOnDelete();

            $table->foreignUuid('peca_id')
                ->nullable()
                ->constrained('pecas')
                ->nullOnDelete();

            $table->string('tipo', 30);
            $table->string('descricao');

            $table->decimal('quantidade', 15, 3)->default(1);
            $table->string('unidade', 30)->default('un');
            $table->decimal('valor_unitario', 15, 4)->default(0);
            $table->decimal('valor_total', 15, 2)->default(0);

            $table->boolean('consome_estoque')->default(false);
            $table->timestamp('estoque_consumido_em')->nullable();
            $table->unsignedSmallInteger('garantia_meses')->nullable();
            $table->unsignedBigInteger('garantia_km')->nullable();

            $table->timestamps();

            $table->index(
                ['tenant_id', 'manutencao_id'],
                'manutencao_itens_tenant_manutencao_index'
            );

            $table->index(
                ['tenant_id', 'tipo'],
                'manutencao_itens_tenant_tipo_index'
            );

            $table->index('peca_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencao_itens');
    }
};
