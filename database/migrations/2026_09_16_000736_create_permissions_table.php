<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('codigo', 100)->unique();
            $table->string('modulo', 100);
            $table->string('nome', 150);
            $table->string('descricao')->nullable();
            $table->timestamps();

            $table->index('modulo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
