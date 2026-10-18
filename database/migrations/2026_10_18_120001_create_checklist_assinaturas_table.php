<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up():void
    {
        Schema::create(
            'checklist_assinaturas',
            function(Blueprint $table){
                $table->uuid('id')->primary();

                $table
                    ->foreignUuid(
                        'checklist_record_id'
                    )
                    ->constrained(
                        'checklist_records'
                    )
                    ->cascadeOnDelete();

                $table
                    ->foreignUuid(
                        'tenant_id'
                    )
                    ->constrained(
                        'tenants'
                    )
                    ->cascadeOnDelete();

                $table->string(
                    'papel',
                    30
                );

                $table->string(
                    'modo',
                    20
                );

                $table->string(
                    'signatario_nome'
                );

                $table->string(
                    'signatario_email',
                    190
                )->nullable();

                $table->string(
                    'assinatura_path',
                    500
                )->nullable();

                $table->string(
                    'token_verificacao',
                    100
                )->nullable()->unique();

                $table->string(
                    'codigo_otp',
                    20
                )->nullable();

                $table->timestamp(
                    'otp_expira_em'
                )->nullable();

                $table->string(
                    'status',
                    30
                )->default(
                    'pendente'
                );

                $table->boolean(
                    'verificado'
                )->default(false);

                $table->timestamp(
                    'solicitado_em'
                )->nullable();

                $table->timestamp(
                    'assinado_em'
                )->nullable();

                $table
                    ->foreignUuid(
                        'solicitado_por'
                    )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table->string(
                    'ip_address',
                    45
                )->nullable();

                $table->text(
                    'user_agent'
                )->nullable();

                $table->timestamps();

                $table->unique(
                    [
                        'checklist_record_id',
                        'papel',
                    ],
                    'checklist_assinatura_papel_unique'
                );

                $table->index(
                    [
                        'tenant_id',
                        'status',
                    ],
                    'checklist_assinaturas_tenant_status'
                );
            }
        );
    }

    public function down():void
    {
        Schema::dropIfExists(
            'checklist_assinaturas'
        );
    }
};