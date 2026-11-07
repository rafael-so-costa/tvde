<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'rgpd_workflow_evidencias',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->restrictOnDelete();

                $table->foreignUuid('rgpd_registo_id')
                    ->constrained('rgpd_registos')
                    ->restrictOnDelete();

                $table->foreignUuid('ator_id')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->string('codigo_etapa', 80);
                $table->string('referencia', 500);

                $table->char('documento_sha256', 64);

                $table->char('assinatura_sha256', 64)
                    ->nullable();

                $table->char('pdf_sha256', 64)
                    ->nullable();

                $table->timestamp('ocorrido_em');

                $table->char('integridade_hmac', 64);

                $table->timestamps();

                $table->unique(
                    ['rgpd_registo_id', 'codigo_etapa'],
                    'rgpd_workflow_evidencia_unica'
                );

                $table->index(
                    ['tenant_id', 'codigo_etapa'],
                    'rgpd_workflow_evidencias_tenant_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'rgpd_workflow_evidencias'
        );
    }
};
