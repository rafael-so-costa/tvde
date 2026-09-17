<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

test('utilizador ativo consegue fazer login', function () {
    $user = User::factory()->create([
        'email' => 'admin@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $response = $this->postJson('/login', [
        'email' => 'admin@frotapro.test',
        'password' => 'SenhaTeste123!',
        'remember' => false,
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.email', 'admin@frotapro.test')
        ->assertJsonPath('user.ativo', true);

    $this->assertAuthenticatedAs($user);

    expect($user->fresh()->last_login_at)->not->toBeNull();
});

test('utilizador inativo não consegue fazer login', function () {
    User::factory()->create([
        'email' => 'inativo@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => false,
    ]);

    $response = $this->postJson('/login', [
        'email' => 'inativo@frotapro.test',
        'password' => 'SenhaTeste123!',
    ]);

    $response
        ->assertStatus(422)
        ->assertJsonPath('message', 'E-mail ou senha inválidos.');

    $this->assertGuest();
});

test('api user exige autenticação', function () {
    $this->getJson('/api/user')
        ->assertUnauthorized();
});

test('utilizador autenticado consegue consultar api user e fazer logout', function () {
    $user = User::factory()->create([
        'email' => 'sessao@frotapro.test',
        'password' => Hash::make('SenhaTeste123!'),
        'ativo' => true,
    ]);

    $this->postJson('/login', [
        'email' => 'sessao@frotapro.test',
        'password' => 'SenhaTeste123!',
    ])->assertOk();

    $this->assertAuthenticatedAs($user, 'web');

    $this->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.email', 'sessao@frotapro.test');

    $this->postJson('/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Sessão encerrada com sucesso.');

    Auth::forgetGuards();

    $this->assertGuest('web');

    $this->getJson('/api/user')
        ->assertUnauthorized();
});
