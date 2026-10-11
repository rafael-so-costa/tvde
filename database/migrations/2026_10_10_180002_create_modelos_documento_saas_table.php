<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'modelos_documento_saas',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table
                    ->foreignUuid('categoria_id')
                    ->constrained(
                        'modelo_documento_saas_categorias'
                    )
                    ->restrictOnDelete();

                $table->string('nome');
                $table->string('slug')->unique();

                $table->text('resumo')->nullable();
                $table->text('descricao')->nullable();

                $table
                    ->string(
                        'tipo_documento',
                        100
                    )
                    ->nullable();

                $table
                    ->string(
                        'pais',
                        2
                    )
                    ->default('PT');

                $table
                    ->string(
                        'idioma',
                        10
                    )
                    ->default('pt-PT');

                /*
                 * Conteúdo de trabalho do administrador.
                 *
                 * Pode ser alterado enquanto o modelo está em preparação.
                 * Uma publicação cria snapshot imutável na tabela de versões.
                 */
                $table
                    ->longText('conteudo')
                    ->nullable();

                $table
                    ->longText(
                        'conteudo_parametrizado'
                    )
                    ->nullable();

                $table
                    ->json(
                        'campos_detectados'
                    )
                    ->nullable();

                $table
                    ->json(
                        'campos_mapeados'
                    )
                    ->nullable();

                $table
                    ->json(
                        'entidades_requeridas'
                    )
                    ->nullable();

                $table
                    ->json(
                        'assinaturas_requeridas'
                    )
                    ->nullable();

                $table
                    ->json('warnings')
                    ->nullable();

                /*
                 * rascunho
                 * publicado
                 * arquivado
                 */
                $table
                    ->string(
                        'status',
                        30
                    )
                    ->default('rascunho');

                /*
                 * Versão que será criada na próxima publicação.
                 * Ex.: 1.0, 1.1, 2.0.
                 */
                $table
                    ->string(
                        'versao',
                        50
                    )
                    ->default('1.0');

                /*
                 * Última versão efetivamente publicada.
                 */
                $table
                    ->string(
                        'versao_publicada',
                        50
                    )
                    ->nullable();

                $table
                    ->boolean(
                        'tecnicamente_validado'
                    )
                    ->default(false);

                $table
                    ->boolean(
                        'juridicamente_revisto'
                    )
                    ->default(false);

                $table
                    ->boolean('destaque')
                    ->default(false);

                $table
                    ->boolean('ativo')
                    ->default(true);

                $table
                    ->unsignedInteger('ordem')
                    ->default(0);

                $table
                    ->timestamp(
                        'publicado_em'
                    )
                    ->nullable();

                $table
                    ->foreignUuid(
                        'created_by_user_id'
                    )
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->foreignUuid(
                        'updated_by_user_id'
                    )
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->index([
                    'categoria_id',
                    'ativo',
                    'status',
                ]);

                $table->index([
                    'status',
                    'publicado_em',
                ]);

                $table->index([
                    'destaque',
                    'ordem',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'modelos_documento_saas'
        );
    }
};
