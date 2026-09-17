<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alugueres', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('status', 20)->default('rascunho');

            $table->foreignUuid('motorista_id')
                ->nullable()
                ->constrained('motoristas')
                ->nullOnDelete();

            $table->foreignUuid('veiculo_id')
                ->nullable()
                ->constrained('veiculos')
                ->nullOnDelete();

            $table->foreignUuid('proprietario_id')
                ->nullable()
                ->constrained('proprietarios')
                ->nullOnDelete();

            /*
             * As tabelas contratos/checklists ainda não existem no
             * Laravel novo. As FKs serão adicionadas nas migrations
             * desses módulos.
             */
            $table->uuid('contrato_aluguer_id')->nullable();
            $table->uuid('contrato_prestacao_id')->nullable();
            $table->uuid('checklist_entrega_id')->nullable();
            $table->uuid('checklist_devolucao_id')->nullable();

            $table->date('data_inicio')->nullable();
            $table->date('data_fim')->nullable();
            $table->timestamp('data_finalizacao')->nullable();

            $table->integer('rascunho_passo')->default(1);
            $table->json('rascunho_dados')->default('{}');

            $table->text('observacoes')->nullable();
            $table->uuid('created_by')->nullable();

            $table->string('devolucao_tipo', 30)->nullable();
            $table->integer('devolucao_dias_atraso')->default(0);
            $table->decimal('devolucao_valor_dia', 15, 2)->default(0);
            $table->decimal('devolucao_multa_atraso', 15, 2)->default(0);
            $table->json('devolucao_multas_adicionais')->default('[]');
            $table->decimal(
                'devolucao_penalizacoes_checklist',
                15,
                2
            )->default(0);
            $table->decimal(
                'devolucao_total_pagar',
                15,
                2
            )->default(0);

            $table->boolean(
                'devolucao_declaracao_aceite'
            )->default(false);

            $table->text(
                'devolucao_assinatura_motorista_url'
            )->nullable();

            $table->text(
                'devolucao_assinatura_empresa_url'
            )->nullable();

            $table->text('devolucao_pdf_url')->nullable();
            $table->text('devolucao_observacoes')->nullable();

            $table->timestamps();

            $table->index(
                ['tenant_id', 'status'],
                'alugueres_tenant_status_index'
            );

            $table->index(
                'motorista_id',
                'alugueres_motorista_index'
            );

            $table->index(
                'veiculo_id',
                'alugueres_veiculo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alugueres');
    }
};
