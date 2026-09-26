<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funcionarios', function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('numero_funcionario',50)->nullable();
            $table->string('nome');
            $table->string('nif',20)->nullable();
            $table->string('email',190)->nullable();
            $table->string('telefone',30)->nullable();

            $table->date('data_nascimento')->nullable();

            $table->string('cargo',150)->nullable();
            $table->string('departamento',150)->nullable();

            $table->date('data_admissao');
            $table->date('data_saida')->nullable();

            $table->string('estado',30)->default('ativo');

            $table->text('observacoes')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(
                ['tenant_id','numero_funcionario'],
                'funcionarios_tenant_numero_unique'
            );

            $table->unique(
                ['tenant_id','nif'],
                'funcionarios_tenant_nif_unique'
            );

            $table->unique(
                ['tenant_id','email'],
                'funcionarios_tenant_email_unique'
            );

            $table->unique(
                ['tenant_id','user_id'],
                'funcionarios_tenant_user_unique'
            );

            $table->index(
                ['tenant_id','estado'],
                'funcionarios_tenant_estado_index'
            );

            $table->index(
                ['tenant_id','departamento'],
                'funcionarios_tenant_departamento_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funcionarios');
    }
};
