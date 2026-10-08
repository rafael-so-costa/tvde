<?php

namespace App\Services;

use App\Models\ChecklistProcessRun;
use App\Models\ChecklistProcessRunItem;
use App\Models\Contrato;
use App\Models\Motorista;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChecklistWorkflowActionService
{
    public const ACTION_DRIVER_ACCESS='motorista_acesso';

    public function __construct(
        private ChecklistProcessService $processService,
        private MotoristaAccountService $accountService
    ) {}

    public function inspect(
        string $tenantId,
        string $contratoId,
        string $itemId
    ): array {
        [$contrato,$item]=$this->resolve(
            $tenantId,
            $contratoId,
            $itemId
        );

        return $this->driverAccessStatus(
            $tenantId,
            $contrato,
            $item
        );
    }

    public function execute(
        string $tenantId,
        string $contratoId,
        string $itemId,
        User $actor,
        array $data=[]
    ): array {
        return DB::transaction(function() use(
            $tenantId,
            $contratoId,
            $itemId,
            $actor,
            $data
        ){
            [$contrato,$item]=$this->resolve(
                $tenantId,
                $contratoId,
                $itemId
            );

            $action=data_get(
                $item->configuracao_snapshot,
                'action'
            );

            if($action!==self::ACTION_DRIVER_ACCESS){
                throw ValidationException::withMessages([
                    'item'=>
                        'A ação configurada para esta etapa não é suportada.',
                ]);
            }

            if(!$contrato->motorista_id){
                throw ValidationException::withMessages([
                    'motorista_id'=>
                        'O contrato não possui motorista associado.',
                ]);
            }

            $status=$this->driverAccessStatus(
                $tenantId,
                $contrato,
                $item
            );

            if(!$status['concluido']){
                if($status['conta_vinculada']){
                    throw ValidationException::withMessages([
                        'acesso'=>
                            'A conta do motorista já existe, mas o acesso está incompleto ou inativo. Regularize o utilizador, a associação à organização e a função de motorista antes de continuar.',
                    ]);
                }

                $password=$data['password']??null;

                if(!$password){
                    throw ValidationException::withMessages([
                        'password'=>
                            'Defina uma senha inicial para criar o acesso do motorista.',
                    ]);
                }

                $motorista=Motorista::query()
                    ->where('tenant_id',$tenantId)
                    ->whereKey($contrato->motorista_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $this->accountService->create(
                    $motorista,
                    $password
                );

                $contrato->unsetRelation('motorista');
                $contrato->load('motorista.user');

                $status=$this->driverAccessStatus(
                    $tenantId,
                    $contrato,
                    $item
                );

                if(!$status['concluido']){
                    throw ValidationException::withMessages([
                        'acesso'=>
                            'A conta foi criada, mas o acesso completo do motorista não pôde ser validado.',
                    ]);
                }
            }

            $this->processService->completeByCode(
                $tenantId,
                ChecklistProcessService::ENTITY_CONTRATO,
                $contrato->id,
                $item->codigo,
                [
                    'action'=>self::ACTION_DRIVER_ACCESS,
                    'motorista_id'=>$contrato->motorista_id,
                    'user_id'=>$status['user_id'],
                    'verificado'=>true,
                ],
                $actor->id
            );

            $contrato->unsetRelation('motorista');
            $contrato->load('motorista.user');

            return $this->driverAccessStatus(
                $tenantId,
                $contrato,
                $item
            );
        });
    }

    public function syncMotoristaAccess(
        string $tenantId,
        string $motoristaId,
        ?string $actorId=null
    ): void {
        $motorista=Motorista::query()
            ->where('tenant_id',$tenantId)
            ->with('user')
            ->find($motoristaId);

        if(
            !$motorista ||
            !$this->hasAccess(
                $tenantId,
                $motorista
            )
        ){
            return;
        }

        $contratoIds=Contrato::query()
            ->where('tenant_id',$tenantId)
            ->where('motorista_id',$motoristaId)
            ->pluck('id');

        if($contratoIds->isEmpty()){
            return;
        }

        $runs=ChecklistProcessRun::query()
            ->where('tenant_id',$tenantId)
            ->where(
                'entidade_tipo',
                ChecklistProcessService::ENTITY_CONTRATO
            )
            ->whereIn(
                'entidade_id',
                $contratoIds
            )
            ->whereNotIn(
                'status',
                [
                    ChecklistProcessService::STATUS_DONE,
                    ChecklistProcessService::STATUS_CANCELLED,
                ]
            )
            ->with([
                'items'=>fn($query)=>$query
                    ->where(
                        'tipo',
                        'acao_sistema'
                    )
                    ->whereNotIn(
                        'status',
                        [
                            ChecklistProcessService::ITEM_DONE,
                            ChecklistProcessService::ITEM_WAIVED,
                        ]
                    ),
            ])
            ->get();

        foreach($runs as $run){
            foreach($run->items as $item){
                if(
                    data_get(
                        $item->configuracao_snapshot,
                        'action'
                    )!==self::ACTION_DRIVER_ACCESS
                ){
                    continue;
                }

                $this->processService->completeByCode(
                    $tenantId,
                    ChecklistProcessService::ENTITY_CONTRATO,
                    $run->entidade_id,
                    $item->codigo,
                    [
                        'action'=>self::ACTION_DRIVER_ACCESS,
                        'motorista_id'=>$motoristaId,
                        'user_id'=>$motorista->user_id,
                        'verificado'=>true,
                    ],
                    $actorId
                );
            }
        }
    }

    private function driverAccessStatus(
        string $tenantId,
        Contrato $contrato,
        ChecklistProcessRunItem $item
    ): array {
        $motorista=$contrato->motorista;
        $user=$motorista?->user;

        $contaVinculada=
            filled($motorista?->user_id);

        $contaCriada=
            $user!==null;

        $utilizadorAtivo=
            $user?->ativo===true;

        $associacaoTenantAtiva=
            $user
                ?TenantUser::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->where(
                        'status',
                        'ativo'
                    )
                    ->exists()
                :false;

        $roleMotorista=
            $user
                ?$user->hasRole(
                    'motorista',
                    $tenantId
                )
                :false;

        $acessoAtivo=
            $contaCriada &&
            $utilizadorAtivo &&
            $associacaoTenantAtiva &&
            $roleMotorista;

        return [
            'action'=>self::ACTION_DRIVER_ACCESS,

            'item_id'=>$item->id,
            'item_status'=>$item
                ->fresh()
                ->status,

            'motorista_id'=>$motorista?->id,
            'motorista_nome'=>$motorista?->nome_completo,
            'email'=>$motorista?->email,

            'user_id'=>$user?->id,

            'conta_vinculada'=>$contaVinculada,
            'conta_criada'=>$contaCriada,
            'utilizador_ativo'=>$utilizadorAtivo,
            'associacao_tenant_ativa'=>$associacaoTenantAtiva,
            'role_motorista'=>$roleMotorista,

            'pode_criar'=>
                $motorista!==null &&
                !$contaVinculada,

            'acesso_ativo'=>$acessoAtivo,
            'concluido'=>$acessoAtivo,
        ];
    }

    private function hasAccess(
        string $tenantId,
        Motorista $motorista
    ): bool {
        if(!$motorista->user_id){
            return false;
        }

        $user=$motorista->user;

        if(
            !$user ||
            !$user->ativo
        ){
            return false;
        }

        $tenantAtivo=TenantUser::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $user->id
            )
            ->where(
                'status',
                'ativo'
            )
            ->exists();

        if(!$tenantAtivo){
            return false;
        }

        return $user->hasRole(
            'motorista',
            $tenantId
        );
    }

    private function resolve(
        string $tenantId,
        string $contratoId,
        string $itemId
    ): array {
        $contrato=Contrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->with('motorista.user')
            ->findOrFail(
                $contratoId
            );

        $run=ChecklistProcessRun::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'entidade_tipo',
                ChecklistProcessService::ENTITY_CONTRATO
            )
            ->where(
                'entidade_id',
                $contrato->id
            )
            ->firstOrFail();

        $item=ChecklistProcessRunItem::query()
            ->where(
                'run_id',
                $run->id
            )
            ->whereKey(
                $itemId
            )
            ->firstOrFail();

        if($item->tipo!=='acao_sistema'){
            throw ValidationException::withMessages([
                'item'=>
                    'Esta etapa não corresponde a uma ação do sistema.',
            ]);
        }

        return [
            $contrato,
            $item,
        ];
    }
}
