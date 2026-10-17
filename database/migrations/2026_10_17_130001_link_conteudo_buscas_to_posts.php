<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conteudo_buscas',function(Blueprint $table){
            $table
                ->foreignUuid('conteudo_post_id')
                ->nullable()
                ->after('ultimo_resultado_count')
                ->constrained('conteudo_posts')
                ->nullOnDelete();

            $table
                ->dateTime('pauta_criada_em')
                ->nullable()
                ->after('conteudo_post_id');

            $table->index(
                'pauta_criada_em',
                'conteudo_buscas_pauta_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('conteudo_buscas',function(Blueprint $table){
            $table->dropIndex(
                'conteudo_buscas_pauta_index'
            );

            $table->dropConstrainedForeignId(
                'conteudo_post_id'
            );

            $table->dropColumn(
                'pauta_criada_em'
            );
        });
    }
};