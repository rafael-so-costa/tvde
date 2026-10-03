<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'crm_lead_tag',
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
                    'crm_tag_id'
                )
                    ->constrained(
                        'crm_tags'
                    )
                    ->cascadeOnDelete();

                $table->timestamps();

                $table->unique(
                    [
                        'crm_lead_id',
                        'crm_tag_id',
                    ],
                    'crm_lead_tag_unique'
                );

                $table->index(
                    'crm_tag_id',
                    'crm_lead_tag_tag_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'crm_lead_tag'
        );
    }
};
