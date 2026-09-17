<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('nome_empresa');
            $table->string('nif', 50);

            $table->string('email', 190)->nullable();
            $table->string('telemovel', 50)->nullable();
            $table->string('nome_gerente')->nullable();

            $table->string('endereco_rua')->nullable();
            $table->string('endereco_numero', 50)->nullable();
            $table->string('endereco_complemento')->nullable();
            $table->string('endereco_cep', 30)->nullable();
            $table->string('endereco_cidade', 150)->nullable();

            $table->string('iban', 64)->nullable();

            $table->decimal('capital_social', 15, 2)->nullable();

            $table->string('certificado_tvde')->nullable();
            $table->date('certificado_tvde_valid_until')->nullable();

            $table->text('logo_url')->nullable();

            $table->boolean('ativo')->default(true);
            $table->string('status_cadastro', 20)->default('pendente');

            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresas');
    }
};
