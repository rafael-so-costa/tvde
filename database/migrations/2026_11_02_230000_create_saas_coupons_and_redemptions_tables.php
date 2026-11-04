<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('saas_coupons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 64)->unique();
            $table->string('name', 160);
            $table->string('description', 500)->nullable();

            $table->string('discount_type', 20);
            $table->decimal('discount_value', 12, 2);
            $table->string('applies_to', 32)->default('both');

            $table->boolean('enabled')->default(false);
            $table->boolean('first_payment_only')->default(true);

            $table->decimal('min_subtotal', 12, 2)->nullable();
            $table->unsignedInteger('max_redemptions')->nullable();
            $table->unsignedInteger('max_per_customer')->nullable();

            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(
                ['enabled', 'starts_at', 'expires_at'],
                'sc_active_window_idx'
            );
        });

        Schema::create('saas_coupon_redemptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('saas_coupon_id');

            $table->string('customer_type', 32);
            $table->uuid('customer_id');

            $table->string('source_type', 32);
            $table->uuid('source_id');

            $table->uuid('billing_charge_id')
                ->nullable()
                ->unique('scr_one_charge_idx');

            $table->string('status', 20)->default('reserved');

            $table->decimal('subtotal_amount', 12, 2);
            $table->decimal('discount_amount', 12, 2);
            $table->string('currency', 3)->default('EUR');

            $table->string('idempotency_key', 160)
                ->unique('scr_idempotency_idx');

            $table->timestamp('reserved_until');
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamp('released_at')->nullable();

            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('saas_coupon_id', 'scr_coupon_fk')
                ->references('id')
                ->on('saas_coupons')
                ->restrictOnDelete();

            $table->foreign('billing_charge_id', 'scr_charge_fk')
                ->references('id')
                ->on('billing_charges')
                ->restrictOnDelete();

            $table->index(
                ['saas_coupon_id', 'status', 'reserved_until'],
                'scr_active_idx'
            );

            $table->index(
                ['customer_type', 'customer_id', 'status'],
                'scr_customer_idx'
            );

            $table->index(
                ['source_type', 'source_id'],
                'scr_source_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saas_coupon_redemptions');
        Schema::dropIfExists('saas_coupons');
    }
};