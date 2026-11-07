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
            'rgpd_registos',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->restrictOnDelete();

                $table->string('titular_tipo', 24);
                $table->uuid('titular_id')->nullable();
                $table->string('titular_nome', 255)->nullable();

                $table->string('modelo_codigo', 120);
                $table->string('versao_documento', 50);
                $table->char('documento_sha256', 64);

                $table->json('finalidades_especificas')
                    ->nullable();

                $table->string('estado', 24)
                    ->default('rascunho');

                $table->foreignUuid('criado_por')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->index(
                    [
                        'tenant_id',
                        'titular_tipo',
                        'titular_id',
                    ],
                    'rgpd_registos_titular_idx'
                );
            }
        );

        Schema::create(
            'rgpd_eventos',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->restrictOnDelete();

                $table->foreignUuid('rgpd_registo_id')
                    ->constrained('rgpd_registos')
                    ->restrictOnDelete();

                $table->string('finalidade', 40);
                $table->string('tipo', 24);
                $table->string('escolha', 24);

                $table->foreignUuid('ator_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamp('ocorrido_em');
                $table->timestamps();

                $table->unique(
                    [
                        'rgpd_registo_id',
                        'finalidade',
                        'tipo',
                    ],
                    'rgpd_eventos_tipo_unico'
                );

                $table->index(
                    [
                        'tenant_id',
                        'rgpd_registo_id',
                        'ocorrido_em',
                    ],
                    'rgpd_eventos_historico_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('rgpd_eventos');
        Schema::dropIfExists('rgpd_registos');
    }
};
