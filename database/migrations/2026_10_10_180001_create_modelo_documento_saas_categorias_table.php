<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'modelo_documento_saas_categorias',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();

                $table->string('nome');
                $table->string('slug')->unique();
                $table->text('descricao')->nullable();

                $table->unsignedInteger('ordem')->default(0);
                $table->boolean('ativo')->default(true);

                $table
                    ->foreignUuid('created_by_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->foreignUuid('updated_by_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->index([
                    'ativo',
                    'ordem',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'modelo_documento_saas_categorias'
        );
    }
};
