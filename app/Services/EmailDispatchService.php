<?php

namespace App\Services;

use App\Models\EmailLog;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class EmailDispatchService
{
    public function __construct(
        private EmailConfigurationService $configuration
    ){}

    public function send(
        string $to,
        Mailable $mailable,
        string $subject,
        string $category,
        ?string $tenantId=null,
        ?string $relatedType=null,
        ?string $relatedId=null,
        ?string $initiatedByUserId=null
    ):EmailLog{
        $recipient=
            Str::lower(
                trim(
                    $to
                )
            );

        if(
            !filter_var(
                $recipient,
                FILTER_VALIDATE_EMAIL
            )
        ){
            throw new RuntimeException(
                'O destinatário do e-mail é inválido.'
            );
        }

        $setting=
            $this
                ->configuration
                ->setting();

        $mailer=
            $this
                ->configuration
                ->mailerName(
                    $setting
                );

        $log=
            EmailLog::create([
                'tenant_id'=>
                    $tenantId,

                'initiated_by_user_id'=>
                    $initiatedByUserId,

                'recipient_email'=>
                    $recipient,

                'subject'=>
                    mb_substr(
                        trim($subject),
                        0,
                        500
                    ),

                'category'=>
                    mb_substr(
                        trim($category),
                        0,
                        80
                    ),

                'mailer'=>
                    mb_substr(
                        $mailer,
                        0,
                        50
                    ),

                'status'=>'processing',
                'attempts'=>1,

                'related_type'=>
                    $relatedType,

                'related_id'=>
                    $relatedId,
            ]);

        if(
            !$this
                ->configuration
                ->enabled(
                    $setting
                )
        ){
            $message=
                'O envio de e-mails está desativado no FrotaPRO.';

            $log->forceFill([
                'status'=>'blocked',
                'error'=>$message,
            ])->save();

            throw new RuntimeException(
                $message
            );
        }

        try{
            $mailer=
                $this
                    ->configuration
                    ->apply(
                        $setting
                    );

            $log->mailer=
                $mailer;

            $log->save();

            Mail::to(
                $recipient
            )->send(
                $mailable
            );

            /*
             * "sent" significa que o transporte
             * aceitou a mensagem. Não significa
             * entrega final na caixa postal.
             */
            $log->forceFill([
                'status'=>'sent',
                'sent_at'=>now(),
                'failed_at'=>null,
                'error'=>null,
            ])->save();

            return $log->refresh();
        }
        catch(Throwable $exception){
            $log->forceFill([
                'status'=>'failed',

                'failed_at'=>now(),

                'error'=>
                    mb_substr(
                        $exception
                            ->getMessage(),
                        0,
                        10000
                    ),
            ])->save();

            throw $exception;
        }
    }
}