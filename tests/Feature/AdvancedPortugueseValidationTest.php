<?php

use App\Rules\PortugueseIban;
use App\Rules\PortugueseNif;
use App\Rules\PortuguesePhone;
use App\Rules\PortuguesePostalCode;
use App\Rules\PortugueseRegistrationPlate;
use App\Rules\Vin;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Validator;

function advancedRulePasses(
    mixed $value,
    ValidationRule $rule
): bool {
    return Validator::make(
        [
            'value' => $value,
        ],
        [
            'value' => [
                'required',
                $rule,
            ],
        ]
    )->passes();
}

test(
    'valida nif e nipc portugueses pelo digito de controlo',
    function () {
        expect(
            advancedRulePasses(
                '245716297',
                new PortugueseNif
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                'PT 245 716 297',
                new PortugueseNif
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '501234560',
                new PortugueseNif
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '245716298',
                new PortugueseNif
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                '000000000',
                new PortugueseNif
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                '12345',
                new PortugueseNif
            )
        )->toBeFalse();
    }
);

test(
    'valida iban portugues com mod 97',
    function () {
        expect(
            advancedRulePasses(
                'PT50 1234 4321 1234 5678 9017 2',
                new PortugueseIban
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                'PT50123443211234567890172',
                new PortugueseIban
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                'PT50123443211234567890173',
                new PortugueseIban
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                'ES50123443211234567890172',
                new PortugueseIban
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                'PT501234',
                new PortugueseIban
            )
        )->toBeFalse();
    }
);

test(
    'valida numeros de telefone portugueses',
    function () {
        expect(
            advancedRulePasses(
                '912345678',
                new PortuguesePhone
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '+351 912 345 678',
                new PortuguesePhone
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '00351 213 456 789',
                new PortuguesePhone
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '800 123 456',
                new PortuguesePhone
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '+34 612 345 678',
                new PortuguesePhone
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                '123456789',
                new PortuguesePhone
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                '91234567',
                new PortuguesePhone
            )
        )->toBeFalse();
    }
);

test(
    'valida codigos postais portugueses',
    function () {
        expect(
            advancedRulePasses(
                '1000-001',
                new PortuguesePostalCode
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '1000 001',
                new PortuguesePostalCode
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '1000001',
                new PortuguesePostalCode
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                '0000-000',
                new PortuguesePostalCode
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                '100-001',
                new PortuguesePostalCode
            )
        )->toBeFalse();
    }
);

test(
    'valida formatos historicos e atual de matricula portuguesa',
    function () {
        foreach (
            [
                'AA-00-00',
                '00-00-AA',
                '00-AA-00',
                'AA-00-AA',
                'aa 00 aa',
                'AA00AA',
            ] as $plate
        ) {
            expect(
                advancedRulePasses(
                    $plate,
                    new PortugueseRegistrationPlate
                )
            )->toBeTrue();
        }

        foreach (
            [
                'AAA-00-0',
                'AA-000-AA',
                '123456',
                'ABCDEF',
                'AA-00-A',
            ] as $plate
        ) {
            expect(
                advancedRulePasses(
                    $plate,
                    new PortugueseRegistrationPlate
                )
            )->toBeFalse();
        }
    }
);

test(
    'valida vin moderno de dezassete caracteres',
    function () {
        expect(
            advancedRulePasses(
                'WVWZZZ1JZXW000001',
                new Vin
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                'VF1RFB00665432109',
                new Vin
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                'wvwzzz1jzxw000001',
                new Vin
            )
        )->toBeTrue();

        expect(
            advancedRulePasses(
                'WVWZZZ1JZXW00001',
                new Vin
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                'WVWZZZ1JZXO000001',
                new Vin
            )
        )->toBeFalse();

        expect(
            advancedRulePasses(
                'WVWZZZ1JZXQ000001',
                new Vin
            )
        )->toBeFalse();
    }
);
