<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('declaracoes',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->foreignUuid('motorista_id')->nullable()->constrained('motoristas')->nullOnDelete();
            $table->foreignUuid('proprietario_id')->nullable()->constrained('proprietarios')->nullOnDelete();
            $table->foreignUuid('veiculo_id')->nullable()->constrained('veiculos')->nullOnDelete();
            $table->string('tipo',50);
            $table->string('titulo');
            $table->string('destinatario')->nullable();
            $table->longText('conteudo');
            $table->text('observacoes')->nullable();
            $table->string('status',20)->default('rascunho');
            $table->timestamp('data_emissao')->nullable();
            $table->string('pdf_url')->nullable();
            $table->string('hash_documento',64)->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('emitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id','status']);
            $table->index(['tenant_id','tipo']);
            $table->index(['tenant_id','data_emissao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('declaracoes');
    }
};
