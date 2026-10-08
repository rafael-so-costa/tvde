<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checklist_records',function(Blueprint $table){
            $table->foreignUuid('contrato_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('contratos')
                ->nullOnDelete();

            $table->foreignUuid('process_run_item_id')
                ->nullable()
                ->after('contrato_id')
                ->constrained('checklist_process_run_items')
                ->nullOnDelete();

            $table->string('origem',30)
                ->default('manual')
                ->after('tipo');

            $table->unique(
                'process_run_item_id',
                'checklist_records_process_item_unique'
            );

            $table->index(
                ['tenant_id','contrato_id'],
                'checklist_records_tenant_contrato_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('checklist_records',function(Blueprint $table){
            $table->dropIndex('checklist_records_tenant_contrato_index');
            $table->dropUnique('checklist_records_process_item_unique');
            $table->dropConstrainedForeignId('process_run_item_id');
            $table->dropConstrainedForeignId('contrato_id');
            $table->dropColumn('origem');
        });
    }
};
