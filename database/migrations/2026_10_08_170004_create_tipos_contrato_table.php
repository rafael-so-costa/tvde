<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_contrato',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('nome');
            $table->string('slug',150);
            $table->string('codigo',100);
            $table->text('descricao')->nullable();

            $table->foreignUuid('template_id')
                ->nullable()
                ->constrained('templates_contrato')
                ->nullOnDelete();

            $table->foreignUuid('checklist_process_template_id')
                ->nullable()
                ->constrained('checklist_process_templates')
                ->nullOnDelete();

            $table->json('entidades')->default('{}');
            $table->json('campos_configuracao')->default('[]');
            $table->json('assinaturas_configuracao')->default('[]');
            $table->json('configuracao')->default('{}');

            $table->boolean('ativo')->default(true);
            $table->boolean('mostrar_menu')->default(true);
            $table->unsignedInteger('ordem')->default(0);

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
                ['tenant_id','codigo'],
                'tipos_contrato_tenant_codigo_unique'
            );

            $table->unique(
                ['tenant_id','slug'],
                'tipos_contrato_tenant_slug_unique'
            );

            $table->index(
                ['tenant_id','ativo','ordem'],
                'tipos_contrato_menu_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_contrato');
    }
};
