<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Assinatura de checklist</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b;padding:24px">
<div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px">
    <h1 style="font-size:22px;margin:0 0 16px">
        FrotaPRO
    </h1>

    <p>Olá {{ $signerName }},</p>

    <p>
        Foi solicitada a sua assinatura para:
        <strong>{{ $checklistName }}</strong>.
    </p>

    <p>
        Utilize o código abaixo para confirmar a assinatura:
    </p>

    <div style="font-size:28px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px;background:#eef2ff;border-radius:10px;margin:20px 0">
        {{ $otp }}
    </div>

    <p style="text-align:center">
        <a
            href="{{ $signatureUrl }}"
            style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:700"
        >
            Abrir e assinar checklist
        </a>
    </p>

    <p style="font-size:13px;color:#64748b">
        Código válido até {{ $expiresAt }}.
    </p>
</div>
</body>
</html>