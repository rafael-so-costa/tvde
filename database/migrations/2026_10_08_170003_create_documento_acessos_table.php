<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documento_acessos',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('documento_id')
                ->constrained('documentos')
                ->cascadeOnDelete();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('tenant_context_id')
                ->nullable()
                ->constrained('tenants')
                ->nullOnDelete();

            $table->string('contexto',30);
            $table->string('acao',30);

            $table->string('ip_address',45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadados')->nullable();

            $table->timestamps();

            $table->index(
                ['documento_id','created_at'],
                'documento_acessos_documento_index'
            );

            $table->index(
                ['user_id','created_at'],
                'documento_acessos_user_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documento_acessos');
    }
};
