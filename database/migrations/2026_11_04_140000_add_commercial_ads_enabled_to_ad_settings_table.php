<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_settings', function (Blueprint $table): void {
            $table->boolean('commercial_ads_enabled')
                ->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('ad_settings', function (Blueprint $table): void {
            $table->dropColumn('commercial_ads_enabled');
        });
    }
};