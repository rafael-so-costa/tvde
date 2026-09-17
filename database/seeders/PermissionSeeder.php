<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $modulos = [
            'dashboard' => 'Dashboard',
            'empresas' => 'Empresas',
            'proprietarios' => 'Proprietários',
            'motoristas' => 'Motoristas',
            'veiculos' => 'Veículos',
            'contratos' => 'Contratos',
            'templates' => 'Templates',
            'alugueres' => 'Alugueres',
            'checklist' => 'Checklists',
            'multas' => 'Multas',
            'sinistros' => 'Sinistros',
            'manutencao' => 'Manutenção',
            'assinaturas' => 'Assinaturas',
            'funcionarios' => 'Funcionários',
            'chat' => 'Chat',
            'chat_interno' => 'Chat interno',
            'expediente' => 'Registo de expediente',
            'recibos_verdes' => 'Recibos verdes',
            'registos_criminais' => 'Registos criminais',
            'configuracoes' => 'Configurações',
        ];

        foreach ($modulos as $codigo => $nome) {
            Permission::updateOrCreate(
                ['codigo' => $codigo],
                [
                    'modulo' => $codigo,
                    'nome' => $nome,
                    'descricao' => "Acesso ao módulo {$nome}",
                ]
            );
        }
    }
}
