<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assinaturas_digitais',function(Blueprint $table){
            $table->unsignedInteger('contrato_versao')
                ->nullable()
                ->after('contrato_id');

            $table->string('documento_hash',64)
                ->nullable()
                ->after('hash_documento');

            $table->string('documento_pdf_path',500)
                ->nullable()
                ->after('documento_hash');

            $table->index(
                ['contrato_id','contrato_versao'],
                'assinaturas_contrato_versao_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('assinaturas_digitais',function(Blueprint $table){
            $table->dropIndex('assinaturas_contrato_versao_index');
            $table->dropColumn([
                'contrato_versao',
                'documento_hash',
                'documento_pdf_path',
            ]);
        });
    }
};
