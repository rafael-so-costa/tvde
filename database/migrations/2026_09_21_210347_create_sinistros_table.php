<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sinistros',function(Blueprint $table){
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

            $table->date('data_sinistro');
            $table->string('status',30)->default('aberto');

            $table->date('data_peritagem')->nullable();
            $table->boolean('peritagem_realizada')->default(false);

            $table->string('seguradora')->nullable();
            $table->string('apolice',150)->nullable();
            $table->string('numero_processo',150)->nullable();

            $table->json('itens_danificados')->default('[]');
            $table->text('descricao')->nullable();

            $table->boolean('teve_testemunha')->default(false);
            $table->string('nome_testemunha')->nullable();
            $table->string('telemovel_testemunha',50)->nullable();

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
                ['tenant_id','data_sinistro'],
                'sinistros_tenant_data_index'
            );

            $table->index(
                ['tenant_id','status'],
                'sinistros_tenant_status_index'
            );

            $table->index(
                ['veiculo_id','data_sinistro'],
                'sinistros_veiculo_data_index'
            );

            $table->index(
                ['motorista_id','data_sinistro'],
                'sinistros_motorista_data_index'
            );

            $table->index(
                ['tenant_id','numero_processo'],
                'sinistros_numero_processo_index'
            );

            $table->index(
                ['tenant_id','data_peritagem'],
                'sinistros_peritagem_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sinistros');
    }
};
