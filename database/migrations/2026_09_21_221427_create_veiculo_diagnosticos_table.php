<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('veiculo_diagnosticos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('veiculo_id')
                ->constrained('veiculos')
                ->cascadeOnDelete();

            $table->foreignUuid('manutencao_id')
                ->nullable()
                ->constrained('manutencoes')
                ->nullOnDelete();

            $table->string('fonte', 30)->default('manual');
            $table->string('external_id', 150)->nullable();

            $table->string('codigo_dtc', 50)->nullable();

            $table->string('severidade', 20)->default('info');
            $table->string('status', 20)->default('aberto');

            $table->string('titulo');
            $table->text('descricao')->nullable();

            $table->json('dados_brutos')->nullable();

            $table->timestamp('detectado_em');
            $table->timestamp('resolvido_em')->nullable();
            $table->timestamp('gerou_manutencao_em')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(
                ['tenant_id', 'veiculo_id', 'status'],
                'veiculo_diagnosticos_veiculo_status_index'
            );

            $table->index(
                ['tenant_id', 'severidade'],
                'veiculo_diagnosticos_severidade_index'
            );

            $table->index(
                ['tenant_id', 'fonte'],
                'veiculo_diagnosticos_fonte_index'
            );

            $table->index(
                ['tenant_id', 'detectado_em'],
                'veiculo_diagnosticos_data_index'
            );

            $table->index(
                ['tenant_id', 'fonte', 'external_id'],
                'veiculo_diagnosticos_external_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_diagnosticos');
    }
};
