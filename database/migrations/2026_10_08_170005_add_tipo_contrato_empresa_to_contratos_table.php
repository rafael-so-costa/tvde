<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratos',function(Blueprint $table){
            $table->foreignUuid('tipo_contrato_id')
                ->nullable()
                ->after('template_id')
                ->constrained('tipos_contrato')
                ->nullOnDelete();

            $table->foreignUuid('empresa_id')
                ->nullable()
                ->after('tipo')
                ->constrained('empresas')
                ->nullOnDelete();

            $table->index(
                ['tenant_id','tipo_contrato_id'],
                'contratos_tenant_tipo_contrato_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('contratos',function(Blueprint $table){
            $table->dropIndex('contratos_tenant_tipo_contrato_index');
            $table->dropConstrainedForeignId('empresa_id');
            $table->dropConstrainedForeignId('tipo_contrato_id');
        });
    }
};
