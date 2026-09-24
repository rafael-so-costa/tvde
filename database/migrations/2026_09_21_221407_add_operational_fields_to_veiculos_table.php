<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('veiculos',function(Blueprint $table){
            $table->unsignedBigInteger('km_atual')->nullable()->after('via_verde');
            $table->timestamp('km_atualizado_em')->nullable()->after('km_atual');
            $table->string('km_origem',30)->nullable()->after('km_atualizado_em');

            $table->string('disponibilidade',30)
                ->default('disponivel')
                ->after('km_origem');

            $table->text('indisponibilidade_motivo')
                ->nullable()
                ->after('disponibilidade');

            $table->index(
                ['tenant_id','disponibilidade'],
                'veiculos_tenant_disponibilidade_index'
            );

            $table->index(
                ['tenant_id','km_atual'],
                'veiculos_tenant_km_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('veiculos',function(Blueprint $table){
            $table->dropIndex('veiculos_tenant_disponibilidade_index');
            $table->dropIndex('veiculos_tenant_km_index');

            $table->dropColumn([
                'km_atual',
                'km_atualizado_em',
                'km_origem',
                'disponibilidade',
                'indisponibilidade_motivo',
            ]);
        });
    }
};
