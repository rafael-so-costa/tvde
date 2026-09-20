<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RemoteSignatureRequestMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $signerName,
        public string $contractName,
        public string $signatureUrl,
        public string $otp,
        public string $expiresAt
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject:
                'Assinatura pendente - ' .
                $this->contractName
        );
    }

    public function content(): Content
    {
        return new Content(
            view:
                'emails.remote-signature-request'
        );
    }
}
