<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpsertNotificationPreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category'=>[
                'required',
                Rule::in([
                    '*',
                    'document',
                    'contract',
                    'rental',
                    'claim',
                    'maintenance',
                    'diagnostic',
                    'inventory',
                    'purchase',
                ]),
            ],

            'enabled'=>[
                'required',
                'boolean',
            ],

            'minimum_severity'=>[
                'required',
                Rule::in([
                    'low',
                    'medium',
                    'high',
                    'critical',
                ]),
            ],

            'delivery_mode'=>[
                'required',
                Rule::in([
                    'immediate',
                    'daily_digest',
                ]),
            ],

            'quiet_hours_start'=>[
                'nullable',
                'date_format:H:i',
                'required_with:quiet_hours_end',
            ],

            'quiet_hours_end'=>[
                'nullable',
                'date_format:H:i',
                'required_with:quiet_hours_start',
            ],

            'timezone'=>[
                'nullable',
                'string',
                'max:64',
                function(
                    string $attribute,
                    mixed $value,
                    \Closure $fail
                ){
                    if(
                        filled($value) &&
                        !in_array(
                            $value,
                            timezone_identifiers_list(),
                            true
                        )
                    ){
                        $fail(
                            'O fuso horário selecionado é inválido.'
                        );
                    }
                },
            ],
        ];
    }

    public function after(): array
    {
        return [
            function(
                Validator $validator
            ){
                $start=
                    $this->input(
                        'quiet_hours_start'
                    );

                $end=
                    $this->input(
                        'quiet_hours_end'
                    );

                if(
                    filled($start) &&
                    filled($end) &&
                    $start===$end
                ){
                    $validator
                        ->errors()
                        ->add(
                            'quiet_hours_end',
                            'O início e o fim do período silencioso devem ser diferentes.'
                        );
                }
            },
        ];
    }
}
