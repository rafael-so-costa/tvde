<?php

namespace App\Mail;

use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailable;

class PasswordResetMail extends Mailable
{
    public function __construct(
        public string $userName,
        public string $resetUrl,
        public int $expiresMinutes=60
    ){}

    public function envelope():Envelope
    {
        return new Envelope(
            subject:
                'Recuperação de palavra-passe — FrotaPRO'
        );
    }

    public function content():Content
    {
        return new Content(
            view:
                'emails.password-reset'
        );
    }

    public function attachments():array
    {
        return[];
    }
}