<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_eventos',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('session_id')
                ->constrained('analytics_sessoes')
                ->cascadeOnDelete();

            $table->foreignUuid('content_post_id')
                ->nullable()
                ->constrained('conteudo_posts')
                ->nullOnDelete();

            $table->string('evento',80);
            $table->text('page_url')->nullable();
            $table->string('route_name',150)->nullable();

            $table->string('entity_type',80)->nullable();
            $table->uuid('entity_id')->nullable();

            $table->unsignedInteger('active_seconds')->nullable();
            $table->unsignedTinyInteger('scroll_percent')->nullable();

            $table->json('metadados')->nullable();
            $table->dateTime('ocorrido_em');

            $table->timestamps();

            $table->index(
                ['evento','ocorrido_em'],
                'analytics_eventos_tipo_periodo_index'
            );

            $table->index(
                ['session_id','ocorrido_em'],
                'analytics_eventos_sessao_periodo_index'
            );

            $table->index(
                ['content_post_id','evento'],
                'analytics_eventos_conteudo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_eventos');
    }
};
