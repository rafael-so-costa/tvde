<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teste de envio FrotaPRO</title>
</head>
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b">
<div style="padding:32px 16px">
<div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
<div style="background:#0f172a;padding:24px 28px;color:#fff">
<div style="font-size:24px;font-weight:700">FrotaPRO</div>
</div>
<div style="padding:28px">
<h1 style="font-size:22px;margin:0 0 18px">Configuração de e-mail validada</h1>
<p>Olá {{ $recipientName }},</p>
<p>Esta mensagem confirma que o FrotaPRO conseguiu enviar um e-mail utilizando a configuração atualmente definida na Central de E-mails.</p>
<p style="margin-top:24px;font-size:13px;color:#64748b">Data do teste: {{ now()->timezone(config('app.timezone'))->format('d/m/Y H:i:s') }}</p>
</div>
</div>
</div>
</body>
</html>