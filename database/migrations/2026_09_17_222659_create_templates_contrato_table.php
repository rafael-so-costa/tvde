<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates_contrato', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('perfil_id')
                ->nullable()
                ->constrained('perfis_template')
                ->nullOnDelete();

            $table->string('nome');

            $table->text('arquivo_url')->nullable();

            $table->string('tipo_arquivo')
                ->default('pdf');

            $table->text('conteudo_original')->nullable();

            $table->json('campos_detectados')
                ->default('[]');

            $table->json('campos_mapeados')
                ->default('{}');

            $table->timestamps();

            $table->index(
                'perfil_id',
                'templates_contrato_perfil_id_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates_contrato');
    }
};
