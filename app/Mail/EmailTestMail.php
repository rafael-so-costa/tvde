<?php

namespace App\Mail;

use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailable;

class EmailTestMail extends Mailable
{
    public function __construct(
        public string $recipientName='Administrador'
    ){}

    public function envelope():Envelope
    {
        return new Envelope(
            subject:
                'Teste de envio — FrotaPRO'
        );
    }

    public function content():Content
    {
        return new Content(
            view:
                'emails.email-test'
        );
    }

    public function attachments():array
    {
        return[];
    }
}