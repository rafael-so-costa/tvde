<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up():void
    {
        Schema::table(
            'checklist_assinaturas',
            function(Blueprint $table){
                $table
                    ->string(
                        'codigo_otp',
                        255
                    )
                    ->nullable()
                    ->change();
            }
        );

        DB::table(
            'checklist_assinaturas'
        )
            ->whereNotNull(
                'codigo_otp'
            )
            ->orderBy(
                'id'
            )
            ->get([
                'id',
                'codigo_otp',
            ])
            ->each(
                function($row){
                    $value=
                        (string)
                        $row->codigo_otp;

                    if($value===''){
                        return;
                    }

                    $alreadyHashed=
                        str_starts_with(
                            $value,
                            '$2y$'
                        ) ||
                        str_starts_with(
                            $value,
                            '$2a$'
                        ) ||
                        str_starts_with(
                            $value,
                            '$argon2'
                        );

                    if($alreadyHashed){
                        return;
                    }

                    DB::table(
                        'checklist_assinaturas'
                    )
                        ->where(
                            'id',
                            $row->id
                        )
                        ->update([
                            'codigo_otp'=>
                                Hash::make(
                                    $value
                                ),
                        ]);
                }
            );
    }

    public function down():void
    {
        DB::table(
            'checklist_assinaturas'
        )
            ->whereNotNull(
                'codigo_otp'
            )
            ->update([
                'codigo_otp'=>null,
            ]);

        Schema::table(
            'checklist_assinaturas',
            function(Blueprint $table){
                $table
                    ->string(
                        'codigo_otp',
                        20
                    )
                    ->nullable()
                    ->change();
            }
        );
    }
};