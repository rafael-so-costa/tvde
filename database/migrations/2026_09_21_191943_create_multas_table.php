<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('multas',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $table->foreignUuid('motorista_id')->nullable()->constrained('motoristas')->nullOnDelete();

            $table->string('numero_notificacao',100)->nullable();
            $table->date('data_multa');
            $table->string('tipo',40)->default('outro');
            $table->decimal('valor',12,2);
            $table->string('status',30)->default('pendente');
            $table->string('localizacao')->nullable();
            $table->text('descricao')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['tenant_id','data_multa'],'multas_tenant_data_index');
            $table->index(['tenant_id','status'],'multas_tenant_status_index');
            $table->index(['tenant_id','tipo'],'multas_tenant_tipo_index');
            $table->index(['veiculo_id','data_multa'],'multas_veiculo_data_index');
            $table->index(['motorista_id','data_multa'],'multas_motorista_data_index');
            $table->index(['tenant_id','numero_notificacao'],'multas_notificacao_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('multas');
    }
};
