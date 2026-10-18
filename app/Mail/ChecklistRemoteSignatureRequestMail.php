<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ChecklistRemoteSignatureRequestMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $signerName,
        public string $checklistName,
        public string $signatureUrl,
        public string $otp,
        public string $expiresAt
    ) {}

    public function build():self
    {
        return $this
            ->subject(
                'Assinatura de checklist — FrotaPRO'
            )
            ->view(
                'emails.checklist-remote-signature-request'
            );
    }
}