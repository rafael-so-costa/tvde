<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'rgpd_registos',
            function (Blueprint $table): void {
                $table->longText(
                    'documento_texto_snapshot'
                )->nullable();
            }
        );

        Schema::create(
            'rgpd_comprovativos',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->restrictOnDelete();

                $table->foreignUuid('rgpd_registo_id')
                    ->constrained('rgpd_registos')
                    ->restrictOnDelete();

                $table->foreignUuid('rgpd_assinatura_id')
                    ->constrained('rgpd_assinaturas')
                    ->restrictOnDelete();

                $table->string('tipo', 30)
                    ->default('original_assinado');

                $table->string('arquivo_path', 500);
                $table->char('arquivo_sha256', 64);
                $table->char('documento_sha256', 64);
                $table->char('assinatura_sha256', 64);
                $table->timestamp('emitido_em');

                $table->timestamps();

                $table->unique(
                    ['rgpd_registo_id', 'tipo'],
                    'rgpd_comprovativos_registo_tipo_unique'
                );

                $table->index(
                    ['tenant_id', 'tipo'],
                    'rgpd_comprovativos_tenant_tipo_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('rgpd_comprovativos');

        Schema::table(
            'rgpd_registos',
            function (Blueprint $table): void {
                $table->dropColumn(
                    'documento_texto_snapshot'
                );
            }
        );
    }
};
