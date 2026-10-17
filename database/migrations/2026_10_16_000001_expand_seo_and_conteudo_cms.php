<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seo_configuracoes', function (Blueprint $table) {
            $table
                ->string('favicon_path', 500)
                ->nullable()
                ->after('og_image_path');

            $table
                ->string('social_image_path', 500)
                ->nullable()
                ->after('favicon_path');
        });

        Schema::table('conteudo_posts', function (Blueprint $table) {
            $table
                ->string('imagem_capa_path', 500)
                ->nullable()
                ->after('imagem_destaque_path');
        });

        Schema::create('conteudo_post_categoria', function (Blueprint $table) {
            $table
                ->foreignUuid('post_id')
                ->constrained('conteudo_posts')
                ->cascadeOnDelete();

            $table
                ->foreignUuid('categoria_id')
                ->constrained('conteudo_categorias')
                ->cascadeOnDelete();

            $table->primary([
                'post_id',
                'categoria_id',
            ]);
        });

        /*
         * Mantém os artigos antigos:
         * categoria_id passa a ser também registada na nova pivot.
         */
        DB::table('conteudo_posts')
            ->whereNotNull('categoria_id')
            ->select([
                'id',
                'categoria_id',
            ])
            ->get()
            ->each(function ($post) {
                DB::table('conteudo_post_categoria')
                    ->insertOrIgnore([
                        'post_id' => $post->id,
                        'categoria_id' => $post->categoria_id,
                    ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('conteudo_post_categoria');

        Schema::table('conteudo_posts', function (Blueprint $table) {
            $table->dropColumn('imagem_capa_path');
        });

        Schema::table('seo_configuracoes', function (Blueprint $table) {
            $table->dropColumn([
                'favicon_path',
                'social_image_path',
            ]);
        });
    }
};