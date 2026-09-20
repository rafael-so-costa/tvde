<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'checklist_process_run_items',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('run_id')
                    ->constrained(
                        'checklist_process_runs'
                    )
                    ->cascadeOnDelete();

                $table->foreignUuid(
                    'template_item_id'
                )
                    ->nullable()
                    ->constrained(
                        'checklist_process_template_items'
                    )
                    ->nullOnDelete();

                $table->string('codigo', 100);

                $table->unsignedInteger('ordem')
                    ->default(0);

                $table->string(
                    'titulo_snapshot',
                    255
                );

                $table->text(
                    'descricao_snapshot'
                )->nullable();

                $table->string('tipo', 40);

                $table->boolean('obrigatorio')
                    ->default(true);

                $table->json(
                    'configuracao_snapshot'
                )->default('{}');

                $table->string('status', 30)
                    ->default('pendente');

                $table->json('resultado')
                    ->nullable();

                $table->foreignUuid(
                    'concluido_por'
                )
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamp(
                    'concluido_em'
                )->nullable();

                $table->timestamps();

                $table->unique(
                    ['run_id', 'codigo'],
                    'process_run_items_codigo_unique'
                );

                $table->index(
                    ['run_id', 'ordem'],
                    'process_run_items_ordem_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'checklist_process_run_items'
        );
    }
};
