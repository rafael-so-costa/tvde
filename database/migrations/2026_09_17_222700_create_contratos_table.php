<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contratos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('template_id')
                ->nullable()
                ->constrained('templates_contrato')
                ->nullOnDelete();

            $table->string('tipo', 40);

            $table->foreignUuid('proprietario_id')
                ->nullable()
                ->constrained('proprietarios')
                ->nullOnDelete();

            $table->foreignUuid('motorista_id')
                ->nullable()
                ->constrained('motoristas')
                ->nullOnDelete();

            $table->foreignUuid('veiculo_id')
                ->nullable()
                ->constrained('veiculos')
                ->nullOnDelete();

            $table->date('data_inicio')->nullable();
            $table->date('data_fim')->nullable();

            $table->timestamp('data_assinatura')
                ->nullable();

            $table->decimal('valor_diaria', 10, 2)
                ->nullable();

            $table->decimal('valor_semanal', 10, 2)
                ->nullable();

            $table->decimal('valor_caucao', 10, 2)
                ->nullable();

            $table->decimal('valor_total', 10, 2)
                ->nullable();

            $table->string('status', 30)
                ->default('rascunho');

            $table->text('pdf_gerado_url')->nullable();

            $table->text(
                'assinatura_proprietario_url'
            )->nullable();

            $table->text(
                'assinatura_motorista_url'
            )->nullable();

            $table->uuid('contrato_pai_id')
                ->nullable();

            $table->integer('renovacao_count')
                ->default(0);

            $table->json('campos_preenchidos')
                ->default('{}');

            $table->integer('versao_atual')
                ->default(1);

            $table->string('hash_documento')
                ->nullable();

            $table->boolean('bloqueado')
                ->default(false);

            $table->timestamps();

            $table->foreign('contrato_pai_id')
                ->references('id')
                ->on('contratos')
                ->nullOnDelete();

            $table->index(
                ['tenant_id', 'status'],
                'contratos_tenant_status_index'
            );

            $table->index(
                ['tenant_id', 'tipo'],
                'contratos_tenant_tipo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contratos');
    }
};
