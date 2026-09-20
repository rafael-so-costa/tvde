<?php

namespace App\Services;

use App\Mail\RemoteSignatureRequestMail;
use App\Models\AssinaturaDigital;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class RemoteSignatureMailService
{
    public function send(
        AssinaturaDigital $assinatura
    ): void {
        $assinatura->loadMissing(
            'contrato.template'
        );

        $contrato =
            $assinatura->contrato;

        if (!$contrato) {
            throw new RuntimeException(
                'Contrato da assinatura não encontrado.'
            );
        }

        $email = strtolower(
            trim(
                (string)
                $assinatura
                    ->signatario_email
            )
        );

        if (
            !filter_var(
                $email,
                FILTER_VALIDATE_EMAIL
            )
        ) {
            throw new RuntimeException(
                'O signatário não possui um e-mail válido.'
            );
        }

        $token =
            (string)
            $assinatura
                ->token_verificacao;

        $otp =
            (string)
            $assinatura
                ->codigo_otp;

        if (
            $token === '' ||
            $otp === ''
        ) {
            throw new RuntimeException(
                'A solicitação de assinatura não possui token ou OTP ativo.'
            );
        }

        $baseUrl =
            rtrim(
                (string)
                config(
                    'app.url'
                ),
                '/'
            );

        $signatureUrl =
            $baseUrl .
            '/assinaturas/remotas/' .
            $token;

        $expiresAt =
            $assinatura
                ->otp_expira_em
                ?->timezone(
                    config(
                        'app.timezone'
                    )
                )
                ->format(
                    'd/m/Y H:i'
                ) ??
            '';

        Mail::to(
            $email
        )->send(
            new RemoteSignatureRequestMail(
                signerName:
                    $assinatura
                        ->signatario_nome
                        ?: 'Signatário',

                contractName:
                    $contrato
                        ->template
                        ?->nome
                        ?: 'Contrato',

                signatureUrl:
                    $signatureUrl,

                otp:
                    $otp,

                expiresAt:
                    $expiresAt
            )
        );
    }
}
