<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tvde_operators', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->char('nif', 9)->unique();

            $table->string('display_name');

            $table->timestamps();

            $table->index(
                'display_name',
                'tvde_operators_name_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tvde_operators');
    }
};
