<?php

declare(strict_types=1);

use App\Support\PhoneNormalizer;
use Illuminate\Support\Facades\Validator;
use App\Rules\InternationalPhone;

test('normaliza numeros portugueses e internacionais para E164', function (): void {
    expect(PhoneNormalizer::toE164('912 345 678'))->toBe('+351912345678');
    expect(PhoneNormalizer::toE164('+351 912 345 678'))->toBe('+351912345678');
    expect(PhoneNormalizer::toE164('00351 213 456 789'))->toBe('+351213456789');
    expect(PhoneNormalizer::toE164('+34 612 345 678'))->toBe('+34612345678');
});

test('rejeita formato errado ou ambiguo', function (): void {
    expect(PhoneNormalizer::toE164('123'))->toBeNull();
    expect(PhoneNormalizer::toE164('+351 123 456 789'))->toBeNull();
    expect(PhoneNormalizer::toE164('351912345678'))->toBeNull();
    expect(PhoneNormalizer::toE164('texto'))->toBeNull();
    expect(PhoneNormalizer::toE164(null))->toBeNull();
});

test('validador aceita E164 e recusa telefone incompleto', function (): void {
    expect(Validator::make(['telefone' => '+34612345678'], [
        'telefone' => [new InternationalPhone],
    ])->passes())->toBeTrue();

    expect(Validator::make(['telefone' => '+351123'], [
        'telefone' => [new InternationalPhone],
    ])->fails())->toBeTrue();
});