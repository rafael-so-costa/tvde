<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->unsignedBigInteger('numero_global')->unique();
            $table->string('codigo',32)->unique();
            $table->string('origem',20);

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('empresa_id')
                ->nullable()
                ->constrained('empresas')
                ->nullOnDelete();

            $table->foreignUuid('motorista_id')
                ->nullable()
                ->constrained('motoristas')
                ->nullOnDelete();

            $table->foreignUuid('proprietario_id')
                ->nullable()
                ->constrained('proprietarios')
                ->nullOnDelete();

            $table->foreignUuid('veiculo_id')
                ->nullable()
                ->constrained('veiculos')
                ->nullOnDelete();

            $table->string('categoria',80);
            $table->string('tipo',100);
            $table->string('titulo');

            $table->string('entidade_tipo',100);
            $table->uuid('entidade_id');

            $table->string('arquivo_nome')->nullable();
            $table->string('arquivo_path',500)->nullable();
            $table->string('arquivo_mime',150)->nullable();
            $table->unsignedBigInteger('arquivo_tamanho')->nullable();
            $table->string('hash_arquivo',64)->nullable();

            $table->string('status',40)->default('ativo');
            $table->json('metadados')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('finalizado_em')->nullable();

            $table->timestamps();

            $table->unique(
                ['entidade_tipo','entidade_id'],
                'documentos_entidade_unique'
            );

            $table->index(
                ['tenant_id','categoria','tipo'],
                'documentos_tenant_categoria_tipo_index'
            );

            $table->index(
                ['tenant_id','status'],
                'documentos_tenant_status_index'
            );

            $table->index(
                ['tenant_id','motorista_id'],
                'documentos_tenant_motorista_index'
            );

            $table->index(
                ['tenant_id','veiculo_id'],
                'documentos_tenant_veiculo_index'
            );

            $table->index(
                ['tenant_id','created_at'],
                'documentos_tenant_created_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};
