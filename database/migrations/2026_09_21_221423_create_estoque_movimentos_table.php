<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_movimentos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('peca_id')
                ->constrained('pecas')
                ->cascadeOnDelete();

            $table->string('tipo', 30);
            $table->string('origem', 30);

            $table->decimal('quantidade', 15, 3);
            $table->decimal('valor_unitario', 15, 4)->default(0);

            $table->decimal('saldo_anterior', 15, 3);
            $table->decimal('saldo_posterior', 15, 3);

            $table->foreignUuid('compra_id')
                ->nullable()
                ->constrained('compras')
                ->nullOnDelete();
            $table->foreignUuid('compra_item_id')
                ->nullable()
                ->constrained('compra_itens')
                ->nullOnDelete();

            $table->foreignUuid('manutencao_id')
                ->nullable()
                ->constrained('manutencoes')
                ->nullOnDelete();

            $table->foreignUuid('manutencao_item_id')
                ->nullable()
                ->constrained('manutencao_itens')
                ->nullOnDelete();

            $table->text('observacoes')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(
                ['tenant_id', 'peca_id', 'created_at'],
                'estoque_movimentos_peca_data_index'
            );

            $table->index(
                ['tenant_id', 'tipo'],
                'estoque_movimentos_tenant_tipo_index'
            );

            $table->index(
                ['tenant_id', 'origem'],
                'estoque_movimentos_tenant_origem_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_movimentos');
    }
};
