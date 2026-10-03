<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'crm_leads',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->foreignUuid(
                    'tvde_operator_id'
                )
                    ->nullable()
                    ->unique()
                    ->constrained(
                        'tvde_operators'
                    )
                    ->nullOnDelete();

                $table->foreignUuid(
                    'current_stage_id'
                )
                    ->constrained(
                        'crm_pipeline_stages'
                    )
                    ->restrictOnDelete();

                $table->foreignUuid(
                    'assigned_to_user_id'
                )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table->foreignUuid(
                    'created_by_user_id'
                )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table->foreignUuid(
                    'converted_tenant_id'
                )
                    ->nullable()
                    ->unique()
                    ->constrained(
                        'tenants'
                    )
                    ->nullOnDelete();

                $table->char(
                    'nif',
                    9
                )
                    ->nullable()
                    ->unique();

                $table->string(
                    'company_name'
                )
                    ->index();

                $table->string(
                    'contact_name'
                )
                    ->nullable();

                $table->string(
                    'email'
                )
                    ->nullable()
                    ->index();

                $table->string(
                    'phone',
                    50
                )
                    ->nullable()
                    ->index();

                $table->string(
                    'website'
                )
                    ->nullable();

                $table->string(
                    'district',
                    100
                )
                    ->nullable()
                    ->index();

                $table->string(
                    'municipality',
                    150
                )
                    ->nullable()
                    ->index();

                $table->string(
                    'source',
                    50
                )
                    ->default('manual')
                    ->index();

                $table->string(
                    'source_detail',
                    150
                )
                    ->nullable();

                $table->string(
                    'priority',
                    20
                )
                    ->default('normal')
                    ->index();

                $table->text(
                    'notes'
                )
                    ->nullable();

                $table->text(
                    'lost_reason'
                )
                    ->nullable();

                $table->json(
                    'metadata'
                )
                    ->nullable();

                $table->timestamp(
                    'last_contacted_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamp(
                    'next_follow_up_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamp(
                    'converted_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamps();

                $table->index(
                    [
                        'current_stage_id',
                        'assigned_to_user_id',
                    ],
                    'crm_leads_stage_assignee_idx'
                );

                $table->index(
                    [
                        'source',
                        'priority',
                    ],
                    'crm_leads_source_priority_idx'
                );

                $table->index(
                    [
                        'district',
                        'municipality',
                    ],
                    'crm_leads_location_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'crm_leads'
        );
    }
};
