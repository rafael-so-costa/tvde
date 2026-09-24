<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencao_plano_veiculos',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('plano_id')
                ->constrained('manutencao_planos')
                ->cascadeOnDelete();

            $table->foreignUuid('veiculo_id')
                ->constrained('veiculos')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('ultimo_km')->nullable();
            $table->date('ultima_data')->nullable();

            $table->unsignedBigInteger('proximo_km')->nullable();
            $table->date('proxima_data')->nullable();

            $table->boolean('ativo')->default(true);

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(
                ['tenant_id','plano_id','veiculo_id'],
                'manutencao_plano_veiculo_unique'
            );

            $table->index(
                ['tenant_id','ativo'],
                'manutencao_plano_veiculos_ativo_index'
            );

            $table->index(
                ['tenant_id','proxima_data'],
                'manutencao_plano_veiculos_data_index'
            );

            $table->index(
                ['tenant_id','proximo_km'],
                'manutencao_plano_veiculos_km_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencao_plano_veiculos');
    }
};
