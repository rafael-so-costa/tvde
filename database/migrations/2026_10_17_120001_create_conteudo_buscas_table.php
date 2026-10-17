<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conteudo_buscas',function(Blueprint $table){
            $table->uuid('id')->primary();

            /*
             * Termo original mais recente.
             */
            $table->string('termo',150);

            /*
             * Versão normalizada para agregação estatística.
             * Ex.: "Gestão TVDE" e "gestao tvde" contam juntas.
             */
            $table->string('termo_normalizado',150)->unique();

            $table->unsignedBigInteger('total_buscas')->default(0);

            $table
                ->unsignedBigInteger('buscas_sem_resultado')
                ->default(0);

            $table
                ->unsignedInteger('ultimo_resultado_count')
                ->default(0);

            $table->dateTime('primeira_busca_em');
            $table->dateTime('ultima_busca_em');

            $table->timestamps();

            $table->index(
                ['total_buscas','ultima_busca_em'],
                'conteudo_buscas_populares_index'
            );

            $table->index(
                ['ultimo_resultado_count','total_buscas'],
                'conteudo_buscas_lacunas_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conteudo_buscas');
    }
};