<?php

namespace Database\Seeders;

use App\Models\SaasPlan;
use Illuminate\Database\Seeder;

class SaasPlanSeeder extends Seeder
{
    public function run(): void
    {
        SaasPlan::updateOrCreate(
            [
                'codigo' => 'starter',
            ],
            [
                'nome' => 'Starter',

                'descricao' => 'Plano base do FrotaPRO.',

                'ativo' => true,

                'limits' => [
                    'empresas' => null,
                    'veiculos' => null,
                    'motoristas' => null,
                    'utilizadores' => null,
                ],

                'features' => [
                    'multi_company' => false,
                    'integracoes' => false,
                    'relatorios_avancados' => false,
                ],

                'ordem' => 10,
            ]
        );
    }
}
