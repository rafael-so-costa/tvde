<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Resumo diário FrotaPro</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td align="center" style="padding:32px 16px">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:680px;background:#ffffff;border-radius:10px">
                    <tr>
                        <td style="padding:32px">
                            <h1 style="font-size:24px;line-height:1.3;margin:0 0 8px">Resumo diário FrotaPro</h1>
                            <p style="font-size:15px;color:#6b7280;margin:0 0 28px">{{ $alerts->count() }} {{ $alerts->count() === 1 ? 'alerta requer' : 'alertas requerem' }} atenção.</p>

                            @foreach($alerts as $alert)
                            <div style="padding:18px 0;border-top:1px solid #e5e7eb">
                                <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:6px">
                                    {{ match($alert->severity) { 'critical' => 'Crítico', 'high' => 'Alta prioridade', 'medium' => 'Atenção', default => 'Informação' } }}
                                </div>
                                <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:6px">{{ $alert->title }}</div>
                                @if($alert->message)
                                <div style="font-size:14px;line-height:1.6;color:#4b5563">{{ $alert->message }}</div>
                                @endif
                                @if($alert->due_at)
                                <div style="font-size:12px;color:#6b7280;margin-top:8px">Data de referência: {{ $alert->due_at->timezone($run->timezone)->format('d/m/Y H:i') }}</div>
                                @endif
                            </div>
                            @endforeach

                            <div style="padding-top:24px">
                                <a href="{{ $actionUrl }}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:7px;font-size:14px;font-weight:700">Ver todos os alertas</a>
                            </div>

                            <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:32px 0 0">Este é o resumo diário de notificações configurado no FrotaPro.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
