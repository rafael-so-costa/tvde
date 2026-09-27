<?php

namespace App\Http\Controllers;

use App\Models\Aluguer;
use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use App\Models\User;
use App\Models\Veiculo;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService
    ) {}

    public function show(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId();
        $user = $request->user();

        $permissions = [
            'veiculos' => $this->permissionService->allows($user, 'veiculos', 'visualizar', $tenantId),
            'motoristas' => $this->permissionService->allows($user, 'motoristas', 'visualizar', $tenantId),
            'proprietarios' => $this->permissionService->allows($user, 'proprietarios', 'visualizar', $tenantId),
            'alugueres' => $this->permissionService->allows($user, 'alugueres', 'visualizar', $tenantId),
            'contratos' => $this->permissionService->allows($user, 'contratos', 'visualizar', $tenantId),
            'checklist' => $this->permissionService->allows($user, 'checklist', 'visualizar', $tenantId),
            'empresas' => $this->permissionService->allows($user, 'empresas', 'visualizar', $tenantId),
        ];

        $metrics = [
            'veiculos_ativos' => $permissions['veiculos']
                ? Veiculo::query()->where('tenant_id', $tenantId)->where('ativo', true)->count()
                : null,
            'motoristas_ativos' => $permissions['motoristas']
                ? Motorista::query()->where('tenant_id', $tenantId)->where('ativo', true)->count()
                : null,
            'proprietarios' => $permissions['proprietarios']
                ? Proprietario::query()->where('tenant_id', $tenantId)->count()
                : null,
            'alugueres_ativos' => $permissions['alugueres']
                ? Aluguer::query()->where('tenant_id', $tenantId)->where('status', 'ativo')->count()
                : null,
            'contratos_pendentes' => $permissions['contratos']
                ? Contrato::query()->where('tenant_id', $tenantId)->whereIn('status', ['rascunho', 'enviado'])->count()
                : null,
            'checklists_pendentes' => $permissions['checklist']
                ? ChecklistRecord::query()->where('tenant_id', $tenantId)->where('estado', 'rascunho')->count()
                : null,
        ];

        $recentContracts = $permissions['contratos']
            ? Contrato::query()
                ->where('tenant_id', $tenantId)
                ->with([
                    'template:id,nome',
                    'motorista:id,nome_completo',
                    'veiculo:id,matricula,marca,modelo',
                ])
                ->latest('updated_at')
                ->limit(5)
                ->get([
                    'id',
                    'template_id',
                    'motorista_id',
                    'veiculo_id',
                    'tipo',
                    'status',
                    'data_inicio',
                    'data_fim',
                    'valor_semanal',
                    'updated_at',
                ])
            : collect();

        $recentRentals = $permissions['alugueres']
            ? Aluguer::query()
                ->where('tenant_id', $tenantId)
                ->with([
                    'motorista:id,nome_completo',
                    'veiculo:id,matricula,marca,modelo',
                ])
                ->latest('updated_at')
                ->limit(5)
                ->get([
                    'id',
                    'motorista_id',
                    'veiculo_id',
                    'status',
                    'data_inicio',
                    'data_fim',
                    'rascunho_passo',
                    'updated_at',
                ])
            : collect();

        $setup = $this->setup(
            $user,
            $tenantId
        );

        return response()->json([
            'data' => [
                'metrics' => $metrics,
                'recent_contracts' => $recentContracts,
                'recent_rentals' => $recentRentals,
                'permissions' => $permissions,
                'setup' => $setup,
            ],
        ]);
    }

    private function setup(
        User $user,
        string $tenantId
    ): ?array {
        if (
            ! $user->hasRole(
                'admin_empresa',
                $tenantId
            )
        ) {
            return null;
        }

        $steps = [
            [
                'key' => 'empresa',
                'label' => 'Empresa configurada',
                'description' => 'Dados principais da empresa concluídos.',
                'href' => '/empresas',
                'completed' => Empresa::query()
                    ->where('tenant_id', $tenantId)
                    ->where('status_cadastro', 'ativo')
                    ->exists(),
            ],
            [
                'key' => 'proprietario',
                'label' => 'Adicionar proprietário',
                'description' => 'Registe o proprietário de pelo menos um veículo.',
                'href' => '/proprietarios',
                'completed' => Proprietario::query()
                    ->where('tenant_id', $tenantId)
                    ->exists(),
            ],
            [
                'key' => 'veiculo',
                'label' => 'Adicionar veículo',
                'description' => 'Cadastre o primeiro veículo da frota.',
                'href' => '/veiculos',
                'completed' => Veiculo::query()
                    ->where('tenant_id', $tenantId)
                    ->exists(),
            ],
            [
                'key' => 'motorista',
                'label' => 'Adicionar motorista',
                'description' => 'Cadastre o primeiro motorista da operação.',
                'href' => '/motoristas',
                'completed' => Motorista::query()
                    ->where('tenant_id', $tenantId)
                    ->exists(),
            ],
            [
                'key' => 'template',
                'label' => 'Preparar template',
                'description' => 'Configure o primeiro modelo de contrato.',
                'href' => '/templates',
                'completed' => TemplateContrato::query()
                    ->where('tenant_id', $tenantId)
                    ->exists(),
            ],
            [
                'key' => 'contrato',
                'label' => 'Criar contrato',
                'description' => 'Formalize o primeiro contrato da operação.',
                'href' => '/contratos',
                'completed' => Contrato::query()
                    ->where('tenant_id', $tenantId)
                    ->exists(),
            ],
            [
                'key' => 'aluguer',
                'label' => 'Iniciar operação',
                'description' => 'Crie o primeiro aluguer da frota.',
                'href' => '/alugueres',
                'completed' => Aluguer::query()
                    ->where('tenant_id', $tenantId)
                    ->exists(),
            ],
        ];

        $completed = collect($steps)
            ->where(
                'completed',
                true
            )
            ->count();

        $total = count($steps);

        return [
            'completed' => $completed,
            'total' => $total,
            'percentage' => (int) round(
                ($completed / $total) * 100
            ),
            'complete' => $completed === $total,
            'next_step' => collect($steps)
                ->firstWhere(
                    'completed',
                    false
                ),
            'steps' => $steps,
        ];
    }

    private function alerts(string $tenantId, array $permissions): array
    {
        $alerts = collect();
        $today = Carbon::today();
        $from = $today->copy()->subDays(30);
        $to = $today->copy()->addDays(30);

        if ($permissions['motoristas']) {
            $rows = Motorista::query()
                ->where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->get([
                    'id',
                    'nome_completo',
                    'documento_valid_until',
                    'carta_valid_until',
                    'registo_criminal_valid_until',
                    'certificado_tvde_valid_until',
                ]);

            $this->appendAlerts($alerts, $rows, 'motorista', '/motoristas', fn ($row) => $row->nome_completo, [
                'documento_valid_until' => 'Documento de identificação',
                'carta_valid_until' => 'Carta de condução',
                'registo_criminal_valid_until' => 'Registo criminal',
                'certificado_tvde_valid_until' => 'Certificado TVDE',
            ], $today, $from, $to);
        }

        if ($permissions['veiculos']) {
            $rows = Veiculo::query()
                ->where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->get([
                    'id',
                    'matricula',
                    'marca',
                    'modelo',
                    'carta_verde_valid_until',
                    'inspecao_tvde_valid_until',
                    'uber_valid_until',
                    'bolt_valid_until',
                    'extintor_valid_until',
                ]);

            $this->appendAlerts($alerts, $rows, 'veiculo', '/veiculos', fn ($row) => trim("{$row->matricula} · {$row->marca} {$row->modelo}"), [
                'carta_verde_valid_until' => 'Carta verde / seguro',
                'inspecao_tvde_valid_until' => 'Inspeção TVDE',
                'uber_valid_until' => 'Uber',
                'bolt_valid_until' => 'Bolt',
                'extintor_valid_until' => 'Extintor',
            ], $today, $from, $to);
        }

        if ($permissions['proprietarios']) {
            $rows = Proprietario::query()
                ->where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->get([
                    'id',
                    'tipo',
                    'nome_completo',
                    'nome_empresa',
                    'documento_valid_until',
                    'certidao_valid_until',
                    'certificado_tvde_valid_until',
                ]);

            $this->appendAlerts($alerts, $rows, 'proprietario', '/proprietarios', fn ($row) => $row->nome_empresa ?: $row->nome_completo ?: 'Proprietário', [
                'documento_valid_until' => 'Documento de identificação',
                'certidao_valid_until' => 'Certidão permanente',
                'certificado_tvde_valid_until' => 'Certificado TVDE',
            ], $today, $from, $to);
        }

        if ($permissions['empresas']) {
            $rows = Empresa::query()
                ->where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->get(['id', 'nome_empresa', 'certificado_tvde_valid_until']);

            $this->appendAlerts($alerts, $rows, 'empresa', '/empresas', fn ($row) => $row->nome_empresa, [
                'certificado_tvde_valid_until' => 'Certificado TVDE',
            ], $today, $from, $to);
        }

        return $alerts
            ->sortBy(fn (array $alert) => abs($alert['days']))
            ->take(12)
            ->values()
            ->all();
    }

    private function appendAlerts(
        Collection $alerts,
        iterable $rows,
        string $entityType,
        string $href,
        callable $name,
        array $fields,
        Carbon $today,
        Carbon $from,
        Carbon $to
    ): void {
        foreach ($rows as $row) {
            foreach ($fields as $field => $label) {
                $value = $row->getAttribute($field);
                if (! $value) {
                    continue;
                }

                $date = Carbon::parse($value)->startOfDay();
                if ($date->lt($from) || $date->gt($to)) {
                    continue;
                }

                $days = (int) $today->diffInDays($date, false);

                $alerts->push([
                    'id' => "{$entityType}:{$row->id}:{$field}",
                    'entity_type' => $entityType,
                    'entity_id' => $row->id,
                    'entity_name' => $name($row),
                    'document' => $label,
                    'expires_at' => $date->toDateString(),
                    'days' => $days,
                    'status' => $days < 0 ? 'expired' : ($days === 0 ? 'today' : 'upcoming'),
                    'href' => $href,
                ]);
            }
        }
    }

    private function tenantId(): string
    {
        if (! $this->tenantContext->hasTenant()) {
            abort(403, 'Selecione uma organização para aceder a este recurso.');
        }

        return $this->tenantContext->requireId();
    }
}
