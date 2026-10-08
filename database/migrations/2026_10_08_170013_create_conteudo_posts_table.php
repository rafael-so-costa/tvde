<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conteudo_posts',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('categoria_id')
                ->nullable()
                ->constrained('conteudo_categorias')
                ->nullOnDelete();

            $table->foreignUuid('autor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('tipo',30)->default('artigo');
            $table->string('titulo');
            $table->string('slug',180)->unique();
            $table->text('resumo')->nullable();
            $table->longText('conteudo');
            $table->string('imagem_destaque_path',500)->nullable();

            $table->string('status',30)->default('rascunho');
            $table->timestamp('publicado_em')->nullable();

            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('canonical_url',500)->nullable();
            $table->string('og_image_path',500)->nullable();
            $table->string('robots',100)->default('index,follow');

            $table->timestamps();

            $table->index(['status','publicado_em']);
            $table->index(['tipo','status']);
            $table->index(['categoria_id','status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conteudo_posts');
    }
};
