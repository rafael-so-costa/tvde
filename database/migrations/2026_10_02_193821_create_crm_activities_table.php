<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'crm_activities',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->foreignUuid(
                    'crm_lead_id'
                )
                    ->constrained(
                        'crm_leads'
                    )
                    ->cascadeOnDelete();

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

                $table->string(
                    'type',
                    30
                )
                    ->index();

                $table->string(
                    'status',
                    20
                )
                    ->default('planned')
                    ->index();

                $table->string(
                    'subject'
                );

                $table->text(
                    'description'
                )
                    ->nullable();

                $table->text(
                    'outcome'
                )
                    ->nullable();

                $table->json(
                    'metadata'
                )
                    ->nullable();

                $table->timestamp(
                    'scheduled_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamp(
                    'completed_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamps();

                $table->index(
                    [
                        'crm_lead_id',
                        'created_at',
                    ],
                    'crm_activities_lead_date_idx'
                );

                $table->index(
                    [
                        'status',
                        'scheduled_at',
                    ],
                    'crm_activities_status_schedule_idx'
                );

                $table->index(
                    [
                        'assigned_to_user_id',
                        'status',
                    ],
                    'crm_activities_assignee_status_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'crm_activities'
        );
    }
};
