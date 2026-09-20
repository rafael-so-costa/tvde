<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'checklist_process_templates',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table->string('codigo', 100);
                $table->string('nome', 255);
                $table->text('descricao')->nullable();

                $table->boolean('ativo')
                    ->default(true);

                $table->unsignedInteger('versao')
                    ->default(1);

                $table->timestamps();

                $table->unique(
                    ['tenant_id', 'codigo'],
                    'process_templates_tenant_codigo_unique'
                );

                $table->index(
                    ['tenant_id', 'ativo'],
                    'process_templates_tenant_ativo_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'checklist_process_templates'
        );
    }
};
