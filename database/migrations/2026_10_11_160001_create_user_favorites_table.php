<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'user_favorites',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table
                    ->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table
                    ->foreignUuid('user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->string(
                    'entity_type',
                    40
                );

                $table->uuid(
                    'entity_id'
                );

                $table->timestamps();

                $table->unique(
                    [
                        'tenant_id',
                        'user_id',
                        'entity_type',
                        'entity_id',
                    ],
                    'user_favorites_entity_unique'
                );

                $table->index(
                    [
                        'tenant_id',
                        'user_id',
                        'created_at',
                    ],
                    'user_favorites_user_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'user_favorites'
        );
    }
};
