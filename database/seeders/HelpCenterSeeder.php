<?php

namespace Database\Seeders;

use App\Models\HelpCategory;
use Illuminate\Database\Seeder;

class HelpCenterSeeder extends Seeder
{
    public function run(): void
    {
        $categories=[
            ['Primeiros passos','primeiros-passos',10],
            ['Gestão da frota','gestao-da-frota',20],
            ['Motoristas','motoristas',30],
            ['Proprietários','proprietarios',40],
            ['Veículos','veiculos',50],
            ['Contratos e documentos','contratos-documentos',60],
            ['Alugueres','alugueres',70],
            ['Checklists','checklists',80],
            ['Manutenção','manutencao',90],
            ['Multas e sinistros','multas-sinistros',100],
            ['Expediente','expediente',110],
            ['Recibos verdes','recibos-verdes',120],
            ['Comunicação','comunicacao',130],
            ['Relatórios','relatorios',140],
            ['Configurações','configuracoes',150],
            ['Conta e acesso','conta-acesso',160],
        ];

        foreach($categories as [$name,$slug,$position]){
            HelpCategory::updateOrCreate(
                ['slug'=>$slug],
                [
                    'name'=>$name,
                    'position'=>$position,
                    'active'=>true,
                ]
            );
        }
    }
}
