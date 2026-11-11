<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table): void {
            $table->string('privacidade_contacto_email', 190)->nullable();
            $table->string('privacidade_contacto_telefone', 30)->nullable();
            $table->string('privacidade_epd_nome', 255)->nullable();
            $table->string('privacidade_epd_email', 190)->nullable();
            $table->text('privacidade_destinatarios')->nullable();
            $table->text('privacidade_subcontratantes')->nullable();
            $table->text('privacidade_prazo_identificacao')->nullable();
            $table->text('privacidade_prazo_contratos')->nullable();
            $table->text('privacidade_prazo_fiscal')->nullable();
            $table->text('privacidade_prazo_operacional')->nullable();
            $table->text('privacidade_prazo_consentimentos')->nullable();
            $table->text('privacidade_prazo_localizacao')->nullable();
            $table->text('privacidade_transferencias_internacionais')->nullable();
            $table->text('privacidade_decisoes_automatizadas')->nullable();
            $table->text('privacidade_finalidade_localizacao')->nullable();
            $table->text('privacidade_finalidade_dados_especiais')->nullable();
            $table->text('privacidade_categorias_dados_especiais')->nullable();
            $table->text('privacidade_condicao_artigo9')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table): void {
            $table->dropColumn([
                'privacidade_contacto_email',
                'privacidade_contacto_telefone',
                'privacidade_epd_nome',
                'privacidade_epd_email',
                'privacidade_destinatarios',
                'privacidade_subcontratantes',
                'privacidade_prazo_identificacao',
                'privacidade_prazo_contratos',
                'privacidade_prazo_fiscal',
                'privacidade_prazo_operacional',
                'privacidade_prazo_consentimentos',
                'privacidade_prazo_localizacao',
                'privacidade_transferencias_internacionais',
                'privacidade_decisoes_automatizadas',
                'privacidade_finalidade_localizacao',
                'privacidade_finalidade_dados_especiais',
                'privacidade_categorias_dados_especiais',
                'privacidade_condicao_artigo9',
            ]);
        });
    }
};