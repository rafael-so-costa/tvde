<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_media',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('checklist_record_id')
                ->constrained('checklist_records')
                ->cascadeOnDelete();

            $table->string('tipo',30);
            $table->string('contexto',60)->default('geral');
            $table->string('titulo')->nullable();

            $table->string('arquivo_nome');
            $table->string('arquivo_path',500);
            $table->string('arquivo_mime',150);
            $table->unsignedBigInteger('arquivo_tamanho');
            $table->string('hash_arquivo',64);

            $table->timestamp('capturado_em')->nullable();
            $table->json('metadados')->nullable();

            $table->foreignUuid('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(
                ['tenant_id','checklist_record_id'],
                'checklist_media_record_index'
            );

            $table->index(
                ['checklist_record_id','tipo'],
                'checklist_media_tipo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_media');
    }
};
