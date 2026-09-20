<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registos_criminais',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('motorista_id')->constrained('motoristas')->cascadeOnDelete();

            $table->string('codigo_consulta',120)->nullable();
            $table->date('data_emissao')->nullable();
            $table->date('data_validade');

            $table->string('arquivo_path');
            $table->string('arquivo_nome');
            $table->string('arquivo_mime',100);
            $table->unsignedBigInteger('arquivo_tamanho');
            $table->string('hash_arquivo',64);

            $table->string('status',30)->default('pendente_validacao');
            $table->json('dados_extraidos')->nullable();

            $table->text('observacoes_empresa')->nullable();

            $table->foreignUuid('enviado_por')->nullable()->constrained('users')->nullOnDelete();

            $table->foreignUuid('validado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validado_em')->nullable();

            $table->foreignUuid('rejeitado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejeitado_em')->nullable();

            $table->timestamps();

            $table->index(['tenant_id','status']);
            $table->index(['tenant_id','data_validade']);
            $table->index(['tenant_id','motorista_id','created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registos_criminais');
    }
};
