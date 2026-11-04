<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'checklist_process_runs',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table->foreignUuid('template_id')
                    ->nullable()
                    ->constrained(
                        'checklist_process_templates'
                    )
                    ->nullOnDelete();

                $table->string(
                    'template_codigo_snapshot',
                    100
                );

                $table->string(
                    'template_nome_snapshot',
                    255
                );

                $table->unsignedInteger(
                    'template_versao_snapshot'
                );

                $table->string(
                    'entidade_tipo',
                    60
                );

                $table->uuid('entidade_id');

                $table->string('status', 30)
                    ->default('pendente');

                $table->json('contexto')
                    ->default(new \Illuminate\Database\Query\Expression("('{}')"));

                $table->timestamp('iniciado_em')
                    ->nullable();

                $table->timestamp('concluido_em')
                    ->nullable();

                $table->timestamps();

                $table->unique(
                    [
                        'tenant_id',
                        'entidade_tipo',
                        'entidade_id',
                    ],
                    'process_runs_entidade_unique'
                );

                $table->index(
                    ['tenant_id', 'status'],
                    'process_runs_tenant_status_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'checklist_process_runs'
        );
    }
};
