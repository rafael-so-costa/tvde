<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Services\EmailDispatchService;
use Illuminate\Auth\Events\PasswordReset as PasswordResetEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetController extends Controller
{
    private const GENERIC_MESSAGE=
        'Se existir uma conta associada a este e-mail, receberá as instruções para recuperar a palavra-passe.';

    public function __construct(
        private EmailDispatchService $emailDispatch
    ){}

    public function forgot(
        Request $request
    ):JsonResponse{
        $validated=
            $request->validate([
                'email'=>[
                    'required',
                    'email',
                    'max:190',
                ],
            ]);

        $email=
            Str::lower(
                trim(
                    $validated['email']
                )
            );

        $user=
            User::query()
                ->whereRaw(
                    'LOWER(email) = ?',
                    [$email]
                )
                ->where(
                    'ativo',
                    true
                )
                ->first();

        if(!$user){
            return response()->json([
                'message'=>
                    self::GENERIC_MESSAGE,
            ]);
        }

        try{
            $token=
                Password::broker()
                    ->createToken(
                        $user
                    );

            $resetUrl=
                rtrim(
                    (string)config(
                        'mail.public_url'
                    ),
                    '/'
                ).
                '/redefinir-senha?'.
                http_build_query([
                    'token'=>$token,
                    'email'=>$user->email,
                ]);

            $this
                ->emailDispatch
                ->send(
                    to:
                        $user->email,

                    mailable:
                        new PasswordResetMail(
                            userName:
                                $user->name,

                            resetUrl:
                                $resetUrl,

                            expiresMinutes:
                                (int)config(
                                    'auth.passwords.users.expire',
                                    60
                                )
                        ),

                    subject:
                        'Recuperação de palavra-passe — FrotaPRO',

                    category:
                        'password_reset',

                    relatedType:
                        'user',

                    relatedId:
                        $user->id
                );
        }
        catch(Throwable $exception){
            report(
                $exception
            );
        }

        return response()->json([
            'message'=>
                self::GENERIC_MESSAGE,
        ]);
    }

    public function reset(
        Request $request
    ):JsonResponse{
        $validated=
            $request->validate([
                'email'=>[
                    'required',
                    'email',
                    'max:190',
                ],

                'token'=>[
                    'required',
                    'string',
                ],

                'password'=>[
                    'required',
                    'confirmed',
                    PasswordRule::min(8)
                        ->letters()
                        ->mixedCase()
                        ->numbers(),
                ],

                'password_confirmation'=>[
                    'required',
                    'string',
                ],
            ]);

        $email=
            Str::lower(
                trim(
                    $validated['email']
                )
            );

        $user=
            User::query()
                ->whereRaw(
                    'LOWER(email) = ?',
                    [$email]
                )
                ->where(
                    'ativo',
                    true
                )
                ->first();

        if(!$user){
            throw ValidationException::withMessages([
                'email'=>
                    'O link de recuperação é inválido ou expirou.',
            ]);
        }

        $status=
            Password::broker()
                ->reset(
                    [
                        'email'=>
                            $user->email,

                        'password'=>
                            $validated[
                                'password'
                            ],

                        'password_confirmation'=>
                            $validated[
                                'password_confirmation'
                            ],

                        'token'=>
                            $validated[
                                'token'
                            ],
                    ],
                    function(
                        User $user,
                        string $password
                    ){
                        $user->forceFill([
                            'password'=>
                                $password,

                            'remember_token'=>
                                Str::random(
                                    60
                                ),
                        ])->save();

                        DB::table(
                            'sessions'
                        )
                            ->where(
                                'user_id',
                                $user->id
                            )
                            ->delete();

                        event(
                            new PasswordResetEvent(
                                $user
                            )
                        );
                    }
                );

        if(
            $status!==
            Password::PASSWORD_RESET
        ){
            throw ValidationException::withMessages([
                'email'=>
                    'O link de recuperação é inválido ou expirou.',
            ]);
        }

        return response()->json([
            'message'=>
                'A palavra-passe foi alterada com sucesso. Já pode iniciar sessão.',
        ]);
    }
}