<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_records', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('tipo', 20);

            $table->foreignUuid('motorista_id')
                ->nullable()
                ->constrained('motoristas')
                ->nullOnDelete();

            $table->foreignUuid('veiculo_id')
                ->nullable()
                ->constrained('veiculos')
                ->nullOnDelete();

            $table->uuid('entrega_vinculada_id')->nullable();

            $table->string('motorista_nome_snapshot')->nullable();
            $table->string('matricula_snapshot', 30)->nullable();
            $table->string('modelo_snapshot')->nullable();

            $table->date('data_operacao')->nullable();
            $table->time('hora_operacao')->nullable();

            $table->unsignedBigInteger('quilometragem')->nullable();
            $table->string('nivel_combustivel', 20)->nullable();

            $table->decimal(
                'penalizacao_total',
                15,
                2
            )->default(0);

            $table->json('itens')->default(new \Illuminate\Database\Query\Expression("('{}')"));
            $table->json('campos_especiais')->default(new \Illuminate\Database\Query\Expression("('{}')"));
            $table->json('danos')->default(new \Illuminate\Database\Query\Expression("('[]')"));
            $table->json('itens_faltantes')->default(new \Illuminate\Database\Query\Expression("('{}')"));
            $table->json('novos_danos')->default(new \Illuminate\Database\Query\Expression("('[]')"));
            $table->json('media')->default(new \Illuminate\Database\Query\Expression("('{}')"));
            $table->json('metadados_seguranca')->nullable();

            $table->text('assinatura_empresa_path')->nullable();
            $table->text('assinatura_motorista_path')->nullable();

            $table->text('observacoes')->nullable();

            $table->string(
                'estado',
                20
            )->default('rascunho');

            $table->timestamp(
                'finalizado_em'
            )->nullable();

            $table->foreignUuid('realizado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->foreign(
                'entrega_vinculada_id'
            )
                ->references('id')
                ->on('checklist_records')
                ->nullOnDelete();

            $table->index(
                ['tenant_id', 'tipo'],
                'checklist_records_tenant_tipo_index'
            );

            $table->index(
                ['tenant_id', 'estado'],
                'checklist_records_tenant_estado_index'
            );

            $table->index(
                ['tenant_id', 'data_operacao'],
                'checklist_records_tenant_data_index'
            );

            $table->index('motorista_id');
            $table->index('veiculo_id');

            $table->unique(
                [
                    'tenant_id',
                    'entrega_vinculada_id',
                ],
                'checklist_records_tenant_entrega_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'checklist_records'
        );
    }
};
