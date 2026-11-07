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
            'rgpd_assinaturas',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->restrictOnDelete();

                $table->foreignUuid('rgpd_registo_id')
                    ->constrained('rgpd_registos')
                    ->restrictOnDelete();

                $table->string('modo', 20);

                $table->string('status', 30)
                    ->default('pendente');

                $table->string('signatario_nome', 255);

                $table->string('signatario_email', 190)
                    ->nullable();

                $table->char('documento_sha256', 64);
                $table->char('escolhas_sha256', 64);

                /*
                 * Campos reservados para a
                 * assinatura presencial ou remota.
                 * Nenhum e preenchido neste bloco.
                 */
                $table->char('token_hash', 64)
                    ->nullable()
                    ->unique();

                $table->string('otp_hash', 255)
                    ->nullable();

                $table->timestamp('otp_expira_em')
                    ->nullable();

                $table->unsignedSmallInteger('otp_tentativas')
                    ->default(0);

                $table->string('assinatura_path', 500)
                    ->nullable();

                $table->char('assinatura_sha256', 64)
                    ->nullable();

                $table->timestamp('solicitado_em');
                $table->timestamp('assinado_em')->nullable();

                $table->foreignUuid('solicitado_por')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('ip_address', 45)
                    ->nullable();

                $table->text('user_agent')
                    ->nullable();

                $table->timestamps();

                $table->unique(
                    'rgpd_registo_id',
                    'rgpd_assinaturas_registo_unique'
                );

                $table->index(
                    ['tenant_id', 'status'],
                    'rgpd_assinaturas_tenant_status'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('rgpd_assinaturas');
    }
};
