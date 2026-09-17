<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('veiculos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('proprietario_id')
                ->nullable()
                ->constrained('proprietarios')
                ->nullOnDelete();

            $table->string('matricula', 20);
            $table->date('data_matricula')->nullable();
            $table->string('marca', 100)->nullable();
            $table->string('modelo', 100)->nullable();
            $table->string('chassi', 100)->nullable();
            $table->integer('cilindrada')->nullable();
            $table->integer('potencia')->nullable();
            $table->string('combustivel', 50)->nullable();
            $table->integer('lugares')->nullable();
            $table->integer('portas')->nullable();
            $table->string('cor', 50)->nullable();

            $table->string('carta_verde', 100)->nullable();
            $table->date('carta_verde_valid_until')->nullable();
            $table->string('inspecao_tvde', 100)->nullable();
            $table->date('inspecao_tvde_valid_until')->nullable();

            $table->date('uber_valid_until')->nullable();
            $table->date('bolt_valid_until')->nullable();
            $table->date('extintor_valid_until')->nullable();

            $table->text('foto_principal_url')->nullable();
            $table->json('fotos_galeria')->default('[]');

            $table->decimal('valor_caucao', 15, 2)->nullable();
            $table->decimal('valor_aluguel', 15, 2)->nullable();

            $table->text('via_verde')->nullable();

            $table->boolean('ativo')->default(true);
            $table->string('status_cadastro', 20)->default('pendente');

            $table->timestamps();

            $table->unique(
                ['tenant_id', 'matricula'],
                'veiculos_tenant_matricula_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculos');
    }
};
