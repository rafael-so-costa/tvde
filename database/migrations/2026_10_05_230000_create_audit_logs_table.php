<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs',function(Blueprint $table){
            $table->uuid('id')->primary();

            /*
             * Sem foreign keys de propósito:
             * a auditoria deve sobreviver à eliminação do tenant/utilizador.
             */
            $table->uuid('tenant_id');
            $table->uuid('actor_user_id')->nullable();

            $table->string('module',60);
            $table->string('action',20);
            $table->string('source',20)->default('web');

            $table->string('auditable_type',180);
            $table->string('auditable_id',64);
            $table->string('subject_label')->nullable();

            $table->string('description',500)->nullable();

            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->string('actor_name')->nullable();
            $table->string('actor_email')->nullable();

            $table->string('ip_address',45)->nullable();
            $table->string('request_method',10)->nullable();
            $table->string('request_path',1000)->nullable();
            $table->string('user_agent',1000)->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id','created_at']);
            $table->index(['tenant_id','module','created_at']);
            $table->index(['tenant_id','action','created_at']);
            $table->index(['tenant_id','actor_user_id','created_at']);
            $table->index(['tenant_id','source','created_at']);
            $table->index([
                'tenant_id',
                'auditable_type',
                'auditable_id',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
