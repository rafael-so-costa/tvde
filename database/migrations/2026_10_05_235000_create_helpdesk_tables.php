<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('helpdesk_tickets',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->string('number',32)->unique();

            $table->foreignUuid('tenant_id')
                ->nullable()
                ->constrained('tenants')
                ->nullOnDelete();

            $table->string('tenant_name');

            $table->foreignUuid('opened_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('assigned_to_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('type',30);
            $table->string('category',50);
            $table->string('priority',20)->default('normal');
            $table->string('status',30);

            $table->string('feature_key',80)->nullable();
            $table->string('origin_url',1000)->nullable();

            $table->string('subject');

            $table->unsignedInteger('tenant_unread_count')->default(0);
            $table->unsignedInteger('saas_unread_count')->default(0);

            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('last_message_at')->nullable();

            $table->timestamp('resolved_at')->nullable();

            $table->foreignUuid('resolved_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('closed_at')->nullable();

            $table->foreignUuid('closed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('reopened_at')->nullable();

            $table->timestamps();

            $table->index(['tenant_id','status']);
            $table->index(['tenant_id','last_message_at']);
            $table->index(['type','status']);
            $table->index(['category','status']);
            $table->index(['priority','status']);
            $table->index(['assigned_to_user_id','status']);
        });

        Schema::create('helpdesk_messages',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('ticket_id')
                ->constrained('helpdesk_tickets')
                ->cascadeOnDelete();

            $table->foreignUuid('sender_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('sender_side',20);
            $table->text('body')->nullable();
            $table->boolean('system')->default(false);
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['ticket_id','created_at']);
        });

        Schema::create('helpdesk_attachments',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('message_id')
                ->constrained('helpdesk_messages')
                ->cascadeOnDelete();

            $table->string('disk',30)->default('local');
            $table->string('path',1000);
            $table->string('original_name');
            $table->string('mime_type',150);
            $table->unsignedBigInteger('size');
            $table->string('kind',30);
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index('message_id');
        });

        Schema::create('helpdesk_ratings',function(Blueprint $table){
            $table->uuid('id')->primary();

            $table->foreignUuid('ticket_id')
                ->unique()
                ->constrained('helpdesk_tickets')
                ->cascadeOnDelete();

            $table->foreignUuid('tenant_id')
                ->nullable()
                ->constrained('tenants')
                ->nullOnDelete();

            $table->foreignUuid('submitted_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();

            $table->timestamps();

            $table->index(['tenant_id','rating']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('helpdesk_ratings');
        Schema::dropIfExists('helpdesk_attachments');
        Schema::dropIfExists('helpdesk_messages');
        Schema::dropIfExists('helpdesk_tickets');
    }
};
