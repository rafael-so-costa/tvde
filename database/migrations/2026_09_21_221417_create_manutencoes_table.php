<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencoes',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('veiculo_id')
                ->constrained('veiculos')
                ->cascadeOnDelete();

            $table->foreignUuid('motorista_id')
                ->nullable()
                ->constrained('motoristas')
                ->nullOnDelete();

            $table->foreignUuid('plano_id')
                ->nullable()
                ->constrained('manutencao_planos')
                ->nullOnDelete();

            $table->foreignUuid('checklist_record_id')
                ->nullable()
                ->constrained('checklist_records')
                ->nullOnDelete();

            $table->foreignUuid('sinistro_id')
                ->nullable()
                ->constrained('sinistros')
                ->nullOnDelete();

            $table->foreignUuid('fornecedor_id')
                ->nullable()
                ->constrained('fornecedores')
                ->nullOnDelete();

            $table->string('numero_ordem',50)->nullable();

            $table->string('origem',30)->default('manual');
            $table->string('tipo_servico',150);
            $table->string('prioridade',20)->default('normal');
            $table->string('status',40)->default('rascunho');

            $table->text('problema_reportado')->nullable();

            $table->unsignedBigInteger('km')->nullable();

            $table->date('data_solicitacao');
            $table->date('data_agendada')->nullable();
            $table->timestamp('data_entrada')->nullable();
            $table->timestamp('data_conclusao')->nullable();

            $table->boolean('aprovacao_obrigatoria')->default(false);
            $table->boolean('indisponibiliza_veiculo')->default(true);

            $table->decimal('valor_orcamento',15,2)->nullable();

            $table->decimal('custo_pecas',15,2)->default(0);
            $table->decimal('custo_mao_obra',15,2)->default(0);
            $table->decimal('custo_outros',15,2)->default(0);
            $table->decimal('custo_total',15,2)->default(0);

            $table->unsignedBigInteger('proxima_revisao_km')->nullable();
            $table->date('proxima_revisao_data')->nullable();

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

            $table->unique(
                ['tenant_id','numero_ordem'],
                'manutencoes_tenant_numero_ordem_unique'
            );

            $table->index(
                ['tenant_id','status'],
                'manutencoes_tenant_status_index'
            );

            $table->index(
                ['tenant_id','prioridade'],
                'manutencoes_tenant_prioridade_index'
            );

            $table->index(
                ['tenant_id','data_agendada'],
                'manutencoes_tenant_agendada_index'
            );

            $table->index(
                ['veiculo_id','status'],
                'manutencoes_veiculo_status_index'
            );

            $table->index(
                ['tenant_id','origem'],
                'manutencoes_tenant_origem_index'
            );

            $table->index('motorista_id');
            $table->index('plano_id');
            $table->index('sinistro_id');
            $table->index('checklist_record_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencoes');
    }
};
