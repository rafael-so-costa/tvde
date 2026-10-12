<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'billing_charges',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->uuid('tenant_id')
                    ->nullable()
                    ->index();

                $table->string(
                    'source_type',
                    50
                );

                $table->uuid(
                    'source_id'
                );

                $table->string(
                    'number',
                    50
                )->unique();

                $table->string(
                    'status',
                    30
                )->default('pending');

                $table->string(
                    'description'
                )->nullable();

                $table->timestamp(
                    'period_start'
                )->nullable();

                $table->timestamp(
                    'period_end'
                )->nullable();

                $table->decimal(
                    'subtotal',
                    12,
                    2
                )->default(0);

                $table->decimal(
                    'discount',
                    12,
                    2
                )->default(0);

                $table->decimal(
                    'total',
                    12,
                    2
                );

                $table->string(
                    'currency',
                    3
                )->default('EUR');

                $table->timestamp(
                    'due_at'
                )->nullable();

                $table->timestamp(
                    'paid_at'
                )->nullable();

                $table->string(
                    'idempotency_key'
                )->unique();

                $table->json(
                    'metadata'
                )->nullable();

                $table->timestamps();

                $table->index([
                    'source_type',
                    'source_id',
                ]);

                $table->index([
                    'status',
                    'due_at',
                ]);

                $table->foreign(
                    'tenant_id'
                )
                    ->references('id')
                    ->on('tenants')
                    ->nullOnDelete();
            }
        );

        Schema::create(
            'billing_payments',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->uuid(
                    'billing_charge_id'
                );

                $table->string(
                    'provider',
                    50
                );

                $table->string(
                    'method',
                    50
                );

                $table->string(
                    'status',
                    30
                )->default('pending');

                $table->decimal(
                    'amount',
                    12,
                    2
                );

                $table->string(
                    'currency',
                    3
                )->default('EUR');

                $table->string(
                    'external_id'
                )->nullable();

                $table->string(
                    'provider_reference'
                )->nullable();

                $table->string(
                    'entity',
                    20
                )->nullable();

                $table->string(
                    'reference',
                    50
                )->nullable();

                $table->timestamp(
                    'expires_at'
                )->nullable();

                $table->timestamp(
                    'paid_at'
                )->nullable();

                $table->json(
                    'metadata'
                )->nullable();

                $table->timestamps();

                $table->foreign(
                    'billing_charge_id'
                )
                    ->references('id')
                    ->on('billing_charges')
                    ->cascadeOnDelete();

                $table->index([
                    'provider',
                    'method',
                    'status',
                ]);

                $table->index(
                    'external_id'
                );

                $table->index(
                    'provider_reference'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'billing_payments'
        );

        Schema::dropIfExists(
            'billing_charges'
        );
    }
};