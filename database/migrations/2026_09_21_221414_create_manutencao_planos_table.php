<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencao_planos',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('nome');
            $table->string('tipo_servico',150);
            $table->text('descricao')->nullable();

            $table->unsignedBigInteger('intervalo_km')->nullable();
            $table->unsignedSmallInteger('intervalo_meses')->nullable();

            $table->unsignedBigInteger('alerta_antecedencia_km')->default(0);
            $table->unsignedSmallInteger('alerta_antecedencia_dias')->default(0);

            $table->boolean('ativo')->default(true);

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
                ['tenant_id','nome'],
                'manutencao_planos_tenant_nome_unique'
            );

            $table->index(
                ['tenant_id','ativo'],
                'manutencao_planos_tenant_ativo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencao_planos');
    }
};
