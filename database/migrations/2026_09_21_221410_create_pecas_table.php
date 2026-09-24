<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pecas',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('fornecedor_preferencial_id')
                ->nullable()
                ->constrained('fornecedores')
                ->nullOnDelete();

            $table->string('codigo',100);
            $table->string('nome');
            $table->string('fabricante')->nullable();
            $table->string('unidade',30)->default('un');

            $table->decimal('estoque_atual',15,3)->default(0);
            $table->decimal('estoque_minimo',15,3)->default(0);
            $table->decimal('custo_medio',15,4)->default(0);

            $table->boolean('ativo')->default(true);

            $table->timestamps();

            $table->unique(
                ['tenant_id','codigo'],
                'pecas_tenant_codigo_unique'
            );

            $table->index(
                ['tenant_id','ativo'],
                'pecas_tenant_ativo_index'
            );

            $table->index(
                ['tenant_id','nome'],
                'pecas_tenant_nome_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pecas');
    }
};
