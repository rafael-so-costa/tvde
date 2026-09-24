<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compras',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('fornecedor_id')
                ->nullable()
                ->constrained('fornecedores')
                ->nullOnDelete();

            $table->string('numero_documento',100)->nullable();
            $table->string('status',40)->default('rascunho');

            $table->date('data_encomenda')->nullable();
            $table->date('data_prevista')->nullable();
            $table->date('data_recebimento')->nullable();

            $table->decimal('subtotal',15,2)->default(0);
            $table->decimal('impostos',15,2)->default(0);
            $table->decimal('total',15,2)->default(0);

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

            $table->index(
                ['tenant_id','status'],
                'compras_tenant_status_index'
            );

            $table->index(
                ['tenant_id','data_encomenda'],
                'compras_tenant_data_index'
            );

            $table->index('fornecedor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compras');
    }
};
