<?php

namespace Database\Seeders;

use App\Models\CrmPipelineStage;
use Illuminate\Database\Seeder;

class CrmPipelineStageSeeder extends Seeder
{
    public function run(): void
    {
        $stages = [
            [
                'code' => 'new',
                'name' => 'Novo',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'slate',
                'position' => 10,
                'is_default' => true,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'to_contact',
                'name' => 'Por contactar',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'sky',
                'position' => 20,
                'is_default' => false,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'contacted',
                'name' => 'Contactado',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'blue',
                'position' => 30,
                'is_default' => false,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'qualified',
                'name' => 'Qualificado',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'indigo',
                'position' => 40,
                'is_default' => false,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'demo',
                'name' => 'Demonstração',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'violet',
                'position' => 50,
                'is_default' => false,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'proposal',
                'name' => 'Proposta',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'purple',
                'position' => 60,
                'is_default' => false,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'trial',
                'name' => 'Trial',
                'category' => CrmPipelineStage::CATEGORY_PIPELINE,
                'color' => 'amber',
                'position' => 70,
                'is_default' => false,
                'is_terminal' => false,
                'is_active' => true,
            ],
            [
                'code' => 'customer',
                'name' => 'Cliente',
                'category' => CrmPipelineStage::CATEGORY_WON,
                'color' => 'emerald',
                'position' => 80,
                'is_default' => false,
                'is_terminal' => true,
                'is_active' => true,
            ],
            [
                'code' => 'no_response',
                'name' => 'Sem resposta',
                'category' => CrmPipelineStage::CATEGORY_LOST,
                'color' => 'slate',
                'position' => 90,
                'is_default' => false,
                'is_terminal' => true,
                'is_active' => true,
            ],
            [
                'code' => 'not_interested',
                'name' => 'Não interessado',
                'category' => CrmPipelineStage::CATEGORY_LOST,
                'color' => 'rose',
                'position' => 100,
                'is_default' => false,
                'is_terminal' => true,
                'is_active' => true,
            ],
            [
                'code' => 'invalid_contact',
                'name' => 'Contacto inválido',
                'category' => CrmPipelineStage::CATEGORY_LOST,
                'color' => 'red',
                'position' => 110,
                'is_default' => false,
                'is_terminal' => true,
                'is_active' => true,
            ],
            [
                'code' => 'duplicate',
                'name' => 'Duplicado',
                'category' => CrmPipelineStage::CATEGORY_LOST,
                'color' => 'orange',
                'position' => 120,
                'is_default' => false,
                'is_terminal' => true,
                'is_active' => true,
            ],
            [
                'code' => 'lost',
                'name' => 'Perdido',
                'category' => CrmPipelineStage::CATEGORY_LOST,
                'color' => 'red',
                'position' => 130,
                'is_default' => false,
                'is_terminal' => true,
                'is_active' => true,
            ],
        ];

        foreach ($stages as $stage) {
            CrmPipelineStage::query()
                ->updateOrCreate(
                    [
                        'code' => $stage['code'],
                    ],
                    $stage
                );
        }

        CrmPipelineStage::query()
            ->where(
                'code',
                '!=',
                'new'
            )
            ->update([
                'is_default' => false,
            ]);
    }
}
