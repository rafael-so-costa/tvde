<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'templates_contrato',
            function (Blueprint $table): void {
                $table
                    ->foreignUuid(
                        'modelo_documento_saas_id'
                    )
                    ->nullable()
                    ->after('tenant_id')
                    ->constrained(
                        'modelos_documento_saas'
                    )
                    ->nullOnDelete();

                $table
                    ->foreignUuid(
                        'modelo_documento_saas_versao_id'
                    )
                    ->nullable()
                    ->after(
                        'modelo_documento_saas_id'
                    )
                    ->constrained(
                        'modelo_documento_saas_versoes'
                    )
                    ->nullOnDelete();

                /*
                 * Mantemos também a versão como texto.
                 *
                 * Assim a informação histórica permanece explícita
                 * mesmo se um dia a referência da versão for removida.
                 */
                $table
                    ->string(
                        'modelo_documento_saas_versao',
                        50
                    )
                    ->nullable()
                    ->after(
                        'modelo_documento_saas_versao_id'
                    );

                $table->index(
                    [
                        'tenant_id',
                        'modelo_documento_saas_id',
                    ],
                    'template_modelo_saas_tenant_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'templates_contrato',
            function (Blueprint $table): void {
                $table->dropIndex(
                    'template_modelo_saas_tenant_idx'
                );

                $table->dropForeign([
                    'modelo_documento_saas_versao_id',
                ]);

                $table->dropForeign([
                    'modelo_documento_saas_id',
                ]);

                $table->dropColumn([
                    'modelo_documento_saas_id',
                    'modelo_documento_saas_versao_id',
                    'modelo_documento_saas_versao',
                ]);
            }
        );
    }
};
