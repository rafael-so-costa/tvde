<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencao_aprovacoes',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('manutencao_id')
                ->constrained('manutencoes')
                ->cascadeOnDelete();

            $table->string('status',30)->default('pendente');

            $table->decimal('valor_orcamento',15,2);

            $table->foreignUuid('solicitado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('aprovado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('aprovador_nome')->nullable();
            $table->string('aprovador_email')->nullable();

            $table->string('token_hash',64)->nullable();

            $table->timestamp('expires_at')->nullable();
            $table->timestamp('respondido_em')->nullable();

            $table->string('ip_resposta',45)->nullable();
            $table->string('user_agent_resposta',500)->nullable();

            $table->text('observacoes')->nullable();

            $table->timestamps();

            $table->unique(
                'token_hash',
                'manutencao_aprovacoes_token_unique'
            );

            $table->index(
                ['tenant_id','status'],
                'manutencao_aprovacoes_tenant_status_index'
            );

            $table->index(
                ['manutencao_id','status'],
                'manutencao_aprovacoes_manutencao_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencao_aprovacoes');
    }
};
