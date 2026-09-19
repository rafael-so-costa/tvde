<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class ChecklistPenaltyService
{
    private const ITEM_VALUES = [
        'doc_carro' => 50,
        'carta_verde' => 30,
        'inspecao_tvde' => 100,
        'declaracao_amigavel' => 5,
        'colete' => 15,
        'triangulo' => 20,
        'kit_socorros' => 25,
        'extintor' => 40,
        'placa_tvde_1' => 15,
        'placa_tvde_2' => 15,
        'placa_nao_fumar_1' => 5,
        'placa_nao_fumar_2' => 5,
        'cartao_abastecimento' => 20,
        'tampa_malas' => 150,
        'carregador_eletrico' => 80,
        'carregador_tomada' => 30,
        'compressor_ar' => 50,
    ];

    private const DAMAGE_VALUES = [
        'Para-choque Dianteiro' => 300,
        'Capô' => 400,
        'Para-lama Dianteiro Esquerdo' => 250,
        'Para-lama Dianteiro Direito' => 250,
        'Porta Dianteira Esquerda' => 350,
        'Porta Dianteira Direita' => 350,
        'Porta Traseira Esquerda' => 350,
        'Porta Traseira Direita' => 350,
        'Para-lama Traseiro Esquerdo' => 250,
        'Para-lama Traseiro Direito' => 250,
        'Para-choque Traseiro' => 300,
        'Porta-Malas' => 400,
        'Teto' => 500,
        'Para-brisa Dianteiro' => 350,
        'Para-brisa Traseiro' => 300,
        'Retrovisor Esquerdo' => 120,
        'Retrovisor Direito' => 120,
        'Farol Dianteiro Esquerdo' => 200,
        'Farol Dianteiro Direito' => 200,
        'Lanterna Traseira Esquerda' => 150,
        'Lanterna Traseira Direita' => 150,
        'Jante Dianteira Esquerda' => 180,
        'Jante Dianteira Direita' => 180,
        'Jante Traseira Esquerda' => 180,
        'Jante Traseira Direita' => 180,
    ];

    public function calculate(
        array $missingItems,
        array $newDamages
    ): array {
        $itemsTotal = 0.0;

        foreach (
            $missingItems as $key => $missing
        ) {
            if (!$missing) {
                continue;
            }

            if (
                !array_key_exists(
                    $key,
                    self::ITEM_VALUES
                )
            ) {
                throw ValidationException::withMessages([
                    'itens_faltantes' =>
                        "Item de checklist desconhecido: {$key}.",
                ]);
            }

            $itemsTotal +=
                self::ITEM_VALUES[$key];
        }

        $normalizedDamages = [];
        $damageTotal = 0.0;

        foreach (
            $newDamages as $index => $damage
        ) {
            $part =
                $damage['part'] ??
                null;

            if (
                !$part ||
                !array_key_exists(
                    $part,
                    self::DAMAGE_VALUES
                )
            ) {
                throw ValidationException::withMessages([
                    "novos_danos.{$index}.part" =>
                        'Parte do veículo inválida.',
                ]);
            }

            $value =
                self::DAMAGE_VALUES[
                    $part
                ];

            $damage['value'] =
                $value;

            $normalizedDamages[] =
                $damage;

            $damageTotal +=
                $value;
        }

        return [
            'itens_faltantes' =>
                $missingItems,

            'novos_danos' =>
                $normalizedDamages,

            'penalizacao_total' =>
                round(
                    $itemsTotal +
                    $damageTotal,
                    2
                ),
        ];
    }
}
