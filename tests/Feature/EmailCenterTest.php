<?php

use App\Mail\EmailTestMail;
use App\Mail\PasswordResetMail;
use App\Models\EmailLog;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed(
        RoleSeeder::class
    );
});

function emailCenterHeaders():array
{
    return[
        'Origin'=>
            'http://localhost:8000',

        'Referer'=>
            'http://localhost:8000/',

        'Accept'=>
            'application/json',
    ];
}

function emailCenterSuperAdmin():User
{
    $user=
        User::factory()
            ->create([
                'name'=>
                    'Super Admin Email',

                'email'=>
                    'super.email@frotapro.test',

                'password'=>
                    Hash::make(
                        'SenhaTeste123!'
                    ),

                'ativo'=>true,
            ]);

    $role=
        Role::query()
            ->where(
                'codigo',
                'super_admin'
            )
            ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>null,
    ]);

    return $user;
}

function emailCenterLogin(
    $test,
    User $user
):void{
    $test
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

test(
    'pedido de recuperação não revela existência da conta e envia email auditado',
    function(){
        Mail::fake();

        $user=
            User::factory()
                ->create([
                    'name'=>
                        'Utilizador Recuperação',

                    'email'=>
                        'recuperar@frotapro.test',

                    'password'=>
                        Hash::make(
                            'SenhaAntiga123!'
                        ),

                    'ativo'=>true,
                ]);

        $response=
            $this
                ->postJson(
                    '/api/password/forgot',
                    [
                        'email'=>
                            $user->email,
                    ]
                );

        $response
            ->assertOk()
            ->assertJsonStructure([
                'message',
            ]);

        $sentMail=null;

        Mail::assertSent(
            PasswordResetMail::class,
            function($mail) use(
                &$sentMail,
                $user
            ){
                $sentMail=$mail;

                return $mail->hasTo(
                    $user->email
                );
            }
        );

        expect(
            $sentMail
        )->not->toBeNull();

        $log=
            EmailLog::query()
                ->where(
                    'category',
                    'password_reset'
                )
                ->firstOrFail();

        expect(
            $log->status
        )->toBe(
            'sent'
        );

        expect(
            $log
                ->recipient_email
        )->toBe(
            $user->email
        );

        $unknownResponse=
            $this
                ->postJson(
                    '/api/password/forgot',
                    [
                        'email'=>
                            'naoexiste@frotapro.test',
                    ]
                );

        $unknownResponse
            ->assertOk()
            ->assertJson([
                'message'=>
                    $response
                        ->json(
                            'message'
                        ),
            ]);
    }
);

test(
    'token recebido por email permite redefinir password e encerra sessões antigas',
    function(){
        Mail::fake();

        $user=
            User::factory()
                ->create([
                    'name'=>
                        'Utilizador Reset',

                    'email'=>
                        'reset@frotapro.test',

                    'password'=>
                        Hash::make(
                            'SenhaAntiga123!'
                        ),

                    'ativo'=>true,
                ]);

        $this
            ->postJson(
                '/api/password/forgot',
                [
                    'email'=>
                        $user->email,
                ]
            )
            ->assertOk();

        $sentMail=null;

        Mail::assertSent(
            PasswordResetMail::class,
            function($mail) use(
                &$sentMail
            ){
                $sentMail=$mail;

                return true;
            }
        );

        expect(
            $sentMail
        )->not->toBeNull();

        $query=
            parse_url(
                $sentMail->resetUrl,
                PHP_URL_QUERY
            );

        parse_str(
            (string)$query,
            $parameters
        );

        expect(
            $parameters['token']
            ?? null
        )->not->toBeNull();

        $this
            ->postJson(
                '/api/password/reset',
                [
                    'email'=>
                        $user->email,

                    'token'=>
                        $parameters[
                            'token'
                        ],

                    'password'=>
                        'NovaSenha123!',

                    'password_confirmation'=>
                        'NovaSenha123!',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'message',
                'A palavra-passe foi alterada com sucesso. Já pode iniciar sessão.'
            );

        expect(
            Hash::check(
                'NovaSenha123!',
                $user
                    ->fresh()
                    ->password
            )
        )->toBeTrue();

        expect(
            DB::table(
                'password_reset_tokens'
            )
                ->where(
                    'email',
                    $user->email
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'super admin configura smtp com password cifrada e consulta sem expor segredo',
    function(){
        $admin=
            emailCenterSuperAdmin();

        emailCenterLogin(
            $this,
            $admin
        );

        $response=
            $this
                ->withHeaders(
                    emailCenterHeaders()
                )
                ->putJson(
                    '/api/backoffice/emails/configuration',
                    [
                        'enabled'=>true,
                        'host'=>'smtp.example.test',
                        'port'=>587,
                        'scheme'=>'smtp',
                        'username'=>'mailer@example.test',
                        'smtp_password'=>'SegredoSMTP123!',
                        'from_address'=>'noreply@example.test',
                        'from_name'=>'FrotaPRO',
                    ]
                );

        $response
            ->assertOk()
            ->assertJsonPath(
                'data.source',
                'database'
            )
            ->assertJsonPath(
                'data.host',
                'smtp.example.test'
            )
            ->assertJsonPath(
                'data.password_configured',
                true
            );

        expect(
            data_get(
                $response->json(),
                'data.smtp_password'
            )
        )->toBeNull();

        $stored=
            DB::table(
                'email_settings'
            )
                ->value(
                    'smtp_password'
                );

        expect(
            $stored
        )->not->toBe(
            'SegredoSMTP123!'
        );

        expect(
            strlen(
                (string)$stored
            )
        )->toBeGreaterThan(
            20
        );
    }
);

test(
    'super admin envia teste e central regista envio',
    function(){
        Mail::fake();

        $admin=
            emailCenterSuperAdmin();

        emailCenterLogin(
            $this,
            $admin
        );

        $this
            ->withHeaders(
                emailCenterHeaders()
            )
            ->putJson(
                '/api/backoffice/emails/configuration',
                [
                    'enabled'=>true,
                    'host'=>'smtp.example.test',
                    'port'=>587,
                    'scheme'=>'smtp',
                    'username'=>'mailer@example.test',
                    'smtp_password'=>'SegredoSMTP123!',
                    'from_address'=>'noreply@example.test',
                    'from_name'=>'FrotaPRO',
                ]
            )
            ->assertOk();

        $this
            ->withHeaders(
                emailCenterHeaders()
            )
            ->postJson(
                '/api/backoffice/emails/test',
                [
                    'email'=>
                        'destino@example.test',
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'message',
                'E-mail de teste enviado com sucesso.'
            );

        Mail::assertSent(
            EmailTestMail::class,
            function($mail){
                return $mail->hasTo(
                    'destino@example.test'
                );
            }
        );

        $log=
            EmailLog::query()
                ->where(
                    'category',
                    'system_test'
                )
                ->firstOrFail();

        expect(
            $log->status
        )->toBe(
            'sent'
        );

        expect(
            $log
                ->initiated_by_user_id
        )->toBe(
            $admin->id
        );

        $this
            ->withHeaders(
                emailCenterHeaders()
            )
            ->getJson(
                '/api/backoffice/emails/summary'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.metrics.sent',
                1
            );

        $this
            ->withHeaders(
                emailCenterHeaders()
            )
            ->getJson(
                '/api/backoffice/emails/logs'
            )
            ->assertOk()
            ->assertJsonPath(
                'meta.total',
                1
            );
    }
);

test(
    'utilizador comum não acede à central de emails',
    function(){
        $user=
            User::factory()
                ->create([
                    'email'=>
                        'normal.email@frotapro.test',

                    'password'=>
                        Hash::make(
                            'SenhaTeste123!'
                        ),

                    'ativo'=>true,
                ]);

        emailCenterLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                emailCenterHeaders()
            )
            ->getJson(
                '/api/backoffice/emails/summary'
            )
            ->assertForbidden();
    }
);
test(
    'mailer log sem smtp configurado é bloqueado',
    function(){
        Mail::fake();

        config([
            'mail.default'=>'log',
            'mail.enabled'=>true,
        ]);

        expect(
            \App\Models\EmailSetting::query()
                ->count()
        )->toBe(0);

        try{
            app(
                \App\Services\EmailDispatchService::class
            )->send(
                to:
                    'destino@frotapro.test',

                mailable:
                    new EmailTestMail(
                        'Teste'
                    ),

                subject:
                    'Teste sem SMTP',

                category:
                    'system_test'
            );

            $this->fail(
                'O envio deveria ter sido bloqueado.'
            );
        }
        catch(\RuntimeException $exception){
            expect(
                $exception
                    ->getMessage()
            )->toBe(
                'O SMTP do FrotaPRO ainda não está configurado.'
            );
        }

        Mail::assertNothingSent();

        $log=
            EmailLog::query()
                ->latest()
                ->firstOrFail();

        expect(
            $log->status
        )->toBe(
            'failed'
        );

        expect(
            $log->mailer
        )->toBe(
            'smtp'
        );

        expect(
            $log->sent_at
        )->toBeNull();

        expect(
            $log->error
        )->toContain(
            'SMTP do FrotaPRO'
        );
    }
);