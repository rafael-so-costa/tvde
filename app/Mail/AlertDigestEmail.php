<?php

namespace App\Mail;

use App\Models\AlertDigestRun;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Collection;

class AlertDigestEmail extends Mailable
{
    public string $actionUrl;

    public function __construct(
        public AlertDigestRun $run,
        public Collection $alerts
    ){
        $this->actionUrl=
            rtrim(
                (string)config(
                    'mail.public_url'
                ),
                '/'
            ).
            '/alertas';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject:
                '[FrotaPro] Resumo diário — '.
                $this->alerts->count().
                (
                    $this->alerts->count()===1
                        ? ' alerta'
                        : ' alertas'
                )
        );
    }

    public function content(): Content
    {
        return new Content(
            view:
                'emails.alert-digest'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
