<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'checklist_process_template_items',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('template_id')
                    ->constrained(
                        'checklist_process_templates'
                    )
                    ->cascadeOnDelete();

                $table->string('codigo', 100);
                $table->unsignedInteger('ordem')
                    ->default(0);

                $table->string('titulo', 255);
                $table->text('descricao')
                    ->nullable();

                $table->string('tipo', 40);

                $table->boolean('obrigatorio')
                    ->default(true);

                $table->json('configuracao')
                    ->default('{}');

                $table->timestamps();

                $table->unique(
                    ['template_id', 'codigo'],
                    'process_template_items_codigo_unique'
                );

                $table->index(
                    ['template_id', 'ordem'],
                    'process_template_items_ordem_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'checklist_process_template_items'
        );
    }
};
