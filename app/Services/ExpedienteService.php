<?php

namespace App\Services;

use App\Models\Motorista;
use App\Models\RegistoExpediente;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExpedienteService
{
    private const TIMEZONE = 'Europe/Lisbon';

    public function __construct(private PermissionService $permissionService) {}

    public function markAuthenticated(User $user, string $tenantId, ?string $ip = null, ?string $userAgent = null): RegistoExpediente
    {
        if (!$user->hasRole('motorista', $tenantId)) {
            abort(403, 'Apenas motoristas podem registar o próprio expediente.');
        }

        $motorista = Motorista::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->where('ativo', true)
            ->first();

        if (!$motorista) {
            throw ValidationException::withMessages([
                'motorista' => 'Não existe motorista ativo associado a esta conta.',
            ]);
        }

        return $this->mark($motorista, 'app', $ip, $userAgent);
    }

    public function markPublic(string $nif, ?string $tenantId = null, ?string $ip = null, ?string $userAgent = null): RegistoExpediente
    {
        $nif = preg_replace('/\D+/', '', $nif) ?? '';

        $query = Motorista::query()
            ->where('nif', $nif)
            ->where('ativo', true);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $motoristas = $query->limit(2)->get();

        if ($motoristas->isEmpty()) {
            throw ValidationException::withMessages([
                'nif' => 'Não foi encontrado um motorista ativo com estes dados.',
            ]);
        }

        if (!$tenantId && $motoristas->count() > 1) {
            throw ValidationException::withMessages([
                'tenant_id' => 'Este NIF está associado a mais de uma organização. Utilize o link fornecido pela empresa.',
            ]);
        }

        return $this->mark($motoristas->first(), 'publico', $ip, $userAgent);
    }

    public function correct(string $id, array $data, User $user, string $tenantId): RegistoExpediente
    {
        return DB::transaction(function () use ($id, $data, $user, $tenantId) {
            $registo = RegistoExpediente::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $canConfigure = $this->permissionService->allows(
                $user,
                'expediente',
                'configurar',
                $tenantId
            );

            if (!$canConfigure) {
                if (!$user->hasRole('motorista', $tenantId)) {
                    abort(403, 'Sem permissão suficiente para corrigir este registo.');
                }

                $motorista = Motorista::query()
                    ->where('tenant_id', $tenantId)
                    ->where('user_id', $user->id)
                    ->first();

                if (!$motorista || $motorista->id !== $registo->motorista_id) {
                    abort(403, 'Só pode corrigir os próprios registos.');
                }

                $limite = CarbonImmutable::now(self::TIMEZONE)->subDays(30)->startOfDay();

                if (CarbonImmutable::parse($registo->data_local, self::TIMEZONE)->lt($limite)) {
                    throw ValidationException::withMessages([
                        'data_hora' => 'Só pode corrigir registos dos últimos 30 dias.',
                    ]);
                }
            }

            $novaHora = CarbonImmutable::parse($data['data_hora'])->setTimezone(self::TIMEZONE);

            if ($novaHora->gt(CarbonImmutable::now(self::TIMEZONE)->addMinutes(5))) {
                throw ValidationException::withMessages([
                    'data_hora' => 'A data/hora do registo não pode estar no futuro.',
                ]);
            }

            if (!$canConfigure) {
                $limite = CarbonImmutable::now(self::TIMEZONE)->subDays(30)->startOfDay();

                if ($novaHora->lt($limite)) {
                    throw ValidationException::withMessages([
                        'data_hora' => 'A correção não pode mover o registo para fora dos últimos 30 dias.',
                    ]);
                }
            }

            $registo->data_hora = $novaHora->utc();
            $registo->data_local = $novaHora->toDateString();
            $registo->corrigido = true;
            $registo->corrigido_por = $user->id;
            $registo->corrigido_em = now();
            $registo->observacoes_correcao = blank($data['observacoes_correcao'] ?? null)
                ? null
                : trim($data['observacoes_correcao']);

            $registo->save();

            return $this->load($registo);
        });
    }

    public function queryForUser(User $user, string $tenantId): Builder
    {
        $query = RegistoExpediente::query()->where('tenant_id', $tenantId);

        if ($this->permissionService->allows($user, 'expediente', 'visualizar', $tenantId)) {
            return $query;
        }

        if ($user->hasRole('motorista', $tenantId)) {
            $motoristaId = Motorista::query()
                ->where('tenant_id', $tenantId)
                ->where('user_id', $user->id)
                ->value('id');

            return $motoristaId
                ? $query->where('motorista_id', $motoristaId)
                : $query->whereRaw('1 = 0');
        }

        abort(403, 'Sem permissão suficiente para este recurso.');
    }

    public function motoristaForUser(User $user, string $tenantId): Motorista
    {
        $motorista = Motorista::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->first();

        if (!$motorista) {
            abort(404, 'Motorista associado à conta não encontrado.');
        }

        return $motorista;
    }

    public function estado(Motorista $motorista): array
    {
        $today = CarbonImmutable::now(self::TIMEZONE)->toDateString();

        $ultimo = RegistoExpediente::query()
            ->where('tenant_id', $motorista->tenant_id)
            ->where('motorista_id', $motorista->id)
            ->orderByDesc('data_hora')
            ->first();

        $registosHoje = RegistoExpediente::query()
            ->where('tenant_id', $motorista->tenant_id)
            ->where('motorista_id', $motorista->id)
            ->where('data_local', $today)
            ->count();

        return [
            'motorista_id' => $motorista->id,
            'em_servico' => $ultimo?->tipo === 'entrada',
            'desde' => $ultimo?->tipo === 'entrada' ? $ultimo->data_hora : null,
            'ultimo_registo' => $ultimo,
            'registos_hoje' => $registosHoje,
        ];
    }

    public function statistics(string $tenantId, string $dataInicio, string $dataFim): array
    {
        $motoristas = Motorista::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('nome_completo')
            ->get(['id', 'nome_completo', 'nif', 'ativo']);

        $registos = RegistoExpediente::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('data_local', [$dataInicio, $dataFim])
            ->orderBy('data_hora')
            ->get();

        $ultimos = RegistoExpediente::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('data_hora')
            ->get()
            ->groupBy('motorista_id')
            ->map(fn(Collection $items) => $items->last());

        $grouped = $registos->groupBy('motorista_id');

        return $motoristas->map(function (Motorista $motorista) use ($grouped, $ultimos) {
            $items = $grouped->get($motorista->id, collect());
            $segundos = $this->workedSeconds($items);

            $dias = $items
                ->where('tipo', 'entrada')
                ->pluck('data_local')
                ->map(fn($date) => CarbonImmutable::parse($date)->toDateString())
                ->unique()
                ->count();

            $ultimo = $ultimos->get($motorista->id);

            return [
                'motorista_id' => $motorista->id,
                'nome_completo' => $motorista->nome_completo,
                'nif' => $motorista->nif,
                'ativo' => $motorista->ativo,
                'segundos_trabalhados' => $segundos,
                'dias_online' => $dias,
                'media_diaria_segundos' => $dias > 0 ? (int) round($segundos / $dias) : 0,
                'ultimo_registo' => $ultimo?->data_hora,
                'em_servico' => $ultimo?->tipo === 'entrada',
            ];
        })->values()->all();
    }

    public function workedSeconds(Collection $records): int
    {
        $seconds = 0;

        foreach (
            $records->groupBy(
                fn(RegistoExpediente $item) => (string) $item->data_local
            ) as $dayRecords
        ) {
            $entrada = null;

            foreach ($dayRecords->sortBy('data_hora') as $record) {
                if ($record->tipo === 'entrada') {
                    $entrada = $record->data_hora;
                    continue;
                }

                if ($record->tipo === 'saida' && $entrada) {
                    $seconds += max(
                        0,
                        $entrada->diffInSeconds($record->data_hora, false)
                    );

                    $entrada = null;
                }
            }
        }

        return $seconds;
    }

    private function mark(Motorista $motorista, string $origem, ?string $ip, ?string $userAgent): RegistoExpediente
    {
        return DB::transaction(function () use ($motorista, $origem, $ip, $userAgent) {
            $locked = Motorista::query()
                ->whereKey($motorista->id)
                ->where('tenant_id', $motorista->tenant_id)
                ->lockForUpdate()
                ->firstOrFail();

            if (!$locked->ativo) {
                throw ValidationException::withMessages([
                    'motorista' => 'O motorista não está ativo.',
                ]);
            }

            $localNow = CarbonImmutable::now(self::TIMEZONE);
            $dataLocal = $localNow->toDateString();

            $count = RegistoExpediente::query()
                ->where('tenant_id', $locked->tenant_id)
                ->where('motorista_id', $locked->id)
                ->where('data_local', $dataLocal)
                ->count();

            $registo = new RegistoExpediente([
                'data_hora' => $localNow->utc(),
                'tipo' => $count % 2 === 0 ? 'entrada' : 'saida',
                'data_local' => $dataLocal,
                'origem' => $origem,
                'ip_address' => $ip,
                'user_agent' => $userAgent ? mb_substr($userAgent, 0, 500) : null,
            ]);

            $registo->tenant_id = $locked->tenant_id;
            $registo->motorista_id = $locked->id;
            $registo->save();

            return $this->load($registo);
        });
    }

    private function load(RegistoExpediente $registo): RegistoExpediente
    {
        return $registo->load([
            'motorista:id,nome_completo,nif,email,telemovel,user_id',
            'corrigidoPor:id,name',
        ]);
    }
}
