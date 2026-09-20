<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Assinatura de contrato</title>
</head>

<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 8px;color:#4f46e5;font-size:13px;font-weight:700;text-transform:uppercase;">FrotaPRO</p>

                            <h1 style="margin:0;font-size:24px;line-height:1.3;">Assinatura de contrato pendente</h1>

                            <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">
                                Olá, {{ $signerName }}.
                            </p>

                            <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">
                                Foi solicitada a sua assinatura no documento <strong>{{ $contractName }}</strong>.
                            </p>

                            <p style="margin:24px 0 8px;font-size:13px;color:#64748b;">Código de confirmação</p>

                            <div style="font-size:30px;font-weight:700;letter-spacing:8px;color:#0f172a;">
                                {{ $otp }}
                            </div>

                            @if($expiresAt)
                            <p style="margin:8px 0 0;font-size:13px;color:#64748b;">
                                Este código é válido até {{ $expiresAt }}.
                            </p>
                            @endif

                            <p style="margin:28px 0;">
                                <a href="{{ $signatureUrl }}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 20px;border-radius:10px;">
                                    Abrir e assinar contrato
                                </a>
                            </p>

                            <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                                Se o botão não funcionar, copie e cole este endereço no navegador:
                            </p>

                            <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#475569;">
                                {{ $signatureUrl }}
                            </p>

                            <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;">
                                Se não reconhece esta solicitação, ignore esta mensagem.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
