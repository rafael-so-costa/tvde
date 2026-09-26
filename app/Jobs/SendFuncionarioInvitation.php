<?php

namespace App\Jobs;

use App\Mail\FuncionarioInvitationMail;
use App\Models\FuncionarioInvitation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendFuncionarioInvitation implements ShouldQueue
{
    use Queueable;

    public int $tries=3;

    public function __construct(
        public string $invitationId
    ){}

    public function handle(): void
    {
        $invitation=
            FuncionarioInvitation::query()
                ->with([
                    'funcionario',
                    'tenant',
                ])
                ->find(
                    $this->invitationId
                );

        if(
            !$invitation ||
            $invitation->accepted_at ||
            $invitation->revoked_at ||
            !$invitation
                ->token_ciphertext ||
            $invitation
                ->expires_at
                ?->isPast()
        ){
            return;
        }

        $invitation->increment(
            'send_attempts'
        );

        try{
            $token=
                Crypt::decryptString(
                    $invitation
                        ->token_ciphertext
                );

            $url=
                rtrim(
                    (string)
                    config('app.url'),
                    '/'
                ).
                '/convites/funcionario/'.
                $token;

            Mail::to(
                $invitation->email
            )->send(
                new FuncionarioInvitationMail(
                    $invitation,
                    $url
                )
            );

            $invitation->forceFill([
                'sent_at'=>now(),
                'last_error'=>null,
            ])->save();
        }catch(Throwable $exception){
            $invitation->forceFill([
                'last_error'=>
                    mb_substr(
                        $exception
                            ->getMessage(),
                        0,
                        5000
                    ),
            ])->save();

            throw $exception;
        }
    }
}
