<?php

namespace App\Services;

use App\Mail\RemoteSignatureRequestMail;
use App\Models\AssinaturaDigital;
use RuntimeException;

class RemoteSignatureMailService
{
    public function __construct(
        private EmailDispatchService $emailDispatch
    ){}

    public function send(
        AssinaturaDigital $assinatura
    ):void{
        $assinatura->loadMissing(
            'contrato.template'
        );

        $contrato=
            $assinatura->contrato;

        if(!$contrato){
            throw new RuntimeException(
                'Contrato da assinatura não encontrado.'
            );
        }

        $email=
            strtolower(
                trim(
                    (string)
                    $assinatura
                        ->signatario_email
                )
            );

        if(
            !filter_var(
                $email,
                FILTER_VALIDATE_EMAIL
            )
        ){
            throw new RuntimeException(
                'O signatário não possui um e-mail válido.'
            );
        }

        $token=
            (string)
            $assinatura
                ->token_verificacao;

        $otp=
            (string)
            $assinatura
                ->codigo_otp;

        if(
            $token==='' ||
            $otp===''
        ){
            throw new RuntimeException(
                'A solicitação de assinatura não possui token ou OTP ativo.'
            );
        }

        $baseUrl=
            rtrim(
                (string)
                config(
                    'mail.public_url'
                ),
                '/'
            );

        $signatureUrl=
            $baseUrl.
            '/assinaturas/remotas/'.
            $token;

        $expiresAt=
            $assinatura
                ->otp_expira_em
                ?->timezone(
                    config(
                        'app.timezone'
                    )
                )
                ->format(
                    'd/m/Y H:i'
                )
            ?? '';

        $contractName=
            $contrato
                ->template
                ?->nome
            ?: 'Contrato';

        $mail=
            new RemoteSignatureRequestMail(
                signerName:
                    $assinatura
                        ->signatario_nome
                        ?: 'Signatário',

                contractName:
                    $contractName,

                signatureUrl:
                    $signatureUrl,

                otp:
                    $otp,

                expiresAt:
                    $expiresAt
            );

        $this
            ->emailDispatch
            ->send(
                to:
                    $email,

                mailable:
                    $mail,

                subject:
                    'Assinatura pendente - '.
                    $contractName,

                category:
                    'contract_signature',

                tenantId:
                    $contrato
                        ->tenant_id,

                relatedType:
                    'assinatura_digital',

                relatedId:
                    $assinatura
                        ->id
            );
    }
}