<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'crm_pipeline_stages',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->string(
                    'code',
                    50
                )
                    ->unique();

                $table->string(
                    'name',
                    100
                );

                $table->string(
                    'category',
                    20
                )
                    ->default('pipeline')
                    ->index();

                $table->string(
                    'color',
                    30
                )
                    ->nullable();

                $table->unsignedSmallInteger(
                    'position'
                )
                    ->default(0)
                    ->index();

                $table->boolean(
                    'is_default'
                )
                    ->default(false)
                    ->index();

                $table->boolean(
                    'is_terminal'
                )
                    ->default(false)
                    ->index();

                $table->boolean(
                    'is_active'
                )
                    ->default(true)
                    ->index();

                $table->timestamps();

                $table->index(
                    [
                        'category',
                        'position',
                    ],
                    'crm_stages_category_position_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'crm_pipeline_stages'
        );
    }
};
