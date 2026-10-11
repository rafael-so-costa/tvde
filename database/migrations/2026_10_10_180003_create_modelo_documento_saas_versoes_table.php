<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'modelo_documento_saas_versoes',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table
                    ->foreignUuid(
                        'modelo_documento_saas_id'
                    )
                    ->constrained(
                        'modelos_documento_saas'
                    )
                    ->cascadeOnDelete();

                $table
                    ->string(
                        'versao',
                        50
                    );

                $table->longText(
                    'conteudo_original'
                );

                $table->longText(
                    'conteudo_parametrizado'
                );

                $table->json(
                    'campos_detectados'
                );

                $table->json(
                    'campos_mapeados'
                );

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

                /*
                 * SHA-256 do conteúdo parametrizado.
                 * Permite provar exatamente qual versão foi copiada.
                 */
                $table
                    ->char(
                        'checksum',
                        64
                    );

                $table
                    ->boolean(
                        'juridicamente_revisto'
                    )
                    ->default(false);

                $table
                    ->timestamp(
                        'publicado_em'
                    );

                $table
                    ->foreignUuid(
                        'created_by_user_id'
                    )
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->unique(
                    [
                        'modelo_documento_saas_id',
                        'versao',
                    ],
                    'modelo_saas_versao_unique'
                );

                $table->index(
                    [
                        'modelo_documento_saas_id',
                        'publicado_em',
                    ],
                    'modelo_saas_publicacao_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'modelo_documento_saas_versoes'
        );
    }
};
