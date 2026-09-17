<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'contratos_ativos_veiculos',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('veiculo_id')
                    ->constrained('veiculos')
                    ->cascadeOnDelete();

                $table->foreignUuid('contrato_id')
                    ->nullable()
                    ->constrained('contratos')
                    ->cascadeOnDelete();

                $table->foreignUuid('motorista_id')
                    ->constrained('motoristas')
                    ->cascadeOnDelete();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants');

                $table->timestamp('data_inicio')
                    ->useCurrent();

                $table->timestamp('data_fim')
                    ->nullable();

                $table->boolean('ativo')
                    ->default(true);

                $table->timestamp('created_at')
                    ->useCurrent();

                $table->unique(
                    ['veiculo_id', 'contrato_id'],
                    'contratos_ativos_veiculo_contrato_unique'
                );

                $table->index(
                    ['tenant_id', 'veiculo_id', 'ativo'],
                    'contratos_ativos_tenant_veiculo_index'
                );

                $table->index(
                    ['tenant_id', 'motorista_id', 'ativo'],
                    'contratos_ativos_tenant_motorista_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'contratos_ativos_veiculos'
        );
    }
};
