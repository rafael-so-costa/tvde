<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'nif_enrichments',
            function (Blueprint $table): void {
                $table->uuid('id')
                    ->primary();

                $table->char(
                    'nif',
                    9
                )
                    ->unique();

                $table->string(
                    'provider',
                    30
                )
                    ->default('nif_pt')
                    ->index();

                $table->string(
                    'lookup_status',
                    20
                )
                    ->default('pending')
                    ->index();

                $table->string(
                    'title'
                )
                    ->nullable()
                    ->index();

                $table->string(
                    'seo_url'
                )
                    ->nullable();

                $table->text(
                    'address'
                )
                    ->nullable();

                $table->char(
                    'pc4',
                    4
                )
                    ->nullable();

                $table->char(
                    'pc3',
                    3
                )
                    ->nullable();

                $table->string(
                    'city'
                )
                    ->nullable()
                    ->index();

                $table->text(
                    'activity'
                )
                    ->nullable();

                $table->string(
                    'company_status',
                    50
                )
                    ->nullable()
                    ->index();

                $table->string(
                    'cae',
                    20
                )
                    ->nullable()
                    ->index();

                $table->json(
                    'contacts'
                )
                    ->nullable();

                $table->json(
                    'structure'
                )
                    ->nullable();

                $table->json(
                    'geo'
                )
                    ->nullable();

                $table->json(
                    'place'
                )
                    ->nullable();

                $table->string(
                    'alias'
                )
                    ->nullable();

                $table->text(
                    'racius_url'
                )
                    ->nullable();

                $table->text(
                    'portugalio_url'
                )
                    ->nullable();

                $table->boolean(
                    'nif_validation'
                )
                    ->nullable();

                $table->boolean(
                    'is_nif'
                )
                    ->nullable();

                $table->json(
                    'provider_credits'
                )
                    ->nullable();

                $table->json(
                    'raw_data'
                )
                    ->nullable();

                $table->text(
                    'last_error'
                )
                    ->nullable();

                $table->unsignedInteger(
                    'lookup_count'
                )
                    ->default(0);

                $table->timestamp(
                    'last_looked_up_at'
                )
                    ->nullable()
                    ->index();

                $table->timestamp(
                    'last_success_at'
                )
                    ->nullable();

                $table->timestamps();
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'nif_enrichments'
        );
    }
};
