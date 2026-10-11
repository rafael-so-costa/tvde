<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'contrato_relacoes',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table
                    ->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table
                    ->foreignUuid('contrato_origem_id')
                    ->constrained('contratos')
                    ->cascadeOnDelete();

                $table
                    ->foreignUuid('contrato_relacionado_id')
                    ->constrained('contratos')
                    ->cascadeOnDelete();

                $table
                    ->foreignUuid('process_run_item_id')
                    ->constrained('checklist_process_run_items')
                    ->cascadeOnDelete();

                $table->string(
                    'tipo_contrato_codigo_snapshot',
                    100
                );

                $table
                    ->string(
                        'status_conclusao',
                        30
                    )
                    ->default('assinado');

                $table
                    ->foreignUuid('created_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->unique(
                    [
                        'tenant_id',
                        'process_run_item_id',
                    ],
                    'contrato_relacoes_item_unique'
                );

                $table->index(
                    [
                        'tenant_id',
                        'contrato_origem_id',
                    ],
                    'contrato_relacoes_origem_index'
                );

                $table->index(
                    [
                        'tenant_id',
                        'contrato_relacionado_id',
                    ],
                    'contrato_relacoes_relacionado_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'contrato_relacoes'
        );
    }
};
