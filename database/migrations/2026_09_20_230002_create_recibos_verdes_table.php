<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recibos_verdes',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('empresa_id')
                ->nullable()
                ->constrained('empresas')
                ->nullOnDelete();

            $table->foreignUuid('motorista_id')
                ->constrained('motoristas')
                ->cascadeOnDelete();

            $table->string('numero_documento',150);
            $table->date('data_emissao');
            $table->unsignedSmallInteger('ano');
            $table->unsignedTinyInteger('mes');

            $table->string('nif_emitente',20);
            $table->string('nome_emitente')->nullable();

            $table->string('nif_adquirente',20);
            $table->string('nome_adquirente')->nullable();

            $table->decimal('valor_base',15,2);
            $table->decimal('valor_iva',15,2)->default(0);
            $table->decimal('retencao_irs',15,2)->default(0);
            $table->decimal('valor_total',15,2);

            $table->string('arquivo_path');
            $table->string('arquivo_nome');
            $table->string('arquivo_mime',100);
            $table->unsignedBigInteger('arquivo_tamanho');
            $table->string('hash_arquivo',64);

            $table->string('status',30)
                ->default('pendente_validacao');

            $table->json('dados_extraidos')->nullable();
            $table->json('avisos_validacao')->nullable();

            $table->text('observacoes_empresa')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('validado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('validado_em')->nullable();

            $table->foreignUuid('rejeitado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('rejeitado_em')->nullable();

            $table->timestamps();

            $table->unique(
                [
                    'tenant_id',
                    'motorista_id',
                    'numero_documento',
                ],
                'recibos_verdes_documento_unique'
            );

            $table->index(
                [
                    'tenant_id',
                    'ano',
                    'mes',
                ],
                'recibos_verdes_periodo_index'
            );

            $table->index(
                [
                    'tenant_id',
                    'status',
                ],
                'recibos_verdes_status_index'
            );

            $table->index(
                [
                    'tenant_id',
                    'motorista_id',
                    'created_at',
                ],
                'recibos_verdes_motorista_index'
            );

            $table->index(
                [
                    'tenant_id',
                    'empresa_id',
                ],
                'recibos_verdes_empresa_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recibos_verdes');
    }
};
