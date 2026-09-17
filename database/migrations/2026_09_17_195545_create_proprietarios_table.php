<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proprietarios', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('tipo', 20);

            $table->string('nome_completo')->nullable();
            $table->date('data_nascimento')->nullable();
            $table->unsignedInteger('filhos')->default(0);
            $table->string('estado_civil', 30)->nullable();
            $table->string('tipo_documento', 30)->nullable();
            $table->string('numero_documento', 100)->nullable();
            $table->date('documento_valid_until')->nullable();

            $table->string('nome_empresa')->nullable();
            $table->string('nif', 20)->nullable();
            $table->string('iban', 50)->nullable();
            $table->string('certidao_permanente', 100)->nullable();
            $table->date('certidao_valid_until')->nullable();
            $table->string('certificado_tvde', 100)->nullable();
            $table->date('certificado_tvde_valid_until')->nullable();
            $table->decimal('capital_social', 15, 2)->nullable();
            $table->string('nome_gerente')->nullable();

            $table->string('email', 190)->nullable();
            $table->string('telemovel', 50)->nullable();

            $table->text('endereco')->nullable();
            $table->text('endereco_rua')->nullable();
            $table->text('endereco_numero')->nullable();
            $table->text('endereco_complemento')->nullable();
            $table->text('endereco_cidade')->nullable();
            $table->text('endereco_cep')->nullable();

            $table->text('foto_perfil_url')->nullable();
            $table->json('fotos_galeria')->default('[]');

            $table->text('cartao_frota')->nullable();

            $table->boolean('ativo')->default(true);
            $table->string('status_cadastro', 20)->default('pendente');

            $table->timestamps();

            $table->index(['tenant_id', 'nif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proprietarios');
    }
};
