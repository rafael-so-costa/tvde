<?php

namespace App\Jobs;

use App\Mail\AlertEmail;
use App\Models\AlertDelivery;
use App\Services\AlertDeliveryService;
use App\Services\EmailDispatchService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SendAlertDelivery implements ShouldQueue
{
    use Queueable;

    public int $tries=3;

    public int $timeout=30;

    public function __construct(
        public string $deliveryId
    ){}

    public function backoff():array
    {
        return[
            60,
            300,
        ];
    }

    public function handle(
        AlertDeliveryService $service
    ):void{
        $emailDispatch=
            app(
                EmailDispatchService::class
            );

        $delivery=
            AlertDelivery::query()
                ->with([
                    'recipient.user',
                    'recipient.alert.rule',
                ])
                ->find(
                    $this->deliveryId
                );

        if(!$delivery){
            return;
        }

        if(in_array(
            $delivery->status,
            [
                'sent',
                'delivered',
                'cancelled',
            ],
            true
        )){
            return;
        }

        $recipient=
            $delivery->recipient;

        $alert=
            $recipient?->alert;

        if(
            !$recipient ||
            !$alert ||
            !$service->emailAllowed(
                $alert,
                $recipient
            )
        ){
            $delivery->status=
                'cancelled';

            $delivery->error=null;

            $delivery->save();

            return;
        }

        $delivery->status=
            'processing';

        $delivery->attempts=
            (int)$delivery->attempts+1;

        $delivery->failed_at=null;
        $delivery->error=null;

        $delivery->save();

        try{
            $mail=
                new AlertEmail(
                    $alert,
                    $recipient
                );

            $emailDispatch->send(
                to:
                    $recipient
                        ->user
                        ->email,

                mailable:
                    $mail,

                subject:
                    '[FrotaPro] '.
                    $mail
                        ->severityLabel.
                    ' — '.
                    $alert
                        ->title,

                category:
                    'alert_immediate',

                tenantId:
                    $delivery
                        ->tenant_id,

                relatedType:
                    'alert',

                relatedId:
                    $alert->id
            );

            $delivery->status='sent';
            $delivery->sent_at=now();
            $delivery->failed_at=null;
            $delivery->error=null;
            $delivery->save();
        }
        catch(Throwable $exception){
            $delivery->status=
                'failed';

            $delivery->failed_at=
                now();

            $delivery->error=
                mb_substr(
                    $exception
                        ->getMessage(),
                    0,
                    10000
                );

            $delivery->save();

            throw $exception;
        }
    }
}