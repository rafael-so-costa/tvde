<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up():void
    {
        Schema::create(
            'email_logs',
            function(Blueprint $table){
                $table->uuid('id')->primary();

                $table
                    ->foreignUuid('tenant_id')
                    ->nullable()
                    ->constrained('tenants')
                    ->nullOnDelete();

                $table
                    ->foreignUuid('initiated_by_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->string('recipient_email',190);

                $table
                    ->string('subject',500);

                $table
                    ->string('category',80);

                $table
                    ->string('mailer',50);

                $table
                    ->string('status',30)
                    ->default('processing');

                $table
                    ->unsignedInteger('attempts')
                    ->default(1);

                $table
                    ->string('related_type',100)
                    ->nullable();

                $table
                    ->string('related_id',100)
                    ->nullable();

                $table
                    ->text('error')
                    ->nullable();

                $table
                    ->timestamp('sent_at')
                    ->nullable();

                $table
                    ->timestamp('failed_at')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'status',
                    'created_at',
                ]);

                $table->index([
                    'category',
                    'created_at',
                ]);

                $table->index([
                    'tenant_id',
                    'created_at',
                ]);

                $table->index(
                    'recipient_email'
                );

                $table->index([
                    'related_type',
                    'related_id',
                ]);
            }
        );
    }

    public function down():void
    {
        Schema::dropIfExists(
            'email_logs'
        );
    }
};