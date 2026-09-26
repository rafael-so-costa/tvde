<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'funcionario_invitations',
            function(Blueprint $table){
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table->foreignUuid('funcionario_id')
                    ->constrained('funcionarios')
                    ->cascadeOnDelete();

                $table->string('email',190);

                $table->char(
                    'token_hash',
                    64
                )->unique();

                $table->text(
                    'token_ciphertext'
                )->nullable();

                $table->timestamp('expires_at');

                $table->timestamp(
                    'sent_at'
                )->nullable();

                $table->timestamp(
                    'accepted_at'
                )->nullable();

                $table->timestamp(
                    'revoked_at'
                )->nullable();

                $table->unsignedSmallInteger(
                    'send_attempts'
                )->default(0);

                $table->text(
                    'last_error'
                )->nullable();

                $table->foreignUuid('created_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->index(
                    [
                        'funcionario_id',
                        'accepted_at',
                        'revoked_at',
                    ],
                    'funcionario_invites_status_index'
                );

                $table->index(
                    [
                        'tenant_id',
                        'email',
                    ],
                    'funcionario_invites_email_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'funcionario_invitations'
        );
    }
};
