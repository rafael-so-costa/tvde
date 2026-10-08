<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conteudo_categorias',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->string('nome');
            $table->string('slug',150)->unique();
            $table->text('descricao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->unsignedInteger('ordem')->default(0);
            $table->timestamps();

            $table->index(['ativo','ordem']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conteudo_categorias');
    }
};
