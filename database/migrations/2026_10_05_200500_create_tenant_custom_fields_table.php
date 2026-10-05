<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_custom_fields',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('entity',30);
            $table->string('key',80);
            $table->string('label',120);
            $table->string('type',30);
            $table->boolean('required')->default(false);
            $table->boolean('active')->default(true);
            $table->json('options')->nullable();
            $table->string('placeholder')->nullable();
            $table->string('help_text',500)->nullable();
            $table->text('default_value')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id','entity','key']);
            $table->index(['tenant_id','entity','active','sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_custom_fields');
    }
};
