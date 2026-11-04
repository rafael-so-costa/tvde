<?php

declare(strict_types=1);

use App\Models\Role;
use App\Models\SaasCoupon;
use App\Models\SaasCouponRedemption;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RoleSeeder::class);
    $this->withHeaders([
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ]);
});

function couponBackofficeLogin($test, bool $superAdmin = true): void
{
    $user = User::factory()->create([
        'email' => Str::lower((string) Str::uuid()).'@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);
    if ($superAdmin) {
        $role = Role::query()->where('codigo', 'super_admin')->firstOrFail();
        UserRole::create(['user_id' => $user->id, 'role_id' => $role->id, 'tenant_id' => null]);
    }
    $test->postJson('/login', ['email' => $user->email, 'password' => 'SenhaTeste123!'])->assertOk();
}

function couponBackofficePayload(array $overrides = []): array
{
    return array_merge([
        'code' => 'PROMO10', 'name' => 'Campanha de teste',
        'description' => 'Desconto inicial',
        'discount_type' => SaasCoupon::TYPE_PERCENTAGE,
        'discount_value' => '10.00',
        'applies_to' => SaasCoupon::SCOPE_BOTH,
        'enabled' => false, 'first_payment_only' => true,
        'min_subtotal' => '10.00',
        'max_redemptions' => 100, 'max_per_customer' => 1,
        'starts_at' => null, 'expires_at' => null,
    ], $overrides);
}

function couponBackofficeCreate(): SaasCoupon
{
    return SaasCoupon::create(couponBackofficePayload([
        'code' => 'EXISTING'.strtoupper(substr((string) Str::uuid(), 0, 6)),
    ]));
}

test('cupoes recusam visitantes nao autenticados', function (): void {
    $this->getJson('/api/backoffice/cupoes')->assertUnauthorized();
});

test('cupoes recusam utilizador normal', function (): void {
    couponBackofficeLogin($this, false);
    $this->getJson('/api/backoffice/cupoes')->assertForbidden();
});

test('gestao permite listar apenas para super admin', function (): void {
    couponBackofficeCreate();
    couponBackofficeLogin($this);
    $this->getJson('/api/backoffice/cupoes')->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('module_enabled', false);
});

test('super admin cria cupao inicialmente desativado', function (): void {
    couponBackofficeLogin($this);
    $this->postJson('/api/backoffice/cupoes', couponBackofficePayload([
        'enabled' => false, 'code' => 'novo10',
    ]))->assertCreated()->assertJsonPath('data.code', 'NOVO10')
        ->assertJsonPath('data.enabled', false);
    expect(SaasCoupon::query()->count())->toBe(1);
});

test('codigo repetido e normalizado e recusado', function (): void {
    couponBackofficeLogin($this);
    $this->postJson('/api/backoffice/cupoes', couponBackofficePayload())->assertCreated();
    $this->postJson('/api/backoffice/cupoes', couponBackofficePayload([
        'code' => 'promo10',
    ]))->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

test('cupao rejeita percentagem acima de cem', function (): void {
    couponBackofficeLogin($this);
    $this->postJson('/api/backoffice/cupoes', couponBackofficePayload([
        'discount_value' => '100.01',
    ]))->assertUnprocessable()->assertJsonValidationErrors(['discount_value']);
});

test('cupao rejeita codigo e ambito invalidos', function (): void {
    couponBackofficeLogin($this);
    $this->postJson('/api/backoffice/cupoes', couponBackofficePayload([
        'code' => 'BAD CODE', 'applies_to' => 'tenant_any',
    ]))->assertUnprocessable()->assertJsonValidationErrors(['code', 'applies_to']);
});

test('cupao rejeita validade invertida', function (): void {
    couponBackofficeLogin($this);
    $this->postJson('/api/backoffice/cupoes', couponBackofficePayload([
        'starts_at' => '2026-12-01T00:00:00Z',
        'expires_at' => '2026-11-01T00:00:00Z',
    ]))->assertUnprocessable()->assertJsonValidationErrors(['expires_at']);
});

test('super admin altera nome sem apagar cupao', function (): void {
    $coupon = couponBackofficeCreate();
    couponBackofficeLogin($this);
    $this->patchJson("/api/backoffice/cupoes/{$coupon->id}", [
        'name' => 'Campanha atualizada',
    ])->assertOk()->assertJsonPath('data.name', 'Campanha atualizada');
});

test('historico nao pode ser consultado por utilizador normal', function (): void {
    $coupon = couponBackofficeCreate();
    couponBackofficeLogin($this, false);
    $this->getJson("/api/backoffice/cupoes/{$coupon->id}/historico")->assertForbidden();
});

test('termos financeiros ficam imutaveis depois da primeira utilizacao', function (): void {
    $coupon = couponBackofficeCreate();
    SaasCouponRedemption::create([
        'saas_coupon_id' => $coupon->id,
        'customer_type' => 'tenant', 'customer_id' => (string) Str::uuid(),
        'source_type' => SaasCoupon::SCOPE_SAAS, 'source_id' => (string) Str::uuid(),
        'status' => SaasCouponRedemption::STATUS_REDEEMED,
        'subtotal_amount' => '50.00', 'discount_amount' => '5.00',
        'currency' => 'EUR', 'idempotency_key' => hash('sha256', (string) Str::uuid()),
        'reserved_until' => now()->addMinutes(10), 'redeemed_at' => now(),
    ]);
    couponBackofficeLogin($this);
    $this->patchJson("/api/backoffice/cupoes/{$coupon->id}", [
        'discount_value' => '20.00',
    ])->assertUnprocessable()->assertJsonValidationErrors(['discount_value']);
    $this->getJson("/api/backoffice/cupoes/{$coupon->id}/historico")->assertOk()
        ->assertJsonPath('meta.total', 1);
});

test('cupao sem historico pode atualizar limite', function (): void {
    $coupon = couponBackofficeCreate();
    couponBackofficeLogin($this);
    $this->patchJson("/api/backoffice/cupoes/{$coupon->id}", [
        'max_redemptions' => 2,
    ])->assertOk()->assertJsonPath('data.max_redemptions', 2);
});

test('cupao apresenta apenas campos administrativos permitidos', function (): void {
    $coupon = couponBackofficeCreate();
    couponBackofficeLogin($this);
    $this->getJson("/api/backoffice/cupoes/{$coupon->id}")
        ->assertOk()->assertJsonPath('data.code', $coupon->code)
        ->assertJsonMissingPath('data.metadata');
});

test('nao existe endpoint para remover cupao e historico', function (): void {
    $coupon = couponBackofficeCreate();
    couponBackofficeLogin($this);
    $this->deleteJson("/api/backoffice/cupoes/{$coupon->id}")
        ->assertStatus(405);
    expect(SaasCoupon::query()->whereKey($coupon->id)->exists())->toBeTrue();
});