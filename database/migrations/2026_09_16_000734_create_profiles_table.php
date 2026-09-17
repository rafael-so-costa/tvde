<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->string('nif', 20)->nullable()->unique();
            $table->string('telefone', 30)->nullable();
            $table->date('data_nascimento')->nullable();
            $table->string('avatar_path')->nullable();
            $table->string('timezone', 50)->default('Europe/Lisbon');
            $table->string('locale', 10)->default('pt_PT');
            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
