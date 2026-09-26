<?php

namespace App\Mail;

use App\Models\FuncionarioInvitation;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailable;

class FuncionarioInvitationMail extends Mailable
{
    public function __construct(
        public FuncionarioInvitation $invitation,
        public string $url
    ){}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject:
                'Convite para aceder ao FrotaPRO'
        );
    }

    public function content(): Content
    {
        return new Content(
            view:
                'emails.funcionario-invitation'
        );
    }
}
