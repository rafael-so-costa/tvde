<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'checklist_process_templates',
            function (Blueprint $table): void {
                $table
                    ->string(
                        'preset_codigo',
                        100
                    )
                    ->nullable()
                    ->after(
                        'tenant_id'
                    );

                $table
                    ->unsignedInteger(
                        'preset_versao'
                    )
                    ->nullable()
                    ->after(
                        'preset_codigo'
                    );

                $table->index(
                    [
                        'tenant_id',
                        'preset_codigo',
                    ],
                    'process_templates_tenant_preset_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'checklist_process_templates',
            function (Blueprint $table): void {
                $table->dropIndex(
                    'process_templates_tenant_preset_index'
                );

                $table->dropColumn([
                    'preset_codigo',
                    'preset_versao',
                ]);
            }
        );
    }
};