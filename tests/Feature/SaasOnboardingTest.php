<?php

use App\Models\Empresa;
use App\Models\Tenant;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function saasOnboardingTestHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function saasOnboardingTestPayload(): array
{
    return [
        'company_name' => 'Frota Lisboa Lda',
        'company_email' => 'geral@frotalisboa.pt',
        'company_phone' => '+351 210 000 000',
        'manager_name' => 'Rafael Gestor',
        'address_street' => 'Avenida da República',
        'address_number' => '100',
        'address_complement' => 'Sala 2',
        'address_postal_code' => '1050-197',
        'address_city' => 'Lisboa',
        'certificate_tvde' => 'TVDE-12345',
        'certificate_tvde_valid_until' => '2030-12-31',
    ];
}

function createSaasRegistrationForOnboardingTest($test): void
{
    $test
        ->post('/registar', [
            'name' => 'Rafael Gestor',
            'email' => 'gestor@frotalisboa.pt',
            'phone' => '+351 910 000 000',
            'password' => 'SenhaTeste123',
            'password_confirmation' => 'SenhaTeste123',
            'company_name' => 'Frota Lisboa Lda',
            'company_nif' => '500123456',
            'company_email' => 'geral@frotalisboa.pt',
            'company_phone' => '+351 210 000 000',
        ])
        ->assertRedirect('/onboarding');
}

test('onboarding exige autenticação', function () {
    $this
        ->withHeaders(saasOnboardingTestHeaders())
        ->getJson('/api/onboarding')
        ->assertUnauthorized();
});

test('novo cadastro saas exige onboarding', function () {
    createSaasRegistrationForOnboardingTest($this);

    $this
        ->withHeaders(saasOnboardingTestHeaders())
        ->getJson('/api/onboarding')
        ->assertOk()
        ->assertJsonPath('data.required', true)
        ->assertJsonPath('data.completed_at', null)
        ->assertJsonPath('data.empresa.status_cadastro', 'pendente');
});

test('concluir onboarding atualiza empresa tenant e estado', function () {
    createSaasRegistrationForOnboardingTest($this);

    $response = $this
        ->withHeaders(saasOnboardingTestHeaders())
        ->patchJson(
            '/api/onboarding',
            saasOnboardingTestPayload()
        );

    $response
        ->assertOk()
        ->assertJsonPath('data.required', false)
        ->assertJsonPath('data.empresa.status_cadastro', 'ativo');

    $tenant = Tenant::query()
        ->where('nif', '500123456')
        ->firstOrFail();

    $empresa = Empresa::query()
        ->where('tenant_id', $tenant->id)
        ->firstOrFail();

    expect(
        data_get(
            $tenant->fresh()->settings,
            'onboarding.required'
        )
    )->toBeFalse();

    expect(
        data_get(
            $tenant->fresh()->settings,
            'onboarding.completed_at'
        )
    )->not->toBeNull();

    expect(
        $empresa->fresh()->status_cadastro
    )->toBe('ativo');

    expect(
        $empresa->fresh()->endereco_cidade
    )->toBe('Lisboa');

    expect(
        $tenant->fresh()->nome
    )->toBe('Frota Lisboa Lda');

    expect(
        $tenant->fresh()->email
    )->toBe('geral@frotalisboa.pt');
});

test('onboarding invalido não é concluído', function () {
    createSaasRegistrationForOnboardingTest($this);

    $this
        ->withHeaders(saasOnboardingTestHeaders())
        ->patchJson('/api/onboarding', [
            'company_name' => '',
        ])
        ->assertUnprocessable();

    $tenant = Tenant::query()
        ->where('nif', '500123456')
        ->firstOrFail();

    expect(
        data_get(
            $tenant->settings,
            'onboarding.required'
        )
    )->toBeTrue();

    $empresa = Empresa::query()
        ->where('tenant_id', $tenant->id)
        ->firstOrFail();

    expect(
        $empresa->status_cadastro
    )->toBe('pendente');
});

test('tenant antigo sem flag não recebe onboarding obrigatório', function () {
    $tenant = Tenant::create([
        'nome' => 'Tenant Antigo',
        'slug' => 'tenant-antigo',
        'ativo' => true,
    ]);

    expect(
        data_get(
            $tenant->settings,
            'onboarding.required',
            false
        )
    )->toBeFalse();
});
