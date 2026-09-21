<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registos_expediente',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('motorista_id')->constrained('motoristas')->cascadeOnDelete();
            $table->timestamp('data_hora');
            $table->string('tipo',20);
            $table->date('data_local');
            $table->string('origem',20)->default('app');
            $table->string('ip_address',45)->nullable();
            $table->string('user_agent',500)->nullable();
            $table->boolean('corrigido')->default(false);
            $table->foreignUuid('corrigido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('corrigido_em')->nullable();
            $table->text('observacoes_correcao')->nullable();
            $table->timestamps();

            $table->index(['tenant_id','data_hora'],'expediente_tenant_data_index');
            $table->index(['motorista_id','data_local'],'expediente_motorista_data_index');
            $table->index(['tenant_id','motorista_id','data_hora'],'expediente_motorista_hora_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registos_expediente');
    }
};
