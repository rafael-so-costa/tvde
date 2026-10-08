<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates_contrato',function(Blueprint $table){
            $table->boolean('ativo')
                ->default(true)
                ->after('campos_mapeados');

            $table->timestamp('arquivado_em')
                ->nullable()
                ->after('ativo');

            $table->foreignUuid('arquivado_por')
                ->nullable()
                ->after('arquivado_em')
                ->constrained('users')
                ->nullOnDelete();

            $table->index(
                ['tenant_id','ativo'],
                'templates_contrato_tenant_ativo_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('templates_contrato',function(Blueprint $table){
            $table->dropIndex('templates_contrato_tenant_ativo_index');
            $table->dropConstrainedForeignId('arquivado_por');
            $table->dropColumn([
                'ativo',
                'arquivado_em',
            ]);
        });
    }
};
