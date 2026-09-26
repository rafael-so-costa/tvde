<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ $alert->title }}</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td align="center" style="padding:32px 16px">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;background:#ffffff;border-radius:10px">
                    <tr>
                        <td style="padding:32px">
                            <div style="font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:12px">{{ $severityLabel }}</div>
                            <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">{{ $alert->title }}</h1>

                            @if($alert->message)
                            <p style="font-size:16px;line-height:1.6;margin:0 0 24px">{{ $alert->message }}</p>
                            @endif

                            @if($alert->due_at)
                            <p style="font-size:14px;line-height:1.5;margin:0 0 24px"><strong>Data de referência:</strong> {{ $alert->due_at->timezone(config('app.timezone'))->format('d/m/Y H:i') }}</p>
                            @endif

                            <a href="{{ $actionUrl }}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:7px;font-size:14px;font-weight:700">Ver no FrotaPro</a>

                            <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:32px 0 0">Esta notificação foi gerada automaticamente pelo FrotaPro.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
