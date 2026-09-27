<?php

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function minhaContaHeaders(): array
{
    return [
        'Origin'=>
            'http://localhost:8000',

        'Referer'=>
            'http://localhost:8000/',

        'Accept'=>
            'application/json',
    ];
}

function criarMinhaContaUser(
    string $email=
        'minha.conta@frotapro.test'
): User {
    return User::factory()->create([
        'name'=>
            'Utilizador Inicial',

        'email'=>
            $email,

        'password'=>
            Hash::make(
                'SenhaTeste123!'
            ),

        'ativo'=>
            true,
    ]);
}

function loginMinhaConta(
    $test,
    User $user
): void {
    $test
        ->withHeaders(
            minhaContaHeaders()
        )
        ->postJson(
            '/login',
            [
                'email'=>
                    $user->email,

                'password'=>
                    'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function criarSessaoMinhaConta(
    User $user,
    string $id,
    int $lastActivity
): void {
    DB::table(
        'sessions'
    )->insert([
        'id'=>
            $id,

        'user_id'=>
            $user->id,

        'ip_address'=>
            '127.0.0.1',

        'user_agent'=>
            'FrotaPro Test Browser',

        'payload'=>
            'teste',

        'last_activity'=>
            $lastActivity,
    ]);
}

test(
    'rotas de minha conta exigem autenticação',
    function () {
        $headers=
            minhaContaHeaders();

        $this
            ->withHeaders($headers)
            ->getJson(
                '/api/minha-conta'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders($headers)
            ->patchJson(
                '/api/minha-conta',
                []
            )
            ->assertUnauthorized();

        $this
            ->withHeaders($headers)
            ->patchJson(
                '/api/minha-conta/senha',
                []
            )
            ->assertUnauthorized();

        $this
            ->withHeaders($headers)
            ->getJson(
                '/api/minha-conta/sessoes'
            )
            ->assertUnauthorized();

        $this
            ->withHeaders($headers)
            ->deleteJson(
                '/api/minha-conta/sessoes/outras',
                []
            )
            ->assertUnauthorized();
    }
);

test(
    'utilizador consulta apenas dados seguros da própria conta',
    function () {
        $user=
            criarMinhaContaUser();

        Profile::create([
            'user_id'=>
                $user->id,

            'nif'=>
                '123456789',

            'telefone'=>
                '910000000',

            'data_nascimento'=>
                '1990-01-01',

            'timezone'=>
                'Europe/Lisbon',

            'locale'=>
                'pt_PT',
        ]);

        loginMinhaConta(
            $this,
            $user
        );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->getJson(
                '/api/minha-conta'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.id',
                $user->id
            )
            ->assertJsonPath(
                'data.email',
                $user->email
            )
            ->assertJsonPath(
                'data.profile.telefone',
                '910000000'
            )
            ->assertJsonPath(
                'data.profile.timezone',
                'Europe/Lisbon'
            )
            ->assertJsonMissingPath(
                'data.password'
            )
            ->assertJsonMissingPath(
                'data.remember_token'
            )
            ->assertJsonMissingPath(
                'data.profile.nif'
            )
            ->assertJsonMissingPath(
                'data.profile.data_nascimento'
            );
    }
);

test(
    'utilizador atualiza nome telefone timezone e locale',
    function () {
        $user=
            criarMinhaContaUser(
                'editar.conta@frotapro.test'
            );

        loginMinhaConta(
            $this,
            $user
        );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->patchJson(
                '/api/minha-conta',
                [
                    'name'=>
                        'Novo Nome',

                    'telefone'=>
                        '920000000',

                    'timezone'=>
                        'Europe/Madrid',

                    'locale'=>
                        'pt_PT',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.name',
                'Novo Nome'
            )
            ->assertJsonPath(
                'data.profile.telefone',
                '920000000'
            )
            ->assertJsonPath(
                'data.profile.timezone',
                'Europe/Madrid'
            );

        expect(
            $user->fresh()->name
        )->toBe(
            'Novo Nome'
        );

        $this->assertDatabaseHas(
            'profiles',
            [
                'user_id'=>
                    $user->id,

                'telefone'=>
                    '920000000',

                'timezone'=>
                    'Europe/Madrid',

                'locale'=>
                    'pt_PT',
            ]
        );
    }
);

test(
    'utilizador não pode alterar campos protegidos da conta',
    function () {
        $user=
            criarMinhaContaUser(
                'protegido@frotapro.test'
            );

        loginMinhaConta(
            $this,
            $user
        );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->patchJson(
                '/api/minha-conta',
                [
                    'email'=>
                        'outro@frotapro.test',

                    'nif'=>
                        '999999999',

                    'data_nascimento'=>
                        '2000-01-01',

                    'ativo'=>
                        false,
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'email',
                'nif',
                'data_nascimento',
                'ativo',
            ]);

        expect(
            $user->fresh()->email
        )->toBe(
            'protegido@frotapro.test'
        );

        expect(
            $user->fresh()->ativo
        )->toBeTrue();
    }
);

test(
    'alteração de senha exige senha atual correta',
    function () {
        $user=
            criarMinhaContaUser(
                'senha.errada@frotapro.test'
            );

        loginMinhaConta(
            $this,
            $user
        );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->patchJson(
                '/api/minha-conta/senha',
                [
                    'current_password'=>
                        'SenhaErrada123!',

                    'password'=>
                        'NovaSenha123!',

                    'password_confirmation'=>
                        'NovaSenha123!',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'current_password'
            );

        expect(
            Hash::check(
                'SenhaTeste123!',
                $user->fresh()
                    ->password
            )
        )->toBeTrue();
    }
);

test(
    'utilizador altera a própria senha e encerra outras sessões',
    function () {
        $user=
            criarMinhaContaUser(
                'senha.correta@frotapro.test'
            );

        loginMinhaConta(
            $this,
            $user
        );

        criarSessaoMinhaConta(
            $user,
            'sessao-antiga-1',
            now()->subHour()
                ->timestamp
        );

        criarSessaoMinhaConta(
            $user,
            'sessao-antiga-2',
            now()->subMinutes(30)
                ->timestamp
        );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->patchJson(
                '/api/minha-conta/senha',
                [
                    'current_password'=>
                        'SenhaTeste123!',

                    'password'=>
                        'NovaSenha123!',

                    'password_confirmation'=>
                        'NovaSenha123!',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'terminated_sessions',
                2
            );

        $fresh=
            $user->fresh();

        expect(
            Hash::check(
                'NovaSenha123!',
                $fresh->password
            )
        )->toBeTrue();

        expect(
            Hash::check(
                'SenhaTeste123!',
                $fresh->password
            )
        )->toBeFalse();

        $this->assertDatabaseMissing(
            'sessions',
            [
                'id'=>
                    'sessao-antiga-1',
            ]
        );

        $this->assertDatabaseMissing(
            'sessions',
            [
                'id'=>
                    'sessao-antiga-2',
            ]
        );
    }
);

test(
    'utilizador consulta as próprias sessões',
    function () {
        $user=
            criarMinhaContaUser(
                'sessoes@frotapro.test'
            );

        $outro=
            criarMinhaContaUser(
                'outra.sessao@frotapro.test'
            );

        loginMinhaConta(
            $this,
            $user
        );

        criarSessaoMinhaConta(
            $user,
            'sessao-user-1',
            now()->subMinutes(10)
                ->timestamp
        );

        criarSessaoMinhaConta(
            $user,
            'sessao-user-2',
            now()->subMinutes(5)
                ->timestamp
        );

        criarSessaoMinhaConta(
            $outro,
            'sessao-outro-user',
            now()->timestamp
        );

        $response=
            $this
                ->withHeaders(
                    minhaContaHeaders()
                )
                ->getJson(
                    '/api/minha-conta/sessoes'
                )
                ->assertOk()
                ->assertJsonCount(
                    2,
                    'data'
                );

        expect(
            collect(
                $response->json(
                    'data'
                )
            )
                ->pluck(
                    'user_agent'
                )
                ->unique()
                ->values()
                ->all()
        )->toBe([
            'FrotaPro Test Browser',
        ]);
    }
);

test(
    'terminar outras sessões exige senha atual e não afeta sessões de outro utilizador',
    function () {
        $user=
            criarMinhaContaUser(
                'terminar.sessoes@frotapro.test'
            );

        $outro=
            criarMinhaContaUser(
                'preservar.sessao@frotapro.test'
            );

        loginMinhaConta(
            $this,
            $user
        );

        criarSessaoMinhaConta(
            $user,
            'sessao-remover-1',
            now()->timestamp
        );

        criarSessaoMinhaConta(
            $user,
            'sessao-remover-2',
            now()->timestamp
        );

        criarSessaoMinhaConta(
            $outro,
            'sessao-preservar',
            now()->timestamp
        );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->deleteJson(
                '/api/minha-conta/sessoes/outras',
                [
                    'current_password'=>
                        'SenhaErrada123!',
                ]
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(
                'current_password'
            );

        $this
            ->withHeaders(
                minhaContaHeaders()
            )
            ->deleteJson(
                '/api/minha-conta/sessoes/outras',
                [
                    'current_password'=>
                        'SenhaTeste123!',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'terminated_sessions',
                2
            );

        $this->assertDatabaseMissing(
            'sessions',
            [
                'id'=>
                    'sessao-remover-1',
            ]
        );

        $this->assertDatabaseMissing(
            'sessions',
            [
                'id'=>
                    'sessao-remover-2',
            ]
        );

        $this->assertDatabaseHas(
            'sessions',
            [
                'id'=>
                    'sessao-preservar',

                'user_id'=>
                    $outro->id,
            ]
        );
    }
);
