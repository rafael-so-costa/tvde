<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['codigo' => 'super_admin', 'nome' => 'Super Administrador', 'descricao' => 'Acesso global ao sistema'],
            ['codigo' => 'admin_empresa', 'nome' => 'Gestor de Frota', 'descricao' => 'Administrador da organização'],
            ['codigo' => 'funcionario', 'nome' => 'Funcionário', 'descricao' => 'Funcionário com permissões configuráveis'],
            ['codigo' => 'motorista', 'nome' => 'Motorista', 'descricao' => 'Motorista da organização'],
            ['codigo' => 'proprietario', 'nome' => 'Proprietário', 'descricao' => 'Proprietário de veículos'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['codigo' => $role['codigo']],
                $role + ['sistema' => true]
            );
        }
    }
}
