<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saas_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->unique()
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('saas_plan_id')
                ->constrained('saas_plans')
                ->restrictOnDelete();

            $table->string('status', 30)
                ->default('active');

            $table->string('billing_cycle', 20)
                ->default('monthly');

            $table->decimal('price_amount', 10, 2)
                ->nullable();

            $table->char('currency', 3)
                ->default('EUR');

            $table->timestamp('starts_at');

            $table->timestamp('trial_ends_at')
                ->nullable();

            $table->timestamp('current_period_starts_at')
                ->nullable();

            $table->timestamp('current_period_ends_at')
                ->nullable();

            $table->timestamp('cancels_at')
                ->nullable();

            $table->timestamp('canceled_at')
                ->nullable();

            $table->string('external_provider', 50)
                ->nullable();

            $table->string('external_subscription_id')
                ->nullable();

            $table->json('metadata')
                ->nullable();

            $table->timestamps();

            $table->unique(
                [
                    'external_provider',
                    'external_subscription_id',
                ],
                'saas_sub_ext_unique'
            );

            $table->index('status');
            $table->index('billing_cycle');
            $table->index('current_period_ends_at');
        });

        $now = now();

        DB::table('tenants')
            ->select([
                'id',
                'saas_plan_id',
                'created_at',
            ])
            ->whereNotNull('saas_plan_id')
            ->get()
            ->each(function ($tenant) use ($now): void {
                DB::table('saas_subscriptions')
                    ->insert([
                        'id' => Str::uuid()
                            ->toString(),

                        'tenant_id' => $tenant->id,

                        'saas_plan_id' => $tenant->saas_plan_id,

                        'status' => 'active',

                        'billing_cycle' => 'monthly',

                        'price_amount' => null,

                        'currency' => 'EUR',

                        'starts_at' => $tenant->created_at
                            ?? $now,

                        'trial_ends_at' => null,

                        'current_period_starts_at' => $now,

                        'current_period_ends_at' => $now
                            ->copy()
                            ->addMonth(),

                        'cancels_at' => null,

                        'canceled_at' => null,

                        'external_provider' => null,

                        'external_subscription_id' => null,

                        'metadata' => null,

                        'created_at' => $now,

                        'updated_at' => $now,
                    ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'saas_subscriptions'
        );
    }
};
