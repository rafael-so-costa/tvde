<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compra_itens',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('compra_id')
                ->constrained('compras')
                ->cascadeOnDelete();

            $table->foreignUuid('peca_id')
                ->nullable()
                ->constrained('pecas')
                ->nullOnDelete();

            $table->string('descricao');
            $table->decimal('quantidade',15,3);
            $table->decimal('quantidade_recebida',15,3)->default(0);
            $table->decimal('valor_unitario',15,4)->default(0);
            $table->decimal('valor_total',15,2)->default(0);

            $table->timestamps();

            $table->index(
                ['tenant_id','compra_id'],
                'compra_itens_tenant_compra_index'
            );

            $table->index('peca_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compra_itens');
    }
};
