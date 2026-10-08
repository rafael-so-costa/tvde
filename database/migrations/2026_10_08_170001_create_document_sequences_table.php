<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sequences',function(Blueprint $table){
            $table->string('chave',50)->primary();
            $table->unsignedBigInteger('ultimo_numero')->default(0);
            $table->timestamps();
        });

        DB::table('document_sequences')->insert([
            'chave'=>'documentos',
            'ultimo_numero'=>0,
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sequences');
    }
};
