<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recuperação de palavra-passe</title>
</head>
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b">
<div style="padding:32px 16px">
<div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
<div style="background:#0f172a;padding:24px 28px;color:#fff">
<div style="font-size:24px;font-weight:700">FrotaPRO</div>
<div style="margin-top:4px;font-size:12px;color:#a5b4fc;text-transform:uppercase;letter-spacing:.12em">Gestão TVDE</div>
</div>
<div style="padding:28px">
<h1 style="font-size:22px;margin:0 0 18px">Recuperar palavra-passe</h1>
<p>Olá {{ $userName }},</p>
<p>Recebemos um pedido para redefinir a palavra-passe da sua conta FrotaPRO.</p>
<p style="text-align:center;margin:28px 0">
<a href="{{ $resetUrl }}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700">Definir nova palavra-passe</a>
</p>
<p style="font-size:14px;color:#64748b">Este link é válido por {{ $expiresMinutes }} minutos e só pode ser utilizado enquanto o pedido de recuperação estiver ativo.</p>
<p style="font-size:14px;color:#64748b">Se não solicitou esta alteração, ignore esta mensagem. A sua palavra-passe continuará inalterada.</p>
</div>
</div>
</div>
</body>
</html>