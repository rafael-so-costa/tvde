<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fornecedores',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('tipo',30)->default('geral');
            $table->string('nome');
            $table->string('nif',30)->nullable();
            $table->string('email')->nullable();
            $table->string('telemovel',50)->nullable();
            $table->text('morada')->nullable();
            $table->string('contacto_responsavel')->nullable();
            $table->text('observacoes')->nullable();
            $table->boolean('ativo')->default(true);

            $table->timestamps();

            $table->unique(
                ['tenant_id','nif'],
                'fornecedores_tenant_nif_unique'
            );

            $table->index(
                ['tenant_id','tipo'],
                'fornecedores_tenant_tipo_index'
            );

            $table->index(
                ['tenant_id','ativo'],
                'fornecedores_tenant_ativo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};
