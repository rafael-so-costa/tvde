<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_conversations',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type',20);
            $table->string('source',20);
            $table->string('subject',200)->nullable();
            $table->string('audience',30)->nullable();
            $table->boolean('allow_replies')->default(true);
            $table->timestamp('last_message_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['tenant_id','last_message_at']);
            $table->index(['source','type']);
            $table->index('last_message_at');
        });

        Schema::create('chat_participants',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_snapshot',50)->nullable();
            $table->timestamp('joined_at');
            $table->timestamp('last_read_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id','user_id']);
            $table->index(['user_id','archived_at']);
        });

        Schema::create('chat_messages',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignUuid('sender_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->longText('body')->nullable();
            $table->string('kind',20)->default('text');
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id','created_at']);
            $table->index(['sender_user_id','created_at']);
        });

        Schema::create('chat_attachments',function(Blueprint $table){
            $table->uuid('id')->primary();
            $table->foreignUuid('message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->string('disk',30)->default('local');
            $table->string('path',500);
            $table->string('original_name');
            $table->string('mime_type',150);
            $table->unsignedBigInteger('size');
            $table->string('kind',20);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['message_id','kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_attachments');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chat_conversations');
    }
};
