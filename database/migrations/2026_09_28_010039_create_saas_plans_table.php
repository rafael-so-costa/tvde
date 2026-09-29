<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saas_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('codigo', 50)
                ->unique();

            $table->string('nome');

            $table->text('descricao')
                ->nullable();

            $table->boolean('ativo')
                ->default(true);

            $table->json('limits')
                ->nullable();

            $table->json('features')
                ->nullable();

            $table->unsignedSmallInteger('ordem')
                ->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saas_plans');
    }
};
