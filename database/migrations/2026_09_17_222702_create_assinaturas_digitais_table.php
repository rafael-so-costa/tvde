<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assinaturas_digitais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('contrato_id')
                ->constrained('contratos')
                ->cascadeOnDelete();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants');

            $table->string('signatario_tipo', 30);

            $table->uuid('signatario_id')
                ->nullable();

            $table->foreignUuid('signatario_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('signatario_nome');

            $table->string('signatario_email');

            $table->text('assinatura_url')
                ->nullable();

            $table->string('ip_address', 45)
                ->nullable();

            $table->text('user_agent')
                ->nullable();

            $table->string('hash_documento')
                ->nullable();

            $table->string('token_verificacao')
                ->nullable();

            $table->string('codigo_otp')
                ->nullable();

            $table->timestamp('otp_expira_em')
                ->nullable();

            $table->boolean('verificado')
                ->default(false);

            $table->timestamp('assinado_em')
                ->nullable();

            $table->string('status', 30)
                ->default('pendente');

            $table->foreignUuid('solicitado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('solicitado_em')
                ->nullable()
                ->useCurrent();

            $table->text('placeholder')
                ->nullable();

            $table->timestamp('created_at')
                ->useCurrent();

            $table->index(
                'contrato_id',
                'assinaturas_digitais_contrato_index'
            );

            $table->index(
                ['signatario_user_id', 'status'],
                'assinaturas_digitais_user_status_index'
            );

            $table->index(
                ['signatario_email', 'status'],
                'assinaturas_digitais_email_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinaturas_digitais');
    }
};
