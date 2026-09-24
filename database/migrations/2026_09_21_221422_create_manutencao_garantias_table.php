<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencao_garantias',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('manutencao_id')
                ->constrained('manutencoes')
                ->cascadeOnDelete();

            $table->foreignUuid('manutencao_item_id')
                ->nullable()
                ->constrained('manutencao_itens')
                ->nullOnDelete();

            $table->foreignUuid('peca_id')
                ->nullable()
                ->constrained('pecas')
                ->nullOnDelete();

            $table->foreignUuid('fornecedor_id')
                ->nullable()
                ->constrained('fornecedores')
                ->nullOnDelete();

            $table->string('descricao');

            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->unsignedBigInteger('km_limite')->nullable();

            $table->string('status',30)->default('ativa');

            $table->timestamp('utilizada_em')->nullable();

            $table->text('observacoes')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(
                ['tenant_id','status'],
                'manutencao_garantias_tenant_status_index'
            );

            $table->index(
                ['tenant_id','data_fim'],
                'manutencao_garantias_data_fim_index'
            );

            $table->index(
                ['peca_id','status'],
                'manutencao_garantias_peca_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencao_garantias');
    }
};
