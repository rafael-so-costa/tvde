<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('perfis_template', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('nome');
            $table->text('descricao')->nullable();
            $table->integer('ordem')->default(0);

            $table->timestamps();

            $table->unique(
                ['tenant_id', 'nome'],
                'perfis_template_tenant_nome_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perfis_template');
    }
};
