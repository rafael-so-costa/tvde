<?php

namespace App\Jobs;

use App\Mail\AlertDigestEmail;
use App\Models\AlertDigestRun;
use App\Services\AlertDigestService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendAlertDigest implements ShouldQueue
{
    use Queueable;

    public int $tries=3;

    public int $timeout=30;

    public function __construct(
        public string $runId
    ){}

    public function backoff(): array
    {
        return [
            60,
            300,
        ];
    }

    public function handle(
        AlertDigestService $service
    ): void {
        $run=
            AlertDigestRun::query()
                ->with(
                    'user:id,name,email,ativo'
                )
                ->find(
                    $this->runId
                );

        if(!$run){
            return;
        }

        if(in_array(
            $run->status,
            [
                'sent',
                'cancelled',
            ],
            true
        )){
            return;
        }

        if(
            !$run->user ||
            !$run->user->ativo ||
            blank($run->user->email)
        ){
            $run->status='cancelled';
            $run->save();

            return;
        }

        $recipients=
            $service
                ->recipientsForRun(
                    $run
                );

        if($recipients->isEmpty()){
            $run->status='cancelled';
            $run->alert_count=0;
            $run->save();

            return;
        }

        $run->status='processing';

        $run->attempts=
            (int)$run->attempts+1;

        $run->failed_at=null;
        $run->error=null;
        $run->alert_count=
            $recipients->count();

        $run->save();

        try{
            $alerts=
                $recipients
                    ->pluck('alert')
                    ->values();

            Mail::to(
                $run->user->email
            )->send(
                new AlertDigestEmail(
                    $run,
                    $alerts
                )
            );

            $run->status='sent';
            $run->sent_at=now();
            $run->failed_at=null;
            $run->error=null;
            $run->save();
        }catch(Throwable $exception){
            $run->status='failed';
            $run->failed_at=now();

            $run->error=
                mb_substr(
                    $exception
                        ->getMessage(),
                    0,
                    10000
                );

            $run->save();

            throw $exception;
        }
    }
}
