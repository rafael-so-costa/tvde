<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Veiculo;
use App\Models\Aluguer;
use App\Models\Contrato;
use App\Models\Sinistro;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use App\Models\ManutencaoAprovacao;
use App\Models\ManutencaoPlanoVeiculo;
use App\Models\VeiculoDiagnostico;
use App\Models\Compra;
use App\Models\ManutencaoGarantia;
use App\Models\Peca;

class AlertEvaluationService
{
    public function __construct(
        private AlertService $alertService,
        private AlertRuleCatalog $catalog,
        private AlertRecipientResolver $recipients
    ) {}

    public function evaluateTenant(
        string $tenantId
    ): array {
        $rules = $this->catalog
            ->ensureTenant(
                $tenantId
            );

        $management =
            $this->recipients
            ->managementUserIds(
                $tenantId
            );

        $activeFingerprints = [];

        $this->evaluateMotoristas(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateProprietarios(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateEmpresas(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateVeiculos(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateContratos(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateAlugueres(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateSinistros(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateMaintenancePlans(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateDiagnostics(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateApprovals(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateWarranties(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluateInventory(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $this->evaluatePurchases(
            $tenantId,
            $rules,
            $management,
            $activeFingerprints
        );

        $resolved = $this->resolveStale(
            $tenantId,
            $activeFingerprints
        );

        return [
            'rules' => $rules->count(),
            'active_conditions' =>
            count($activeFingerprints),
            'resolved' => $resolved,
        ];
    }

    private function evaluateMotoristas(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Motorista::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where('ativo', true)
            ->get([
                'id',
                'user_id',
                'nome_completo',
                'documento_valid_until',
                'carta_valid_until',
                'registo_criminal_valid_until',
                'certificado_tvde_valid_until',
            ]);

        foreach ($rows as $row) {
            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row->user_id,
                    ]
                );

            $fields = [
                [
                    'rule' =>
                    'document.motorista.identificacao',
                    'field' =>
                    'documento_valid_until',
                    'label' =>
                    'Documento de identificação',
                ],
                [
                    'rule' =>
                    'document.motorista.carta',
                    'field' =>
                    'carta_valid_until',
                    'label' =>
                    'Carta de condução',
                ],
                [
                    'rule' =>
                    'document.motorista.registo_criminal',
                    'field' =>
                    'registo_criminal_valid_until',
                    'label' =>
                    'Registo criminal',
                ],
                [
                    'rule' =>
                    'document.motorista.certificado_tvde',
                    'field' =>
                    'certificado_tvde_valid_until',
                    'label' =>
                    'Certificado TVDE',
                ],
            ];

            foreach ($fields as $field) {
                $fingerprint =
                    $this->evaluateDate(
                        $rules[$field['rule']],
                        'motorista',
                        $row->id,
                        $field['field'],
                        $field['label'],
                        $row->nome_completo,
                        $row->getAttribute(
                            $field['field']
                        ),
                        '/motoristas',
                        $recipients
                    );

                if ($fingerprint) {
                    $active[] = $fingerprint;
                }
            }
        }
    }

    private function evaluateProprietarios(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Proprietario::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where('ativo', true)
            ->get([
                'id',
                'user_id',
                'tipo',
                'nome_completo',
                'nome_empresa',
                'documento_valid_until',
                'certidao_valid_until',
                'certificado_tvde_valid_until',
            ]);

        foreach ($rows as $row) {
            $name =
                $row->nome_empresa
                ?: $row->nome_completo
                ?: 'Proprietário';

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row->user_id,
                    ]
                );

            $fields = [
                [
                    'rule' =>
                    'document.proprietario.identificacao',
                    'field' =>
                    'documento_valid_until',
                    'label' =>
                    'Documento de identificação',
                ],
                [
                    'rule' =>
                    'document.proprietario.certidao',
                    'field' =>
                    'certidao_valid_until',
                    'label' =>
                    'Certidão permanente',
                ],
                [
                    'rule' =>
                    'document.proprietario.certificado_tvde',
                    'field' =>
                    'certificado_tvde_valid_until',
                    'label' =>
                    'Certificado TVDE',
                ],
            ];

            foreach ($fields as $field) {
                $fingerprint =
                    $this->evaluateDate(
                        $rules[$field['rule']],
                        'proprietario',
                        $row->id,
                        $field['field'],
                        $field['label'],
                        $name,
                        $row->getAttribute(
                            $field['field']
                        ),
                        '/proprietarios',
                        $recipients
                    );

                if ($fingerprint) {
                    $active[] = $fingerprint;
                }
            }
        }
    }

    private function evaluateEmpresas(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Empresa::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where('ativo', true)
            ->get([
                'id',
                'nome_empresa',
                'certificado_tvde_valid_until',
            ]);

        foreach ($rows as $row) {
            $fingerprint =
                $this->evaluateDate(
                    $rules['document.empresa.certificado_tvde'],
                    'empresa',
                    $row->id,
                    'certificado_tvde_valid_until',
                    'Certificado TVDE',
                    $row->nome_empresa,
                    $row->certificado_tvde_valid_until,
                    '/empresas',
                    $management
                );

            if ($fingerprint) {
                $active[] = $fingerprint;
            }
        }
    }

    private function evaluateVeiculos(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Veiculo::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where('ativo', true)
            ->with(
                'proprietario:id,user_id'
            )
            ->get([
                'id',
                'proprietario_id',
                'matricula',
                'marca',
                'modelo',
                'carta_verde_valid_until',
                'inspecao_tvde_valid_until',
                'uber_valid_until',
                'bolt_valid_until',
                'extintor_valid_until',
            ]);

        foreach ($rows as $row) {
            $name = trim(
                "{$row->matricula} " .
                    "{$row->marca} " .
                    "{$row->modelo}"
            );

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row
                            ->proprietario
                            ?->user_id,
                    ]
                );

            $fields = [
                [
                    'rule' =>
                    'document.veiculo.seguro',
                    'field' =>
                    'carta_verde_valid_until',
                    'label' =>
                    'Carta verde / seguro',
                ],
                [
                    'rule' =>
                    'document.veiculo.inspecao_tvde',
                    'field' =>
                    'inspecao_tvde_valid_until',
                    'label' =>
                    'Inspeção TVDE',
                ],
                [
                    'rule' =>
                    'document.veiculo.uber',
                    'field' =>
                    'uber_valid_until',
                    'label' =>
                    'Registo Uber',
                ],
                [
                    'rule' =>
                    'document.veiculo.bolt',
                    'field' =>
                    'bolt_valid_until',
                    'label' =>
                    'Registo Bolt',
                ],
                [
                    'rule' =>
                    'document.veiculo.extintor',
                    'field' =>
                    'extintor_valid_until',
                    'label' =>
                    'Extintor',
                ],
            ];

            foreach ($fields as $field) {
                $fingerprint =
                    $this->evaluateDate(
                        $rules[$field['rule']],
                        'veiculo',
                        $row->id,
                        $field['field'],
                        $field['label'],
                        $name,
                        $row->getAttribute(
                            $field['field']
                        ),
                        '/veiculos',
                        $recipients
                    );

                if ($fingerprint) {
                    $active[] = $fingerprint;
                }
            }
        }
    }

    private function evaluateContratos(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Contrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereIn(
                'status',
                [
                    'assinado',
                    'enviado',
                ]
            )
            ->whereNotNull(
                'data_fim'
            )
            ->with([
                'motorista:id,user_id,nome_completo',
                'proprietario:id,user_id,nome_completo,nome_empresa',
                'veiculo:id,matricula,marca,modelo',
            ])
            ->get([
                'id',
                'tipo',
                'motorista_id',
                'proprietario_id',
                'veiculo_id',
                'status',
                'data_fim',
            ]);

        foreach ($rows as $row) {
            $motorista =
                $row->motorista
                ?->nome_completo;

            $matricula =
                $row->veiculo
                ?->matricula;

            $name = collect([
                $this->contractTypeLabel(
                    $row->tipo
                ),
                $motorista,
                $matricula,
            ])
                ->filter()
                ->implode(' · ');

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row
                            ->motorista
                            ?->user_id,

                        $row
                            ->proprietario
                            ?->user_id,
                    ]
                );

            $fingerprint =
                $this->evaluateDeadline(
                    $rules['contract.end_date'],
                    'contrato',
                    $row->id,
                    'data_fim',
                    'Fim do contrato',
                    $name ?: 'Contrato',
                    $row->data_fim,
                    'contract',
                    '/contratos',
                    $recipients
                );

            if ($fingerprint) {
                $active[] = $fingerprint;
            }
        }
    }

    private function evaluateAlugueres(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Aluguer::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'ativo'
            )
            ->whereNotNull(
                'data_fim'
            )
            ->with([
                'motorista:id,user_id,nome_completo',
                'proprietario:id,user_id,nome_completo,nome_empresa',
                'veiculo:id,matricula,marca,modelo',
            ])
            ->get([
                'id',
                'motorista_id',
                'proprietario_id',
                'veiculo_id',
                'status',
                'data_inicio',
                'data_fim',
            ]);

        foreach ($rows as $row) {
            $motorista =
                $row->motorista
                ?->nome_completo;

            $matricula =
                $row->veiculo
                ?->matricula;

            $name = collect([
                $matricula,
                $motorista,
            ])
                ->filter()
                ->implode(' · ');

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row
                            ->motorista
                            ?->user_id,

                        $row
                            ->proprietario
                            ?->user_id,
                    ]
                );

            $fingerprint =
                $this->evaluateDeadline(
                    $rules['rental.end_date'],
                    'aluguer',
                    $row->id,
                    'data_fim',
                    'Fim do aluguer',
                    $name ?: 'Aluguer',
                    $row->data_fim,
                    'rental',
                    '/alugueres',
                    $recipients
                );

            if ($fingerprint) {
                $active[] = $fingerprint;
            }
        }
    }

    private function evaluateSinistros(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Sinistro::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereIn(
                'status',
                [
                    'aberto',
                    'em_andamento',
                ]
            )
            ->with([
                'motorista:id,user_id,nome_completo',
                'veiculo:id,proprietario_id,matricula,marca,modelo',
                'veiculo.proprietario:id,user_id,nome_completo,nome_empresa',
            ])
            ->get([
                'id',
                'veiculo_id',
                'motorista_id',
                'data_sinistro',
                'status',
                'data_peritagem',
                'peritagem_realizada',
                'numero_processo',
            ]);

        foreach ($rows as $row) {
            $matricula =
                $row->veiculo
                ?->matricula
                ?: 'Veículo';

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row
                            ->motorista
                            ?->user_id,

                        $row
                            ->veiculo
                            ?->proprietario
                            ?->user_id,
                    ]
                );

            /*
         * A peritagem ainda não aconteceu.
         */
            if (!$row->peritagem_realizada) {
                /*
             * Sinistro sem sequer ter peritagem
             * marcada é uma pendência operacional
             * relevante.
             */
                if (!$row->data_peritagem) {
                    $rule =
                        $rules['claim.peritagem.missing_date'];

                    $alert =
                        $this
                        ->alertService
                        ->raise(
                            $rule,
                            [
                                'source_type' =>
                                'sinistro',

                                'source_id' =>
                                $row->id,

                                'dedup_key' =>
                                'peritagem_sem_data',

                                'category' =>
                                'claim',

                                'severity' =>
                                'high',

                                'title' =>
                                "Peritagem sem data — {$matricula}",

                                'message' =>
                                'O sinistro está aberto e ainda não possui data de peritagem.',

                                'action_url' =>
                                '/alertas',

                                'metadata' => [
                                    'matricula' =>
                                    $matricula,

                                    'numero_processo' =>
                                    $row
                                        ->numero_processo,

                                    'data_sinistro' =>
                                    $row
                                        ->data_sinistro
                                        ?->toDateString(),

                                    'management_url' =>
                                    '/sinistros',
                                ],
                            ],
                            $recipients
                        );

                    if ($alert) {
                        $active[] =
                            $alert->fingerprint;
                    }

                    continue;
                }

                /*
             * Existe data de peritagem:
             * trata-a como deadline.
             */
                $fingerprint =
                    $this->evaluateDeadline(
                        $rules['claim.peritagem.due'],
                        'sinistro',
                        $row->id,
                        'data_peritagem',
                        'Peritagem',
                        $matricula,
                        $row->data_peritagem,
                        'claim',
                        '/sinistros',
                        $recipients,
                        [
                            'numero_processo' =>
                            $row
                                ->numero_processo,

                            'data_sinistro' =>
                            $row
                                ->data_sinistro
                                ?->toDateString(),
                        ]
                    );

                if ($fingerprint) {
                    $active[] = $fingerprint;
                }

                continue;
            }

            /*
         * A peritagem já ocorreu, mas o sinistro
         * continua aberto/em andamento.
         */
            $rule =
                $rules['claim.open_after_peritagem'];

            $alert =
                $this
                ->alertService
                ->raise(
                    $rule,
                    [
                        'source_type' =>
                        'sinistro',

                        'source_id' =>
                        $row->id,

                        'dedup_key' =>
                        'aberto_apos_peritagem',

                        'category' =>
                        'claim',

                        'severity' => 'low',

                        'title' =>
                        "Sinistro em aberto — {$matricula}",

                        'message' =>
                        'A peritagem já foi realizada, mas o processo do sinistro continua aberto.',

                        'action_url' =>
                        '/alertas',

                        'metadata' => [
                            'matricula' =>
                            $matricula,

                            'numero_processo' =>
                            $row
                                ->numero_processo,

                            'management_url' =>
                            '/sinistros',
                        ],
                    ],
                    $recipients
                );

            if ($alert) {
                $active[] =
                    $alert->fingerprint;
            }
        }
    }

    private function evaluateMaintenancePlans(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = ManutencaoPlanoVeiculo::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where('ativo', true)
            ->whereHas(
                'plano',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->with([
                'plano:id,nome,tipo_servico,alerta_antecedencia_km,alerta_antecedencia_dias,ativo',
                'veiculo:id,proprietario_id,matricula,marca,modelo,km_atual',
                'veiculo.proprietario:id,user_id',
            ])
            ->get();

        foreach ($rows as $row) {
            if (
                !$row->plano ||
                !$row->veiculo
            ) {
                continue;
            }

            $vehicleName = trim(
                "{$row->veiculo->matricula} " .
                    "{$row->veiculo->marca} " .
                    "{$row->veiculo->modelo}"
            );

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row
                            ->veiculo
                            ->proprietario
                            ?->user_id,
                    ]
                );

            /*
         * REGRA POR DATA
         */
            if ($row->proxima_data) {
                $today = CarbonImmutable::today(
                    config(
                        'app.timezone',
                        'Europe/Lisbon'
                    )
                );

                $due = CarbonImmutable::parse(
                    $row->proxima_data
                )->startOfDay();

                $days = (int)
                $today->diffInDays(
                    $due,
                    false
                );

                $antecedencia = max(
                    0,
                    (int)$row
                        ->plano
                        ->alerta_antecedencia_dias
                );

                if ($days <= $antecedencia) {
                    $rule =
                        $rules['maintenance.plan.date_due'];

                    $severity =
                        $this->severityForDays(
                            $days
                        );

                    $message = match (true) {
                        $days < 0 =>
                        'Manutenção preventiva vencida há ' .
                            abs($days) .
                            ' dias.',

                        $days === 0 =>
                        'Manutenção preventiva vence hoje.',

                        $days === 1 =>
                        'Manutenção preventiva vence amanhã.',

                        default =>
                        "Manutenção preventiva vence em {$days} dias.",
                    };

                    $alert =
                        $this
                        ->alertService
                        ->raise(
                            $rule,
                            [
                                'source_type' =>
                                'manutencao_plano_veiculo',

                                'source_id' =>
                                $row->id,

                                'dedup_key' =>
                                'proxima_data',

                                'category' =>
                                'maintenance',

                                'severity' =>
                                $severity,

                                'title' =>
                                "{$row->plano->nome} — {$vehicleName}",

                                'message' =>
                                $message,

                                'due_at' =>
                                $due->toISOString(),

                                'action_url' =>
                                '/alertas',

                                'metadata' => [
                                    'plano_id' =>
                                    $row->plano_id,

                                    'veiculo_id' =>
                                    $row->veiculo_id,

                                    'matricula' =>
                                    $row
                                        ->veiculo
                                        ->matricula,

                                    'tipo_servico' =>
                                    $row
                                        ->plano
                                        ->tipo_servico,

                                    'proxima_data' =>
                                    $due
                                        ->toDateString(),

                                    'days_remaining' =>
                                    $days,

                                    'management_url' =>
                                    '/manutencao',
                                ],
                            ],
                            $recipients
                        );

                    if ($alert) {
                        $active[] =
                            $alert->fingerprint;
                    }
                }
            }

            /*
         * REGRA POR QUILOMETRAGEM
         */
            if (
                $row->proximo_km !== null &&
                $row->veiculo->km_atual !== null
            ) {
                $remaining =
                    (int)$row->proximo_km -
                    (int)$row->veiculo->km_atual;

                $antecedencia = max(
                    0,
                    (int)$row
                        ->plano
                        ->alerta_antecedencia_km
                );

                if ($remaining <= $antecedencia) {
                    $rule =
                        $rules['maintenance.plan.km_due'];

                    $severity = match (true) {
                        $remaining <= 0 =>
                        'critical',

                        $antecedencia > 0 &&
                            $remaining <=
                            max(
                                500,
                                (int)floor(
                                    $antecedencia * 0.25
                                )
                            ) =>
                        'high',

                        $antecedencia > 0 &&
                            $remaining <=
                            max(
                                1000,
                                (int)floor(
                                    $antecedencia * 0.5
                                )
                            ) =>
                        'medium',

                        default => 'low',
                    };

                    $message = $remaining <= 0
                        ? 'Manutenção preventiva vencida por ' .
                        abs($remaining) .
                        ' km.'
                        : 'Faltam ' .
                        $remaining .
                        ' km para a manutenção preventiva.';

                    $alert =
                        $this
                        ->alertService
                        ->raise(
                            $rule,
                            [
                                'source_type' =>
                                'manutencao_plano_veiculo',

                                'source_id' =>
                                $row->id,

                                'dedup_key' =>
                                'proximo_km',

                                'category' =>
                                'maintenance',

                                'severity' =>
                                $severity,

                                'title' =>
                                "{$row->plano->nome} — {$vehicleName}",

                                'message' =>
                                $message,

                                'action_url' =>
                                '/alertas',

                                'metadata' => [
                                    'plano_id' =>
                                    $row->plano_id,

                                    'veiculo_id' =>
                                    $row->veiculo_id,

                                    'matricula' =>
                                    $row
                                        ->veiculo
                                        ->matricula,

                                    'tipo_servico' =>
                                    $row
                                        ->plano
                                        ->tipo_servico,

                                    'km_atual' =>
                                    (int)$row
                                        ->veiculo
                                        ->km_atual,

                                    'proximo_km' =>
                                    (int)$row
                                        ->proximo_km,

                                    'km_remaining' =>
                                    $remaining,

                                    'management_url' =>
                                    '/manutencao',
                                ],
                            ],
                            $recipients
                        );

                    if ($alert) {
                        $active[] =
                            $alert->fingerprint;
                    }
                }
            }
        }
    }



    private function evaluateDiagnostics(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = VeiculoDiagnostico::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'aberto'
            )
            ->whereIn(
                'severidade',
                [
                    'media',
                    'alta',
                    'critica',
                ]
            )
            ->with([
                'veiculo:id,proprietario_id,matricula,marca,modelo',
                'veiculo.proprietario:id,user_id',
            ])
            ->get();

        foreach ($rows as $row) {
            if (!$row->veiculo) {
                continue;
            }

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $row
                            ->veiculo
                            ->proprietario
                            ?->user_id,
                    ]
                );

            $severity = match ($row->severidade) {
                'critica' => 'critical',
                'alta' => 'high',
                'media' => 'medium',
                default => 'low',
            };

            $code =
                $row->codigo_dtc
                ? " {$row->codigo_dtc}"
                : '';

            $alert =
                $this
                ->alertService
                ->raise(
                    $rules['maintenance.diagnostic.open'],
                    [
                        'source_type' =>
                        'veiculo_diagnostico',

                        'source_id' =>
                        $row->id,

                        'dedup_key' =>
                        'diagnostico_aberto',

                        'category' =>
                        'diagnostic',

                        'severity' =>
                        $severity,

                        'title' =>
                        "Diagnóstico{$code} — {$row->veiculo->matricula}",

                        'message' =>
                        $row->titulo,

                        'action_url' =>
                        '/alertas',

                        'metadata' => [
                            'veiculo_id' =>
                            $row->veiculo_id,

                            'matricula' =>
                            $row
                                ->veiculo
                                ->matricula,

                            'codigo_dtc' =>
                            $row->codigo_dtc,

                            'diagnostic_severity' =>
                            $row->severidade,

                            'fonte' =>
                            $row->fonte,

                            'detectado_em' =>
                            $row
                                ->detectado_em
                                ?->toISOString(),

                            'manutencao_id' =>
                            $row->manutencao_id,

                            'management_url' =>
                            '/manutencao',
                        ],
                    ],
                    $recipients
                );

            if ($alert) {
                $active[] =
                    $alert->fingerprint;
            }
        }
    }

    private function evaluateApprovals(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = ManutencaoAprovacao::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'pendente'
            )
            ->with([
                'manutencao:id,numero_ordem,veiculo_id,tipo_servico,status',
                'manutencao.veiculo:id,matricula,marca,modelo',
            ])
            ->get();

        foreach ($rows as $row) {
            if (!$row->manutencao) {
                continue;
            }

            /*
         * A aprovação só é operacionalmente
         * relevante enquanto a manutenção ainda
         * aguarda uma decisão.
         */
            if (
                $row->manutencao->status !==
                'aguardando_aprovacao'
            ) {
                continue;
            }

            $rule =
                $rules['maintenance.approval.pending'];

            $severity = 'medium';
            $message =
                'A ordem de manutenção aguarda aprovação.';

            $dueAt = null;

            if ($row->expires_at) {
                $due = CarbonImmutable::parse(
                    $row->expires_at
                );

                $seconds =
                    now()->diffInSeconds(
                        $due,
                        false
                    );

                $days = (int)floor(
                    $seconds / 86400
                );

                $severity = match (true) {
                    $seconds <= 0 => 'critical',
                    $seconds <= 86400 => 'high',
                    $days <= 3 => 'medium',
                    default => 'low',
                };

                $message = match (true) {
                    $seconds <= 0 =>
                    'A solicitação de aprovação expirou.',

                    $seconds <= 86400 =>
                    'A solicitação de aprovação expira em menos de 24 horas.',

                    default =>
                    "A solicitação de aprovação expira em aproximadamente {$days} dias.",
                };

                $dueAt =
                    $due->toISOString();
            }

            $matricula =
                $row
                ->manutencao
                ->veiculo
                ?->matricula;

            $title =
                'Aprovação pendente — ' .
                (
                    $row
                    ->manutencao
                    ->numero_ordem
                    ?: 'Manutenção'
                );

            if ($matricula) {
                $title .=
                    " · {$matricula}";
            }

            $alert =
                $this
                ->alertService
                ->raise(
                    $rule,
                    [
                        'source_type' =>
                        'manutencao_aprovacao',

                        'source_id' =>
                        $row->id,

                        'dedup_key' =>
                        'aprovacao_pendente',

                        'category' =>
                        'maintenance',

                        'severity' =>
                        $severity,

                        'title' => $title,

                        'message' =>
                        $message,

                        'due_at' =>
                        $dueAt,

                        'action_url' =>
                        '/alertas',

                        'metadata' => [
                            'manutencao_id' =>
                            $row
                                ->manutencao_id,

                            'numero_ordem' =>
                            $row
                                ->manutencao
                                ->numero_ordem,

                            'tipo_servico' =>
                            $row
                                ->manutencao
                                ->tipo_servico,

                            'valor_orcamento' =>
                            $row
                                ->valor_orcamento,

                            'aprovador_nome' =>
                            $row
                                ->aprovador_nome,

                            'aprovador_email' =>
                            $row
                                ->aprovador_email,

                            'management_url' =>
                            '/manutencao',
                        ],
                    ],
                    $management
                );

            if ($alert) {
                $active[] =
                    $alert->fingerprint;
            }
        }
    }

    private function evaluateDate(
        AlertRule $rule,
        string $sourceType,
        string $sourceId,
        string $field,
        string $label,
        string $entityName,
        mixed $value,
        string $managementUrl,
        Collection $recipientIds
    ): ?string {
        if (!$value) {
            return null;
        }

        $today = CarbonImmutable::today(
            config(
                'app.timezone',
                'Europe/Lisbon'
            )
        );

        $due = CarbonImmutable::parse(
            $value
        )->startOfDay();

        $days = (int)
        $today->diffInDays(
            $due,
            false
        );

        $daysBefore = (int)(
            $rule
                ->trigger_config['days_before']
            ?? 30
        );

        if ($days > $daysBefore) {
            return null;
        }

        $severity =
            $this->severityForDays(
                $days
            );

        $message = match (true) {
            $days < 0 =>
            'Expirou há ' .
                abs($days) .
                ' dias.',

            $days === 0 =>
            'Expira hoje.',

            $days === 1 =>
            'Expira amanhã.',

            default =>
            "Expira em {$days} dias.",
        };

        $alert =
            $this->alertService->raise(
                $rule,
                [
                    'source_type' =>
                    $sourceType,

                    'source_id' =>
                    $sourceId,

                    /*
                     * Chave estável.
                     *
                     * A alteração da data atualiza
                     * a mesma ocorrência enquanto
                     * a condição continuar ativa.
                     */
                    'dedup_key' => $field,

                    'category' =>
                    'document',

                    'severity' => $severity,

                    'title' =>
                    "{$label} — {$entityName}",

                    'message' => $message,

                    'due_at' =>
                    $due->toISOString(),

                    /*
                     * /alertas funciona para todos
                     * os perfis. O frontend poderá
                     * usar management_url quando o
                     * utilizador tiver acesso.
                     */
                    'action_url' =>
                    '/alertas',

                    'metadata' => [
                        'field' => $field,
                        'label' => $label,
                        'entity_name' =>
                        $entityName,
                        'days_remaining' =>
                        $days,
                        'management_url' =>
                        $managementUrl,
                    ],
                ],
                $recipientIds
            );

        return $alert?->fingerprint;
    }

    private function severityForDays(
        int $days
    ): string {
        return match (true) {
            $days <= 0 => 'critical',
            $days <= 7 => 'high',
            $days <= 15 => 'medium',
            default => 'low',
        };
    }

    private function resolveStale(
        string $tenantId,
        array $activeFingerprints
    ): int {
        $activeFingerprints =
            array_values(
                array_unique(
                    $activeFingerprints
                )
            );

        $query = Alert::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'open'
            )
            ->whereIn(
                'rule_code',
                $this->catalog->codes()
            );

        if ($activeFingerprints) {
            $query->whereNotIn(
                'fingerprint',
                $activeFingerprints
            );
        }

        $resolved = 0;

        $query->get()->each(
            function (Alert $alert) use (
                &$resolved
            ) {
                $result =
                    $this
                    ->alertService
                    ->resolveCondition(
                        $alert->tenant_id,
                        $alert->rule_code,
                        $alert->source_type,
                        $alert->source_id,
                        $alert->dedup_key,
                        'Condição documental deixou de requerer alerta.'
                    );

                if ($result) {
                    $resolved++;
                }
            }
        );

        return $resolved;
    }

    private function evaluateDeadline(
        AlertRule $rule,
        string $sourceType,
        string $sourceId,
        string $dedupKey,
        string $label,
        string $entityName,
        mixed $value,
        string $category,
        string $managementUrl,
        Collection $recipientIds,
        array $metadata = []
    ): ?string {
        if (!$value) {
            return null;
        }

        $today = CarbonImmutable::today(
            config(
                'app.timezone',
                'Europe/Lisbon'
            )
        );

        $due = CarbonImmutable::parse(
            $value
        )->startOfDay();

        $days = (int)
        $today->diffInDays(
            $due,
            false
        );

        $daysBefore = (int)(
            $rule
                ->trigger_config['days_before']
            ?? 30
        );

        if ($days > $daysBefore) {
            return null;
        }

        $severity =
            $this->severityForDays(
                $days
            );

        $message = match (true) {
            $days < 0 =>
            'Prazo vencido há ' .
                abs($days) .
                ' dias.',

            $days === 0 =>
            'Prazo termina hoje.',

            $days === 1 =>
            'Prazo termina amanhã.',

            default =>
            "Prazo termina em {$days} dias.",
        };

        $alert =
            $this->alertService->raise(
                $rule,
                [
                    'source_type' =>
                    $sourceType,

                    'source_id' =>
                    $sourceId,

                    'dedup_key' =>
                    $dedupKey,

                    'category' =>
                    $category,

                    'severity' =>
                    $severity,

                    'title' =>
                    "{$label} — {$entityName}",

                    'message' =>
                    $message,

                    'due_at' =>
                    $due->toISOString(),

                    'action_url' =>
                    '/alertas',

                    'metadata' => array_merge(
                        [
                            'label' => $label,

                            'entity_name' =>
                            $entityName,

                            'days_remaining' =>
                            $days,

                            'management_url' =>
                            $managementUrl,
                        ],
                        $metadata
                    ),
                ],
                $recipientIds
            );

        return $alert?->fingerprint;
    }

    private function contractTypeLabel(
        string $type
    ): string {
        return match ($type) {
            'aluguer' =>
            'Contrato de aluguer',

            'prestacao_servico' =>
            'Prestação de serviços',

            'checklist_entrega' =>
            'Checklist de entrega',

            'checklist_devolucao' =>
            'Checklist de devolução',

            default => 'Contrato',
        };
    }
    private function evaluateWarranties(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = ManutencaoGarantia::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'status',
                'ativa'
            )
            ->with([
                'manutencao:id,veiculo_id,numero_ordem',
                'manutencao.veiculo:id,proprietario_id,matricula,marca,modelo,km_atual',
                'manutencao.veiculo.proprietario:id,user_id',
                'peca:id,codigo,nome',
                'fornecedor:id,nome',
            ])
            ->get();

        foreach ($rows as $row) {
            $veiculo =
                $row
                ->manutencao
                ?->veiculo;

            $recipients =
                $this->recipients->merge(
                    $management,
                    [
                        $veiculo
                            ?->proprietario
                            ?->user_id,
                    ]
                );

            $entityName =
                $veiculo
                ? trim(
                    "{$veiculo->matricula} " .
                        "{$row->descricao}"
                )
                : $row->descricao;

            /*
         * GARANTIA POR DATA
         */
            if ($row->data_fim) {
                $today = CarbonImmutable::today(
                    config(
                        'app.timezone',
                        'Europe/Lisbon'
                    )
                );

                $due = CarbonImmutable::parse(
                    $row->data_fim
                )->startOfDay();

                $days = (int)
                $today->diffInDays(
                    $due,
                    false
                );

                $daysBefore = (int)(
                    $rules['maintenance.warranty.date_due']
                        ->trigger_config['days_before']
                    ?? 30
                );

                if ($days <= $daysBefore) {
                    $severity =
                        $this->severityForDays(
                            $days
                        );

                    $message = match (true) {
                        $days < 0 =>
                        'A garantia terminou há ' .
                            abs($days) .
                            ' dias.',

                        $days === 0 =>
                        'A garantia termina hoje.',

                        $days === 1 =>
                        'A garantia termina amanhã.',

                        default =>
                        "A garantia termina em {$days} dias.",
                    };

                    $alert =
                        $this
                        ->alertService
                        ->raise(
                            $rules['maintenance.warranty.date_due'],
                            [
                                'source_type' =>
                                'manutencao_garantia',

                                'source_id' =>
                                $row->id,

                                'dedup_key' =>
                                'data_fim',

                                'category' =>
                                'maintenance',

                                'severity' =>
                                $severity,

                                'title' =>
                                "Garantia — {$entityName}",

                                'message' =>
                                $message,

                                'due_at' =>
                                $due->toISOString(),

                                'action_url' =>
                                '/alertas',

                                'metadata' => [
                                    'manutencao_id' =>
                                    $row
                                        ->manutencao_id,

                                    'veiculo_id' =>
                                    $veiculo?->id,

                                    'matricula' =>
                                    $veiculo
                                        ?->matricula,

                                    'peca_id' =>
                                    $row->peca_id,

                                    'peca_nome' =>
                                    $row
                                        ->peca
                                        ?->nome,

                                    'fornecedor_id' =>
                                    $row
                                        ->fornecedor_id,

                                    'fornecedor_nome' =>
                                    $row
                                        ->fornecedor
                                        ?->nome,

                                    'data_fim' =>
                                    $due
                                        ->toDateString(),

                                    'days_remaining' =>
                                    $days,

                                    'management_url' =>
                                    '/manutencao',
                                ],
                            ],
                            $recipients
                        );

                    if ($alert) {
                        $active[] =
                            $alert->fingerprint;
                    }
                }
            }

            /*
         * GARANTIA POR KM
         */
            if (
                $row->km_limite !== null &&
                $veiculo?->km_atual !== null
            ) {
                $remaining =
                    (int)$row->km_limite -
                    (int)$veiculo->km_atual;

                $threshold = (int)(
                    $rules['maintenance.warranty.km_due']
                        ->trigger_config['km_before']
                    ?? 1000
                );

                if ($remaining <= $threshold) {
                    $severity = match (true) {
                        $remaining <= 0 =>
                        'critical',

                        $remaining <= 250 =>
                        'high',

                        $remaining <= 500 =>
                        'medium',

                        default => 'low',
                    };

                    $message =
                        $remaining <= 0
                        ? 'A garantia ultrapassou o limite por ' .
                        abs($remaining) .
                        ' km.'
                        : 'Faltam ' .
                        $remaining .
                        ' km para terminar a garantia.';

                    $alert =
                        $this
                        ->alertService
                        ->raise(
                            $rules['maintenance.warranty.km_due'],
                            [
                                'source_type' =>
                                'manutencao_garantia',

                                'source_id' =>
                                $row->id,

                                'dedup_key' =>
                                'km_limite',

                                'category' =>
                                'maintenance',

                                'severity' =>
                                $severity,

                                'title' =>
                                "Garantia por km — {$entityName}",

                                'message' =>
                                $message,

                                'action_url' =>
                                '/alertas',

                                'metadata' => [
                                    'manutencao_id' =>
                                    $row
                                        ->manutencao_id,

                                    'veiculo_id' =>
                                    $veiculo->id,

                                    'matricula' =>
                                    $veiculo
                                        ->matricula,

                                    'km_atual' =>
                                    (int)$veiculo
                                        ->km_atual,

                                    'km_limite' =>
                                    (int)$row
                                        ->km_limite,

                                    'km_remaining' =>
                                    $remaining,

                                    'peca_id' =>
                                    $row->peca_id,

                                    'management_url' =>
                                    '/manutencao',
                                ],
                            ],
                            $recipients
                        );

                    if ($alert) {
                        $active[] =
                            $alert->fingerprint;
                    }
                }
            }
        }
    }

    private function evaluateInventory(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $rows = Peca::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'ativo',
                true
            )
            ->where(
                'estoque_minimo',
                '>',
                0
            )
            ->whereColumn(
                'estoque_atual',
                '<=',
                'estoque_minimo'
            )
            ->with(
                'fornecedorPreferencial:id,nome'
            )
            ->get();

        foreach ($rows as $row) {
            $current =
                (float)$row->estoque_atual;

            $minimum =
                (float)$row->estoque_minimo;

            $severity = match (true) {
                $current <= 0 =>
                'critical',

                $current <=
                    ($minimum * 0.5) =>
                'high',

                default => 'medium',
            };

            $message = match (true) {
                $current <= 0 =>
                'A peça está sem estoque.',

                default =>
                'Estoque atual: ' .
                    $this->formatQuantity(
                        $current
                    ) .
                    ' ' .
                    $row->unidade .
                    '. Mínimo configurado: ' .
                    $this->formatQuantity(
                        $minimum
                    ) .
                    ' ' .
                    $row->unidade .
                    '.',
            };

            $alert =
                $this
                ->alertService
                ->raise(
                    $rules['inventory.stock.low'],
                    [
                        'source_type' => 'peca',

                        'source_id' => $row->id,

                        'dedup_key' =>
                        'estoque_minimo',

                        'category' =>
                        'inventory',

                        'severity' =>
                        $severity,

                        'title' =>
                        "Estoque baixo — {$row->nome}",

                        'message' => $message,

                        'action_url' =>
                        '/alertas',

                        'metadata' => [
                            'peca_id' =>
                            $row->id,

                            'codigo' =>
                            $row->codigo,

                            'nome' =>
                            $row->nome,

                            'estoque_atual' =>
                            $current,

                            'estoque_minimo' =>
                            $minimum,

                            'unidade' =>
                            $row->unidade,

                            'fornecedor_preferencial_id' =>
                            $row
                                ->fornecedor_preferencial_id,

                            'fornecedor_preferencial_nome' =>
                            $row
                                ->fornecedorPreferencial
                                ?->nome,

                            'management_url' =>
                            '/manutencao',
                        ],
                    ],
                    $management
                );

            if ($alert) {
                $active[] =
                    $alert->fingerprint;
            }
        }
    }

    private function evaluatePurchases(
        string $tenantId,
        Collection $rules,
        Collection $management,
        array &$active
    ): void {
        $today = CarbonImmutable::today(
            config(
                'app.timezone',
                'Europe/Lisbon'
            )
        );

        $rows = Compra::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereIn(
                'status',
                [
                    'encomendada',
                    'parcialmente_recebida',
                ]
            )
            ->whereNotNull(
                'data_prevista'
            )
            ->whereDate(
                'data_prevista',
                '<',
                $today->toDateString()
            )
            ->with([
                'fornecedor:id,nome',
                'itens:id,compra_id,descricao,quantidade,quantidade_recebida',
            ])
            ->get();

        foreach ($rows as $row) {
            $due = CarbonImmutable::parse(
                $row->data_prevista
            )->startOfDay();

            $daysOverdue = abs(
                (int)$today->diffInDays(
                    $due,
                    false
                )
            );

            $severity = match (true) {
                $daysOverdue >= 7 =>
                'critical',

                $daysOverdue >= 3 =>
                'high',

                default => 'medium',
            };

            $pendingItems =
                $row->itens
                ->filter(
                    fn($item) =>
                    (float)
                    $item->quantidade_recebida
                        <
                        (float)
                        $item->quantidade
                )
                ->count();

            $name =
                $row->numero_documento
                ?: (
                    $row
                    ->fornecedor
                    ?->nome
                    ?: 'Compra'
                );

            $alert =
                $this
                ->alertService
                ->raise(
                    $rules['purchase.delivery.overdue'],
                    [
                        'source_type' =>
                        'compra',

                        'source_id' =>
                        $row->id,

                        'dedup_key' =>
                        'data_prevista',

                        'category' =>
                        'purchase',

                        'severity' =>
                        $severity,

                        'title' =>
                        "Compra atrasada — {$name}",

                        'message' =>
                        'Entrega prevista está atrasada há ' .
                            $daysOverdue .
                            (
                                $daysOverdue === 1
                                ? ' dia.'
                                : ' dias.'
                            ),

                        'due_at' =>
                        $due->toISOString(),

                        'action_url' =>
                        '/alertas',

                        'metadata' => [
                            'compra_id' =>
                            $row->id,

                            'numero_documento' =>
                            $row
                                ->numero_documento,

                            'status' =>
                            $row->status,

                            'fornecedor_id' =>
                            $row
                                ->fornecedor_id,

                            'fornecedor_nome' =>
                            $row
                                ->fornecedor
                                ?->nome,

                            'data_prevista' =>
                            $due
                                ->toDateString(),

                            'days_overdue' =>
                            $daysOverdue,

                            'pending_items' =>
                            $pendingItems,

                            'total' =>
                            (float)$row->total,

                            'management_url' =>
                            '/manutencao',
                        ],
                    ],
                    $management
                );

            if ($alert) {
                $active[] =
                    $alert->fingerprint;
            }
        }
    }

    private function formatQuantity(
        float $value
    ): string {
        if (
            abs(
                $value - round($value)
            ) < 0.000001
        ) {
            return (string)(int)round(
                $value
            );
        }

        return rtrim(
            rtrim(
                number_format(
                    $value,
                    3,
                    '.',
                    ''
                ),
                '0'
            ),
            '.'
        );
    }
}
