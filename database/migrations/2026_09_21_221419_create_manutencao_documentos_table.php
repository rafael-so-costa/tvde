<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencao_documentos',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('manutencao_id')
                ->constrained('manutencoes')
                ->cascadeOnDelete();

            $table->string('tipo',60);

            $table->string('arquivo_nome');
            $table->string('arquivo_path',500);
            $table->string('arquivo_mime',150);
            $table->unsignedBigInteger('arquivo_tamanho');
            $table->string('hash_arquivo',64);

            $table->string('processamento_status',30)
                ->default('pendente');

            $table->longText('texto_extraido')->nullable();
            $table->json('dados_extraidos')->nullable();
            $table->text('processamento_erro')->nullable();
            $table->timestamp('processado_em')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(
                ['tenant_id','manutencao_id'],
                'manutencao_documentos_tenant_manutencao_index'
            );

            $table->index(
                ['tenant_id','tipo'],
                'manutencao_documentos_tenant_tipo_index'
            );

            $table->index(
                ['tenant_id','processamento_status'],
                'manutencao_documentos_processamento_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencao_documentos');
    }
};
