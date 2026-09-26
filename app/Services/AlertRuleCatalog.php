<?php

namespace App\Services;

use App\Models\AlertRule;
use Illuminate\Support\Collection;

class AlertRuleCatalog
{
    private const DEFINITIONS = [
        'document.motorista.identificacao' => [
            'name' => 'Documento de identificação do motorista',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.motorista.carta' => [
            'name' => 'Carta de condução do motorista',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.motorista.registo_criminal' => [
            'name' => 'Registo criminal do motorista',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.motorista.certificado_tvde' => [
            'name' => 'Certificado TVDE do motorista',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.proprietario.identificacao' => [
            'name' => 'Documento de identificação do proprietário',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.proprietario.certidao' => [
            'name' => 'Certidão permanente do proprietário',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.proprietario.certificado_tvde' => [
            'name' => 'Certificado TVDE do proprietário',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.empresa.certificado_tvde' => [
            'name' => 'Certificado TVDE da empresa',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.veiculo.seguro' => [
            'name' => 'Carta verde / seguro do veículo',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.veiculo.inspecao_tvde' => [
            'name' => 'Inspeção TVDE do veículo',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.veiculo.uber' => [
            'name' => 'Registo Uber do veículo',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.veiculo.bolt' => [
            'name' => 'Registo Bolt do veículo',
            'category' => 'document',
            'days_before' => 30,
        ],
        'document.veiculo.extintor' => [
            'name' => 'Extintor do veículo',
            'category' => 'document',
            'days_before' => 30,
        ],

        'contract.end_date' => [
            'name' => 'Contrato próximo do fim',
            'category' => 'contract',
            'days_before' => 30,
        ],

        'rental.end_date' => [
            'name' => 'Aluguer próximo do fim',
            'category' => 'rental',
            'days_before' => 30,
        ],

        'claim.peritagem.missing_date' => [
            'name' => 'Peritagem sem data marcada',
            'category' => 'claim',
        ],

        'claim.peritagem.due' => [
            'name' => 'Peritagem próxima ou vencida',
            'category' => 'claim',
            'days_before' => 30,
        ],

        'claim.open_after_peritagem' => [
            'name' => 'Sinistro em aberto após peritagem',
            'category' => 'claim',
        ],

        'maintenance.plan.date_due' => [
            'name' => 'Manutenção preventiva por data',
            'category' => 'maintenance',
            'days_before' => 30,
        ],

        'maintenance.plan.km_due' => [
            'name' => 'Manutenção preventiva por quilometragem',
            'category' => 'maintenance',
        ],

        'maintenance.diagnostic.open' => [
            'name' => 'Diagnóstico aberto do veículo',
            'category' => 'diagnostic',
        ],

        'maintenance.approval.pending' => [
            'name' => 'Aprovação de manutenção pendente',
            'category' => 'maintenance',
            'days_before' => 7,
        ],

        'maintenance.warranty.date_due' => [
            'name' => 'Garantia próxima do fim por data',
            'category' => 'maintenance',
            'days_before' => 30,
        ],

        'maintenance.warranty.km_due' => [
            'name' => 'Garantia próxima do fim por quilometragem',
            'category' => 'maintenance',
            'km_before' => 1000,
        ],

        'inventory.stock.low' => [
            'name' => 'Estoque abaixo do mínimo',
            'category' => 'inventory',
        ],

        'purchase.delivery.overdue' => [
            'name' => 'Entrega de compra atrasada',
            'category' => 'purchase',
        ],

    ];

    public function ensureTenant(
        string $tenantId
    ): Collection {
        $rules = collect();

        foreach (
            self::DEFINITIONS
            as $code => $definition
        ) {
            $rule = AlertRule::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'code',
                    $code
                )
                ->first();

            if (!$rule) {
                $rule = new AlertRule([
                    'code' => $code,
                    'name' => $definition['name'],
                    'category' => $definition['category'],
                    'description' =>
                    'Regra nativa do FrotaPro.',
                    'severity' => 'medium',
                    'enabled' => true,
                    'channels' => [
                        'in_app',
                        'email',
                    ],
                    'trigger_config' => [
                        'days_before' =>
                        $definition['days_before']
                            ?? null,

                        'km_before' =>
                        $definition['km_before']
                            ?? null,
                    ],
                ]);

                $rule->tenant_id =
                    $tenantId;

                $rule->save();
            }

            $rules->put(
                $code,
                $rule
            );
        }

        return $rules;
    }

    public function codes(): array
    {
        return array_keys(
            self::DEFINITIONS
        );
    }
}
