<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Manutencao;
use App\Models\Motorista;
use App\Models\Multa;
use App\Models\User;
use Carbon\CarbonImmutable;

class MotoristaDashboardService
{
    private const TIMEZONE = 'Europe/Lisbon';

    public function __construct(private ExpedienteService $expedienteService) {}

    public function data(User $user, string $tenantId): array
    {
        if (! $user->hasRole('motorista', $tenantId)) {
            abort(403, 'Apenas motoristas podem aceder a este dashboard.');
        }

        $motorista = $this->expedienteService->motoristaForUser($user, $tenantId);
        $atribuicao = $this->currentAssignment($motorista, $tenantId);
        $veiculo = $atribuicao?->veiculo;
        $contrato = $atribuicao?->contrato;
        $expediente = $this->expedienteService->estado($motorista);
        $documentos = $this->documents($motorista, $veiculo);

        $multas = Multa::query()
            ->where('tenant_id', $tenantId)
            ->where('motorista_id', $motorista->id);

        $manutencoes = Manutencao::query()
            ->where('tenant_id', $tenantId)
            ->where('motorista_id', $motorista->id);

        $abertas = (clone $manutencoes)
            ->whereNotIn('status', ['concluida', 'cancelada']);

        $ultimaManutencao = (clone $abertas)
            ->orderByRaw('CASE WHEN data_agendada IS NULL THEN 1 ELSE 0 END')
            ->orderBy('data_agendada')
            ->orderByDesc('created_at')
            ->first();

        $alerts = $this->alerts($user, $tenantId);

        return [
            'motorista' => [
                'id' => $motorista->id,
                'nome' => $motorista->nome_completo,
                'ativo' => (bool) $motorista->ativo,
                'status_cadastro' => $motorista->status_cadastro,
                'foto_perfil_url' => $motorista->foto_perfil_url,
            ],
            'expediente' => [
                'em_servico' => (bool) $expediente['em_servico'],
                'desde' => $expediente['desde']?->toISOString(),
                'registos_hoje' => $expediente['registos_hoje'],
                'ultimo_registo' => $expediente['ultimo_registo'] ? [
                    'id' => $expediente['ultimo_registo']->id,
                    'tipo' => $expediente['ultimo_registo']->tipo,
                    'data_hora' => $expediente['ultimo_registo']->data_hora?->toISOString(),
                ] : null,
            ],
            'veiculo' => $veiculo ? [
                'id' => $veiculo->id,
                'matricula' => $veiculo->matricula,
                'marca' => $veiculo->marca,
                'modelo' => $veiculo->modelo,
                'ativo' => (bool) $veiculo->ativo,
                'status_cadastro' => $veiculo->status_cadastro,
            ] : null,
            'contrato' => $contrato ? [
                'id' => $contrato->id,
                'tipo' => $contrato->tipo,
                'status' => $contrato->status,
                'data_inicio' => $contrato->data_inicio?->toDateString(),
                'data_fim' => $contrato->data_fim?->toDateString(),
                'pdf_disponivel' => filled($contrato->pdf_gerado_url),
            ] : null,
            'documentos' => [
                'vencidos' => collect($documentos)->where('dias_restantes', '<', 0)->count(),
                'a_vencer_30_dias' => collect($documentos)->filter(fn (array $item) => $item['dias_restantes'] >= 0 && $item['dias_restantes'] <= 30)->count(),
                'proximo' => $documentos[0] ?? null,
                'items' => $documentos,
            ],
            'multas' => [
                'pendentes' => (clone $multas)->where('status', 'pendente')->count(),
                'contestadas' => (clone $multas)->where('status', 'contestada')->count(),
                'total_abertas' => (clone $multas)->whereIn('status', ['pendente', 'contestada'])->count(),
            ],
            'manutencoes' => [
                'abertas' => $abertas->count(),
                'proxima' => $ultimaManutencao ? [
                    'id' => $ultimaManutencao->id,
                    'numero_ordem' => $ultimaManutencao->numero_ordem,
                    'tipo_servico' => $ultimaManutencao->tipo_servico,
                    'status' => $ultimaManutencao->status,
                    'prioridade' => $ultimaManutencao->prioridade,
                    'data_agendada' => $ultimaManutencao->data_agendada?->format('Y-m-d'),
                ] : null,
            ],
            'alertas' => $alerts,
        ];
    }

    private function currentAssignment(Motorista $motorista, string $tenantId): ?ContratoAtivoVeiculo
    {
        return ContratoAtivoVeiculo::query()
            ->where('tenant_id', $tenantId)
            ->where('motorista_id', $motorista->id)
            ->where('ativo', true)
            ->with(['veiculo', 'contrato'])
            ->orderByDesc('data_inicio')
            ->first();
    }

    private function documents(Motorista $motorista, $veiculo): array
    {
        $items = [
            ['codigo' => 'documento', 'nome' => 'Documento de identificação', 'origem' => 'motorista', 'data' => $motorista->documento_valid_until],
            ['codigo' => 'carta_conducao', 'nome' => 'Carta de condução', 'origem' => 'motorista', 'data' => $motorista->carta_valid_until],
            ['codigo' => 'registo_criminal', 'nome' => 'Registo criminal', 'origem' => 'motorista', 'data' => $motorista->registo_criminal_valid_until],
            ['codigo' => 'certificado_tvde', 'nome' => 'Certificado TVDE', 'origem' => 'motorista', 'data' => $motorista->certificado_tvde_valid_until],
        ];

        if ($veiculo) {
            $items = array_merge($items, [
                ['codigo' => 'carta_verde', 'nome' => 'Carta verde', 'origem' => 'veiculo', 'data' => $veiculo->carta_verde_valid_until],
                ['codigo' => 'inspecao_tvde', 'nome' => 'Inspeção TVDE', 'origem' => 'veiculo', 'data' => $veiculo->inspecao_tvde_valid_until],
                ['codigo' => 'uber', 'nome' => 'Uber', 'origem' => 'veiculo', 'data' => $veiculo->uber_valid_until],
                ['codigo' => 'bolt', 'nome' => 'Bolt', 'origem' => 'veiculo', 'data' => $veiculo->bolt_valid_until],
                ['codigo' => 'extintor', 'nome' => 'Extintor', 'origem' => 'veiculo', 'data' => $veiculo->extintor_valid_until],
            ]);
        }

        $today = CarbonImmutable::today(self::TIMEZONE);

        return collect($items)
            ->filter(fn (array $item) => filled($item['data']))
            ->map(function (array $item) use ($today) {
                $date = CarbonImmutable::parse($item['data'], self::TIMEZONE)->startOfDay();

                return [
                    'codigo' => $item['codigo'],
                    'nome' => $item['nome'],
                    'origem' => $item['origem'],
                    'valid_until' => $date->toDateString(),
                    'dias_restantes' => (int) $today->diffInDays($date, false),
                    'vencido' => $date->lt($today),
                ];
            })
            ->sortBy('valid_until')
            ->values()
            ->all();
    }

    private function alerts(User $user, string $tenantId): array
    {
        $base = Alert::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'open')
            ->whereHas('recipients', function ($query) use ($tenantId, $user) {
                $query
                    ->where('tenant_id', $tenantId)
                    ->where('user_id', $user->id)
                    ->where('active', true)
                    ->where(function ($query) {
                        $query->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
                    });
            });

        $unread = (clone $base)
            ->whereHas('recipients', fn ($query) => $query
                ->where('tenant_id', $tenantId)
                ->where('user_id', $user->id)
                ->where('active', true)
                ->whereNull('read_at')
            )
            ->count();

        $items = (clone $base)
            ->orderByRaw("CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->orderByRaw('CASE WHEN due_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_at')
            ->limit(5)
            ->get()
            ->map(fn (Alert $alert) => [
                'id' => $alert->id,
                'severity' => $alert->severity,
                'category' => $alert->category,
                'title' => $alert->title,
                'message' => $alert->message,
                'due_at' => $alert->due_at?->toISOString(),
                'action_url' => $alert->action_url,
            ])
            ->values()
            ->all();

        return [
            'total' => $base->count(),
            'nao_lidos' => $unread,
            'items' => $items,
        ];
    }
}
