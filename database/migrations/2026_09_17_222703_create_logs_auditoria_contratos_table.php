<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'logs_auditoria_contratos',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('contrato_id')
                    ->nullable()
                    ->constrained('contratos')
                    ->nullOnDelete();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants');

                $table->foreignUuid('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('acao', 50);

                $table->json('detalhes')
                    ->default('{}');

                $table->string('ip_address', 45)
                    ->nullable();

                $table->timestamp('created_at')
                    ->useCurrent();

                $table->index(
                    ['tenant_id', 'contrato_id'],
                    'logs_contratos_tenant_contrato_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'logs_auditoria_contratos'
        );
    }
};
