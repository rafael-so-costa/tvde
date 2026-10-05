<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

class TenantSettingsService
{
    public function get(Tenant $tenant): array
    {
        $settings=
            $tenant->settings ?? [];

        $current=
            $settings['fleet'] ?? [];

        return $this->merge(
            $this->defaults(),
            is_array($current)
                ?$current
                :[]
        );
    }

    public function update(
        Tenant $tenant,
        array $data
    ): array {
        DB::transaction(function() use($tenant,$data){
            foreach([
                'nome',
                'email',
                'telefone',
            ] as $field){
                if(array_key_exists($field,$data)){
                    $tenant->{$field}=$data[$field];
                    unset($data[$field]);
                }
            }

            $settings=
                $tenant->settings ?? [];

            $current=
                $settings['fleet'] ?? [];

            $fleet=$this->merge(
                $this->defaults(),
                is_array($current)
                    ?$current
                    :[]
            );

            $fleet=$this->merge(
                $fleet,
                $data
            );

            $settings['fleet']=$fleet;

            $tenant->settings=$settings;
            $tenant->save();
        });

        $tenant->refresh();

        return $this->get($tenant);
    }

    public function defaults(): array
    {
        return [
            'general'=>[
                'commercial_name'=>null,
                'website'=>null,
                'address'=>null,
                'postal_code'=>null,
                'city'=>null,
                'district'=>null,
                'contact_name'=>null,
            ],

            'operation'=>[
                'base_city'=>null,
                'platforms'=>[],
                'operation_types'=>[],
            ],

            'alerts'=>[
                'insurance_days'=>30,
                'inspection_days'=>30,
                'iuc_days'=>30,
                'criminal_record_days'=>30,
                'driver_documents_days'=>60,
            ],

            'vehicles'=>[
                'revision_interval_km'=>15000,
                'revision_alert_km'=>1000,
            ],

            'rentals'=>[
                'periodicity'=>'weekly',
                'due_weekday'=>1,
                'default_deposit'=>null,
                'included_km'=>null,
            ],

            'regional'=>[
                'timezone'=>'Europe/Lisbon',
                'currency'=>'EUR',
                'date_format'=>'DD/MM/YYYY',
                'language'=>'pt-PT',
            ],
        ];
    }

    public function options(): array
    {
        return [
            'platforms'=>[
                'uber'=>'Uber',
                'bolt'=>'Bolt',
                'freenow'=>'FreeNow',
                'other'=>'Outra',
            ],

            'operation_types'=>[
                'owned'=>'Veículos próprios',
                'third_party'=>'Veículos de terceiros',
                'rental'=>'Aluguer',
            ],

            'rental_periodicities'=>[
                'weekly'=>'Semanal',
                'fortnightly'=>'Quinzenal',
                'monthly'=>'Mensal',
                'flexible'=>'Flexível',
            ],

            'weekdays'=>[
                1=>'Segunda-feira',
                2=>'Terça-feira',
                3=>'Quarta-feira',
                4=>'Quinta-feira',
                5=>'Sexta-feira',
                6=>'Sábado',
                7=>'Domingo',
            ],
        ];
    }

    private function merge(
        array $base,
        array $changes
    ): array {
        foreach($changes as $key=>$value){
            if(
                is_array($value) &&
                !array_is_list($value) &&
                isset($base[$key]) &&
                is_array($base[$key]) &&
                !array_is_list($base[$key])
            ){
                $base[$key]=$this->merge(
                    $base[$key],
                    $value
                );

                continue;
            }

            $base[$key]=$value;
        }

        return $base;
    }
}
