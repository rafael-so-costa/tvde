<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('motoristas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('nome_completo');
            $table->date('data_nascimento')->nullable();
            $table->integer('filhos')->default(0);
            $table->string('estado_civil', 30)->nullable();

            $table->string('tipo_documento', 30)->nullable();
            $table->string('numero_documento', 100)->nullable();
            $table->date('documento_valid_until')->nullable();

            $table->string('carta_numero', 100)->nullable();
            $table->date('carta_valid_until')->nullable();

            $table->date('registo_criminal_valid_until')->nullable();

            $table->string('nif', 20)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('telemovel', 20)->nullable();

            $table->text('endereco')->nullable();
            $table->text('endereco_rua')->nullable();
            $table->text('endereco_numero')->nullable();
            $table->text('endereco_complemento')->nullable();
            $table->text('endereco_cidade')->nullable();
            $table->text('endereco_cep')->nullable();

            $table->string('iban', 50)->nullable();

            $table->text('foto_perfil_url')->nullable();
            $table->json('fotos_galeria')->default('[]');

            $table->text('bolt_email')->nullable();
            $table->text('bolt_telemovel')->nullable();
            $table->text('uber_email')->nullable();
            $table->text('uber_telemovel')->nullable();

            $table->text('certificado_tvde')->nullable();
            $table->date('certificado_tvde_valid_until')->nullable();

            $table->text('cartao_frota')->nullable();

            $table->text('contato_urgencia_nome')->nullable();
            $table->text('contato_urgencia_telemovel')->nullable();

            $table->json('documentos_upload')->default('[]');

            $table->boolean('ativo')->default(true);
            $table->string('status_cadastro', 20)->default('pendente');

            $table->timestamps();

            $table->index('tenant_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('motoristas');
    }
};
