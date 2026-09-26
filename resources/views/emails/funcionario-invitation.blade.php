<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="utf-8">
    <title>Convite FrotaPRO</title>
</head>

<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
        <h1 style="margin:0 0 16px;font-size:24px">Convite para o FrotaPRO</h1>

        <p>Olá {{ $invitation->funcionario->nome }},</p>

        <p>A organização <strong>{{ $invitation->tenant->nome }}</strong> convidou-o para aceder ao FrotaPRO.</p>

        <p>Para criar a sua palavra-passe e ativar a conta, utilize o botão abaixo:</p>

        <p style="margin:28px 0">
            <a href="{{ $url }}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Ativar conta</a>
        </p>

        <p style="font-size:13px;color:#64748b">
            Este convite expira em {{ $invitation->expires_at->timezone(config('app.timezone'))->format('d/m/Y H:i') }}.
        </p>

        <p style="font-size:13px;color:#64748b">
            Se não reconhece este convite, pode ignorar esta mensagem.
        </p>
    </div>
</body>

</html>
