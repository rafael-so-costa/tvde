<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'alert_deliveries',
            function(Blueprint $table){
                $table->unique(
                    [
                        'alert_recipient_id',
                        'channel',
                    ],
                    'alert_deliveries_recipient_channel_unique'
                );
            }
        );

        /*
         * As regras nativas já criadas antes deste
         * módulo tinham apenas in_app.
         *
         * Tornamos email um canal disponível,
         * mas ele continuará opt-in por utilizador.
         */
        DB::table('alert_rules')
            ->where(
                'description',
                'Regra nativa do FrotaPro.'
            )
            ->orderBy('id')
            ->get([
                'id',
                'channels',
            ])
            ->each(function($row){
                $channels=json_decode(
                    $row->channels ?: '[]',
                    true
                );

                if(!is_array($channels)){
                    $channels=[];
                }

                if(
                    !in_array(
                        'in_app',
                        $channels,
                        true
                    )
                ){
                    $channels[]='in_app';
                }

                if(
                    !in_array(
                        'email',
                        $channels,
                        true
                    )
                ){
                    $channels[]='email';
                }

                DB::table(
                    'alert_rules'
                )
                    ->where(
                        'id',
                        $row->id
                    )
                    ->update([
                        'channels'=>
                            json_encode(
                                array_values(
                                    array_unique(
                                        $channels
                                    )
                                )
                            ),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table(
            'alert_deliveries',
            function(Blueprint $table){
                $table->dropUnique(
                    'alert_deliveries_recipient_channel_unique'
                );
            }
        );
    }
};
