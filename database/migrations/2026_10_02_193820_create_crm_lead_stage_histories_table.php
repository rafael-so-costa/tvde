<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'crm_lead_stage_histories',
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
                    'from_stage_id'
                )
                    ->nullable()
                    ->constrained(
                        'crm_pipeline_stages'
                    )
                    ->nullOnDelete();

                $table->foreignUuid(
                    'to_stage_id'
                )
                    ->constrained(
                        'crm_pipeline_stages'
                    )
                    ->restrictOnDelete();

                $table->foreignUuid(
                    'changed_by_user_id'
                )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table->text(
                    'note'
                )
                    ->nullable();

                $table->timestamp(
                    'changed_at'
                )
                    ->index();

                $table->timestamps();

                $table->index(
                    [
                        'crm_lead_id',
                        'changed_at',
                    ],
                    'crm_stage_history_lead_date_idx'
                );

                $table->index(
                    [
                        'to_stage_id',
                        'changed_at',
                    ],
                    'crm_stage_history_stage_date_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'crm_lead_stage_histories'
        );
    }
};
