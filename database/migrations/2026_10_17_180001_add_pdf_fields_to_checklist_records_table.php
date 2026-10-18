<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'checklist_records',
            function(Blueprint $table){
                $table
                    ->text('pdf_url')
                    ->nullable()
                    ->after(
                        'assinatura_motorista_path'
                    );

                $table
                    ->string(
                        'hash_documento',
                        64
                    )
                    ->nullable()
                    ->after(
                        'pdf_url'
                    );
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'checklist_records',
            function(Blueprint $table){
                $table->dropColumn([
                    'pdf_url',
                    'hash_documento',
                ]);
            }
        );
    }
};