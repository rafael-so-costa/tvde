<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up():void
    {
        Schema::table(
            'checklist_records',
            function(Blueprint $table){
                $table
                    ->string(
                        'estado',
                        30
                    )
                    ->default(
                        'rascunho'
                    )
                    ->change();
            }
        );
    }

    public function down():void
    {
        DB::table(
            'checklist_records'
        )
            ->where(
                'estado',
                'aguardando_assinaturas'
            )
            ->update([
                'estado'=>'rascunho',
            ]);

        Schema::table(
            'checklist_records',
            function(Blueprint $table){
                $table
                    ->string(
                        'estado',
                        20
                    )
                    ->default(
                        'rascunho'
                    )
                    ->change();
            }
        );
    }
};