<?php

namespace App\Mail;

use App\Models\Alert;
use App\Models\AlertRecipient;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailable;

class AlertEmail extends Mailable
{
    public string $actionUrl;

    public string $severityLabel;

    public function __construct(
        public Alert $alert,
        public AlertRecipient $recipient
    ){
        $this->actionUrl=
            $this->absoluteUrl(
                $alert->action_url
                ?: '/alertas'
            );

        $this->severityLabel=
            match(
                $alert->severity
            ){
                'critical'=>'Crítico',
                'high'=>'Alta prioridade',
                'medium'=>'Atenção',
                default=>'Informação',
            };
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject:
                '[FrotaPro] '.
                $this->severityLabel.
                ' — '.
                $this->alert->title
        );
    }

    public function content(): Content
    {
        return new Content(
            view:'emails.alert'
        );
    }

    public function attachments(): array
    {
        return [];
    }

    private function absoluteUrl(
        string $url
    ): string {
        if(
            str_starts_with(
                $url,
                'http://'
            ) ||
            str_starts_with(
                $url,
                'https://'
            )
        ){
            return $url;
        }

        return rtrim(
            (string)config(
                'app.url'
            ),
            '/'
        ).
        '/'.
        ltrim(
            $url,
            '/'
        );
    }
}
