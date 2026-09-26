<?php

use App\Models\Alert;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Veiculo;
use App\Services\AlertEvaluationService;
use App\Models\Aluguer;
use App\Models\Contrato;
use App\Models\Sinistro;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use App\Models\Manutencao;
use App\Models\ManutencaoAprovacao;
use App\Models\ManutencaoPlano;
use App\Models\ManutencaoPlanoVeiculo;
use App\Models\VeiculoDiagnostico;
use App\Models\Compra;
use App\Models\ManutencaoGarantia;
use App\Models\Peca;

uses(RefreshDatabase::class);

function aevTenant(
    string $nome,
    string $slug
): Tenant {
    return Tenant::create([
        'nome' => $nome,
        'slug' => $slug,
        'ativo' => true,
    ]);
}

function aevUser(
    Tenant $tenant,
    string $email,
    ?string $role = null
): User {
    $user = User::factory()->create([
        'email' => $email,
        'password' => Hash::make(
            'SenhaTeste123!'
        ),
        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    if ($role) {
        $roleModel = Role::firstOrCreate(
            ['codigo' => $role],
            [
                'nome' => $role,
                'sistema' => true,
            ]
        );

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $roleModel->id,
            'tenant_id' => $tenant->id,
        ]);
    }

    return $user;
}

function aevMotorista(
    Tenant $tenant,
    User $user,
    array $overrides = []
): Motorista {
    $motorista = new Motorista(
        array_merge([
            'nome_completo' => 'Motorista Teste',
            'carta_valid_until' =>
            now()
                ->addDays(7)
                ->toDateString(),
        ], $overrides)
    );

    $motorista->tenant_id =
        $tenant->id;

    $motorista->user_id =
        $user->id;

    $motorista->ativo = true;

    $motorista->save();

    return $motorista;
}

test(
    'avaliacao cria alerta documental para motorista e gestor',
    function () {
        $tenant = aevTenant(
            'Tenant Documentos',
            'tenant-documentos-alerta'
        );

        $admin = aevUser(
            $tenant,
            'admin-doc@alert.test',
            'admin_empresa'
        );

        $driver = aevUser(
            $tenant,
            'driver-doc@alert.test'
        );

        $motorista = aevMotorista(
            $tenant,
            $driver
        );

        $result = app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'tenant_id',
                $tenant->id
            )
            ->where(
                'rule_code',
                'document.motorista.carta'
            )
            ->firstOrFail();

        expect($alert->source_id)
            ->toBe($motorista->id);

        expect($alert->severity)
            ->toBe('high');

        expect(
            $alert
                ->recipients()
                ->where('active', true)
                ->count()
        )->toBe(2);

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id,
            $driver->id
        );

        expect(
            $result['active_conditions']
        )->toBe(1);
    }
);

test(
    'documento fora da janela de antecedencia nao gera alerta',
    function () {
        $tenant = aevTenant(
            'Tenant Futuro',
            'tenant-documento-futuro'
        );

        $driver = aevUser(
            $tenant,
            'future@alert.test'
        );

        aevMotorista(
            $tenant,
            $driver,
            [
                'carta_valid_until' =>
                now()
                    ->addDays(31)
                    ->toDateString(),
            ]
        );

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        expect(Alert::count())
            ->toBe(0);
    }
);

test(
    'nova avaliacao nao duplica a mesma condicao documental',
    function () {
        $tenant = aevTenant(
            'Tenant Dedup Documento',
            'tenant-dedup-documento'
        );

        $driver = aevUser(
            $tenant,
            'dedup-doc@alert.test'
        );

        aevMotorista(
            $tenant,
            $driver
        );

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $service->evaluateTenant(
            $tenant->id
        );

        expect(
            Alert::query()
                ->where(
                    'rule_code',
                    'document.motorista.carta'
                )
                ->count()
        )->toBe(1);
    }
);

test(
    'renovacao de documento resolve automaticamente alerta ativo',
    function () {
        $tenant = aevTenant(
            'Tenant Renovação',
            'tenant-renovacao-documento'
        );

        $driver = aevUser(
            $tenant,
            'renew@alert.test'
        );

        $motorista = aevMotorista(
            $tenant,
            $driver
        );

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'document.motorista.carta'
            )
            ->firstOrFail();

        $motorista->carta_valid_until =
            now()
            ->addYear()
            ->toDateString();

        $motorista->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');

        expect(
            $alert->resolution_type
        )->toBe('automatic');

        expect($alert->active_key)
            ->toBeNull();
    }
);

test(
    'alerta de documento do veiculo chega ao proprietario e gestor',
    function () {
        $tenant = aevTenant(
            'Tenant Veículo',
            'tenant-alert-veiculo'
        );

        $admin = aevUser(
            $tenant,
            'admin-car@alert.test',
            'admin_empresa'
        );

        $ownerUser = aevUser(
            $tenant,
            'owner-car@alert.test'
        );

        $owner = new Proprietario([
            'tipo' => 'pessoa_fisica',
            'nome_completo' => 'Proprietário Teste',
        ]);

        $owner->tenant_id =
            $tenant->id;

        $owner->user_id =
            $ownerUser->id;

        $owner->ativo = true;
        $owner->save();

        $veiculo = new Veiculo([
            'proprietario_id' => $owner->id,
            'matricula' => 'AA-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
            'carta_verde_valid_until' =>
            now()
                ->subDay()
                ->toDateString(),
        ]);

        $veiculo->tenant_id =
            $tenant->id;

        $veiculo->ativo = true;
        $veiculo->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'document.veiculo.seguro'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('critical');

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id,
            $ownerUser->id
        );
    }
);


test(
    'contrato proximo do fim gera alerta para motorista proprietario e gestor',
    function () {
        $tenant = aevTenant(
            'Tenant Contrato',
            'tenant-alert-contrato'
        );

        $admin = aevUser(
            $tenant,
            'admin-contract@alert.test',
            'admin_empresa'
        );

        $driverUser = aevUser(
            $tenant,
            'driver-contract@alert.test'
        );

        $ownerUser = aevUser(
            $tenant,
            'owner-contract@alert.test'
        );

        $motorista = aevMotorista(
            $tenant,
            $driverUser,
            [
                'carta_valid_until' =>
                now()
                    ->addYear()
                    ->toDateString(),
            ]
        );

        $owner = new Proprietario([
            'tipo' => 'pessoa_fisica',
            'nome_completo' => 'Proprietário Contrato',
        ]);

        $owner->tenant_id = $tenant->id;
        $owner->user_id = $ownerUser->id;
        $owner->ativo = true;
        $owner->save();

        $veiculo = new Veiculo([
            'proprietario_id' => $owner->id,
            'matricula' => 'CT-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $contrato = new Contrato([
            'tipo' => 'aluguer',
            'motorista_id' => $motorista->id,
            'proprietario_id' => $owner->id,
            'veiculo_id' => $veiculo->id,
            'data_inicio' =>
            now()
                ->subMonth()
                ->toDateString(),
            'data_fim' =>
            now()
                ->addDays(7)
                ->toDateString(),
        ]);

        $contrato->tenant_id = $tenant->id;
        $contrato->status = 'assinado';
        $contrato->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'contract.end_date'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('high');

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id,
            $driverUser->id,
            $ownerUser->id
        );
    }
);

test(
    'aluguer ativo vencido gera alerta critico',
    function () {
        $tenant = aevTenant(
            'Tenant Aluguer',
            'tenant-alert-aluguer'
        );

        $admin = aevUser(
            $tenant,
            'admin-rental@alert.test',
            'admin_empresa'
        );

        $driverUser = aevUser(
            $tenant,
            'driver-rental@alert.test'
        );

        $motorista = aevMotorista(
            $tenant,
            $driverUser,
            [
                'carta_valid_until' =>
                now()
                    ->addYear()
                    ->toDateString(),
            ]
        );

        $aluguer = new Aluguer([
            'motorista_id' => $motorista->id,
            'data_inicio' =>
            now()
                ->subMonth()
                ->toDateString(),
            'data_fim' =>
            now()
                ->subDay()
                ->toDateString(),
        ]);

        $aluguer->tenant_id = $tenant->id;
        $aluguer->status = 'ativo';
        $aluguer->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'rental.end_date'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('critical');

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id,
            $driverUser->id
        );
    }
);

test(
    'sinistro sem peritagem marcada gera alerta alto',
    function () {
        $tenant = aevTenant(
            'Tenant Sinistro Sem Data',
            'tenant-sinistro-sem-data'
        );

        $admin = aevUser(
            $tenant,
            'admin-claim@alert.test',
            'admin_empresa'
        );

        $driverUser = aevUser(
            $tenant,
            'driver-claim@alert.test'
        );

        $motorista = aevMotorista(
            $tenant,
            $driverUser,
            [
                'carta_valid_until' =>
                now()
                    ->addYear()
                    ->toDateString(),
            ]
        );

        $veiculo = new Veiculo([
            'matricula' => 'SN-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $sinistro = new Sinistro([
            'veiculo_id' => $veiculo->id,
            'motorista_id' => $motorista->id,
            'data_sinistro' =>
            now()
                ->subDays(2)
                ->toDateString(),
            'status' => 'aberto',
            'peritagem_realizada' => false,
        ]);

        $sinistro->tenant_id = $tenant->id;
        $sinistro->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'claim.peritagem.missing_date'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('high');

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id,
            $driverUser->id
        );
    }
);

test(
    'realizar peritagem resolve pendencia e mantem alerta do sinistro aberto',
    function () {
        $tenant = aevTenant(
            'Tenant Peritagem',
            'tenant-alert-peritagem'
        );

        $admin = aevUser(
            $tenant,
            'admin-expertise@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'PR-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $sinistro = new Sinistro([
            'veiculo_id' => $veiculo->id,
            'data_sinistro' =>
            now()
                ->subDays(5)
                ->toDateString(),
            'status' => 'aberto',
            'data_peritagem' =>
            now()
                ->addDay()
                ->toDateString(),
            'peritagem_realizada' => false,
        ]);

        $sinistro->tenant_id = $tenant->id;
        $sinistro->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $peritagem = Alert::query()
            ->where(
                'rule_code',
                'claim.peritagem.due'
            )
            ->firstOrFail();

        expect($peritagem->status)
            ->toBe('open');

        $sinistro->peritagem_realizada = true;
        $sinistro->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $peritagem->refresh();

        expect($peritagem->status)
            ->toBe('resolved');

        $aberto = Alert::query()
            ->where(
                'rule_code',
                'claim.open_after_peritagem'
            )
            ->firstOrFail();

        expect($aberto->status)
            ->toBe('open');

        expect($aberto->severity)
            ->toBe('low');

        expect(
            $aberto
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id
        );
    }
);

test(
    'encerrar sinistro resolve automaticamente alerta operacional',
    function () {
        $tenant = aevTenant(
            'Tenant Encerrar Sinistro',
            'tenant-encerrar-sinistro'
        );

        aevUser(
            $tenant,
            'admin-close-claim@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'CL-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $sinistro = new Sinistro([
            'veiculo_id' => $veiculo->id,
            'data_sinistro' =>
            now()
                ->subDays(3)
                ->toDateString(),
            'status' => 'aberto',
            'peritagem_realizada' => true,
        ]);

        $sinistro->tenant_id = $tenant->id;
        $sinistro->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'claim.open_after_peritagem'
            )
            ->firstOrFail();

        $sinistro->status = 'encerrado';
        $sinistro->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');

        expect(
            $alert->resolution_type
        )->toBe('automatic');
    }
);


test(
    'plano preventivo vencido por km gera alerta critico',
    function () {
        $tenant = aevTenant(
            'Tenant Plano KM',
            'tenant-alert-plano-km'
        );

        $admin = aevUser(
            $tenant,
            'admin-plan-km@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'KM-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->km_atual = 51000;
        $veiculo->ativo = true;
        $veiculo->save();

        $plano = new ManutencaoPlano([
            'nome' => 'Revisão 10 mil km',
            'tipo_servico' => 'Revisão',
            'intervalo_km' => 10000,
            'alerta_antecedencia_km' => 2000,
            'alerta_antecedencia_dias' => 30,
            'ativo' => true,
        ]);

        $plano->tenant_id = $tenant->id;
        $plano->save();

        $vinculo = new ManutencaoPlanoVeiculo([
            'plano_id' => $plano->id,
            'veiculo_id' => $veiculo->id,
            'ultimo_km' => 40000,
            'ativo' => true,
        ]);

        $vinculo->tenant_id = $tenant->id;
        $vinculo->proximo_km = 50000;
        $vinculo->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'maintenance.plan.km_due'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('critical');

        expect(
            $alert->metadata['km_remaining']
        )->toBe(-1000);

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id
        );
    }
);

test(
    'plano preventivo proximo por data gera alerta',
    function () {
        $tenant = aevTenant(
            'Tenant Plano Data',
            'tenant-alert-plano-data'
        );

        aevUser(
            $tenant,
            'admin-plan-date@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'DT-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->km_atual = 10000;
        $veiculo->ativo = true;
        $veiculo->save();

        $plano = new ManutencaoPlano([
            'nome' => 'Revisão anual',
            'tipo_servico' => 'Revisão',
            'intervalo_meses' => 12,
            'alerta_antecedencia_km' => 0,
            'alerta_antecedencia_dias' => 30,
            'ativo' => true,
        ]);

        $plano->tenant_id = $tenant->id;
        $plano->save();

        $vinculo = new ManutencaoPlanoVeiculo([
            'plano_id' => $plano->id,
            'veiculo_id' => $veiculo->id,
            'ultima_data' =>
            now()
                ->subYear()
                ->addDays(7)
                ->toDateString(),
            'ativo' => true,
        ]);

        $vinculo->tenant_id = $tenant->id;

        $vinculo->proxima_data =
            now()
            ->addDays(7)
            ->toDateString();

        $vinculo->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'maintenance.plan.date_due'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('high');
    }
);

test(
    'diagnostico critico aberto gera alerta critico e resolucao fecha alerta',
    function () {
        $tenant = aevTenant(
            'Tenant DTC',
            'tenant-alert-dtc'
        );

        aevUser(
            $tenant,
            'admin-dtc@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'DC-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $diagnostico = new VeiculoDiagnostico([
            'veiculo_id' => $veiculo->id,
            'fonte' => 'obd',
            'codigo_dtc' => 'P0300',
            'severidade' => 'critica',
            'titulo' => 'Falha de ignição',
            'descricao' => 'Falha detectada.',
            'detectado_em' => now(),
        ]);

        $diagnostico->tenant_id = $tenant->id;
        $diagnostico->status = 'aberto';
        $diagnostico->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'maintenance.diagnostic.open'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('critical');

        $diagnostico->status = 'resolvido';
        $diagnostico->resolvido_em = now();
        $diagnostico->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');

        expect(
            $alert->resolution_type
        )->toBe('automatic');
    }
);

test(
    'diagnostico de baixa severidade nao gera alerta',
    function () {
        $tenant = aevTenant(
            'Tenant DTC Baixo',
            'tenant-alert-dtc-baixo'
        );

        aevUser(
            $tenant,
            'admin-dtc-low@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'DL-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $diagnostico = new VeiculoDiagnostico([
            'veiculo_id' => $veiculo->id,
            'fonte' => 'manual',
            'severidade' => 'baixa',
            'titulo' => 'Aviso simples',
            'detectado_em' => now(),
        ]);

        $diagnostico->tenant_id = $tenant->id;
        $diagnostico->status = 'aberto';
        $diagnostico->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        expect(
            Alert::query()
                ->where(
                    'rule_code',
                    'maintenance.diagnostic.open'
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'aprovacao pendente proxima de expirar gera alerta e resposta resolve',
    function () {
        $tenant = aevTenant(
            'Tenant Aprovação',
            'tenant-alert-aprovacao'
        );

        aevUser(
            $tenant,
            'admin-approval@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'AP-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id = $tenant->id;
        $veiculo->ativo = true;
        $veiculo->save();

        $manutencao = new Manutencao([
            'veiculo_id' => $veiculo->id,
            'origem' => 'manual',
            'tipo_servico' => 'Reparação',
            'prioridade' => 'normal',
            'data_solicitacao' =>
            now()->toDateString(),
            'aprovacao_obrigatoria' => true,
            'indisponibiliza_veiculo' => true,
        ]);

        $manutencao->tenant_id = $tenant->id;
        $manutencao->numero_ordem =
            'MAN-ALERT-001';
        $manutencao->status =
            'aguardando_aprovacao';
        $manutencao->save();

        $aprovacao =
            new ManutencaoAprovacao([
                'aprovador_nome' => 'Teste',
                'aprovador_email' =>
                'teste@example.com',
            ]);

        $aprovacao->tenant_id = $tenant->id;
        $aprovacao->manutencao_id =
            $manutencao->id;
        $aprovacao->status = 'pendente';
        $aprovacao->valor_orcamento = 500;
        $aprovacao->expires_at =
            now()->addHours(12);
        $aprovacao->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'maintenance.approval.pending'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('high');

        $aprovacao->status = 'aprovada';
        $aprovacao->respondido_em = now();
        $aprovacao->save();

        $manutencao->status = 'aprovada';
        $manutencao->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');
    }
);

test(
    'garantia proxima do fim por data gera alerta e utilizacao resolve',
    function () {
        $tenant = aevTenant(
            'Tenant Garantia Data',
            'tenant-alert-garantia-data'
        );

        $admin = aevUser(
            $tenant,
            'admin-warranty-date@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'GD-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id =
            $tenant->id;

        $veiculo->km_atual = 50000;
        $veiculo->ativo = true;
        $veiculo->save();

        $manutencao = new Manutencao([
            'veiculo_id' => $veiculo->id,
            'origem' => 'manual',
            'tipo_servico' => 'Reparação',
            'prioridade' => 'normal',
            'data_solicitacao' =>
            now()->toDateString(),
            'aprovacao_obrigatoria' => false,
            'indisponibiliza_veiculo' => false,
        ]);

        $manutencao->tenant_id =
            $tenant->id;

        $manutencao->numero_ordem =
            'MAN-GAR-001';

        $manutencao->status =
            'concluida';

        $manutencao->save();

        $garantia =
            new ManutencaoGarantia([
                'descricao' =>
                'Garantia bateria auxiliar',

                'data_inicio' =>
                now()
                    ->subMonths(11)
                    ->toDateString(),

                'data_fim' =>
                now()
                    ->addDays(7)
                    ->toDateString(),

                'status' => 'ativa',
            ]);

        $garantia->tenant_id =
            $tenant->id;

        $garantia->manutencao_id =
            $manutencao->id;

        $garantia->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'maintenance.warranty.date_due'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('high');

        expect(
            $alert
                ->recipients()
                ->pluck('user_id')
                ->all()
        )->toContain(
            $admin->id
        );

        $garantia->status =
            'utilizada';

        $garantia->utilizada_em =
            now();

        $garantia->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');

        expect(
            $alert->resolution_type
        )->toBe('automatic');
    }
);

test(
    'garantia ultrapassada por km gera alerta critico',
    function () {
        $tenant = aevTenant(
            'Tenant Garantia KM',
            'tenant-alert-garantia-km'
        );

        aevUser(
            $tenant,
            'admin-warranty-km@alert.test',
            'admin_empresa'
        );

        $veiculo = new Veiculo([
            'matricula' => 'GK-18-AA',
            'marca' => 'Tesla',
            'modelo' => 'Model 3',
        ]);

        $veiculo->tenant_id =
            $tenant->id;

        $veiculo->km_atual = 61000;
        $veiculo->ativo = true;
        $veiculo->save();

        $manutencao = new Manutencao([
            'veiculo_id' => $veiculo->id,
            'origem' => 'manual',
            'tipo_servico' => 'Peça',
            'prioridade' => 'normal',
            'data_solicitacao' =>
            now()->toDateString(),
            'aprovacao_obrigatoria' => false,
            'indisponibiliza_veiculo' => false,
        ]);

        $manutencao->tenant_id =
            $tenant->id;

        $manutencao->numero_ordem =
            'MAN-GAR-002';

        $manutencao->status =
            'concluida';

        $manutencao->save();

        $garantia =
            new ManutencaoGarantia([
                'descricao' => 'Garantia peça',
                'data_inicio' =>
                now()
                    ->subMonth()
                    ->toDateString(),
                'km_limite' => 60000,
                'status' => 'ativa',
            ]);

        $garantia->tenant_id =
            $tenant->id;

        $garantia->manutencao_id =
            $manutencao->id;

        $garantia->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'maintenance.warranty.km_due'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('critical');

        expect(
            $alert->metadata['km_remaining']
        )->toBe(-1000);
    }
);

test(
    'estoque abaixo do minimo gera alerta e reposicao resolve',
    function () {
        $tenant = aevTenant(
            'Tenant Estoque',
            'tenant-alert-estoque'
        );

        aevUser(
            $tenant,
            'admin-stock@alert.test',
            'admin_empresa'
        );

        $peca = new Peca([
            'codigo' => 'FLT-001',
            'nome' => 'Filtro de habitáculo',
            'unidade' => 'un',
            'estoque_minimo' => 10,
            'ativo' => true,
        ]);

        $peca->tenant_id =
            $tenant->id;

        $peca->estoque_atual = 4;
        $peca->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'inventory.stock.low'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('high');

        expect(
            (float)$alert->metadata['estoque_atual']
        )->toBe(4.0);

        $peca->estoque_atual = 15;
        $peca->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');
    }
);

test(
    'peca sem estoque minimo configurado nao gera alerta',
    function () {
        $tenant = aevTenant(
            'Tenant Sem Mínimo',
            'tenant-alert-sem-minimo'
        );

        aevUser(
            $tenant,
            'admin-no-min@alert.test',
            'admin_empresa'
        );

        $peca = new Peca([
            'codigo' => 'SEM-001',
            'nome' => 'Peça sem mínimo',
            'unidade' => 'un',
            'estoque_minimo' => 0,
            'ativo' => true,
        ]);

        $peca->tenant_id =
            $tenant->id;

        $peca->estoque_atual = 0;
        $peca->save();

        app(
            AlertEvaluationService::class
        )->evaluateTenant(
            $tenant->id
        );

        expect(
            Alert::query()
                ->where(
                    'rule_code',
                    'inventory.stock.low'
                )
                ->exists()
        )->toBeFalse();
    }
);

test(
    'compra atrasada gera alerta e recebimento resolve',
    function () {
        $tenant = aevTenant(
            'Tenant Compra',
            'tenant-alert-compra'
        );

        aevUser(
            $tenant,
            'admin-purchase@alert.test',
            'admin_empresa'
        );

        $compra = new Compra([
            'numero_documento' =>
            'PO-ALERT-001',

            'status' => 'encomendada',

            'data_encomenda' =>
            now()
                ->subDays(12)
                ->toDateString(),

            'data_prevista' =>
            now()
                ->subDays(8)
                ->toDateString(),

            'impostos' => 0,
        ]);

        $compra->tenant_id =
            $tenant->id;

        $compra->subtotal = 100;
        $compra->total = 100;
        $compra->save();

        $service = app(
            AlertEvaluationService::class
        );

        $service->evaluateTenant(
            $tenant->id
        );

        $alert = Alert::query()
            ->where(
                'rule_code',
                'purchase.delivery.overdue'
            )
            ->firstOrFail();

        expect($alert->severity)
            ->toBe('critical');

        expect(
            $alert->metadata['days_overdue']
        )->toBe(8);

        $compra->status = 'recebida';

        $compra->data_recebimento =
            now()->toDateString();

        $compra->save();

        $service->evaluateTenant(
            $tenant->id
        );

        $alert->refresh();

        expect($alert->status)
            ->toBe('resolved');
    }
);
