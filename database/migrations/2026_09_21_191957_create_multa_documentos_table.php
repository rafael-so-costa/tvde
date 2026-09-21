<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('multa_documentos',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('multa_id')->constrained('multas')->cascadeOnDelete();

            $table->string('tipo',60);
            $table->string('arquivo_nome');
            $table->string('arquivo_path',500);
            $table->string('arquivo_mime',150);
            $table->unsignedBigInteger('arquivo_tamanho');
            $table->string('hash_arquivo',64);

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['tenant_id','multa_id'],'multa_documentos_tenant_multa_index');
            $table->index(['tenant_id','tipo'],'multa_documentos_tipo_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('multa_documentos');
    }
};
