<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_configuracoes',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->string('chave',100)->unique();
            $table->string('titulo')->nullable();
            $table->text('descricao')->nullable();
            $table->string('canonical_url',500)->nullable();
            $table->string('robots',100)->default('index,follow');
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->string('og_image_path',500)->nullable();
            $table->string('twitter_card',50)->default('summary_large_image');
            $table->string('schema_type',80)->nullable();
            $table->json('configuracao')->nullable();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('chave');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_configuracoes');
    }
};
