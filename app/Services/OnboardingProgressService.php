<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\Funcionario;
use App\Models\HelpContent;
use App\Models\HelpContentView;
use App\Models\Motorista;
use App\Models\NotificationPreference;
use App\Models\Proprietario;
use App\Models\User;
use App\Models\Veiculo;
use Illuminate\Database\Eloquent\Builder;

class OnboardingProgressService
{
    public function forUser(
        User $user,
        string $tenantId
    ): array {
        $steps=$this->steps(
            $user,
            $tenantId
        );

        $audiences=
            $this->audiencesFor(
                $user,
                $tenantId
            );

        $help=
            $this->helpByFeature(
                collect($steps)
                    ->pluck('feature_key')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
                $audiences
            );

        $steps=
            collect($steps)
                ->map(
                    function(
                        array $step
                    ) use(
                        $help
                    ){
                        $step['help']=
                            $help[
                                $step[
                                    'feature_key'
                                ]
                            ] ?? [];

                        return $step;
                    }
                )
                ->values()
                ->all();

        $total=
            count($steps);

        $completed=
            collect($steps)
                ->where(
                    'completed',
                    true
                )
                ->count();

        $core=
            collect($steps)
                ->where(
                    'optional',
                    false
                );

        $coreCompleted=
            $core
                ->where(
                    'completed',
                    true
                )
                ->count();

        $coreTotal=
            $core->count();

        return [
            'progress'=>
                $total>0
                    ?(int)round(
                        (
                            $completed/
                            $total
                        )*100
                    )
                    :100,

            'completed'=>$completed,
            'total'=>$total,

            'core_progress'=>
                $coreTotal>0
                    ?(int)round(
                        (
                            $coreCompleted/
                            $coreTotal
                        )*100
                    )
                    :100,

            'core_completed'=>
                $coreCompleted,

            'core_total'=>
                $coreTotal,

            'base_ready'=>
                $coreCompleted===
                $coreTotal,

            'fully_complete'=>
                $completed===
                $total,

            'steps'=>$steps,
        ];
    }

    private function steps(
        User $user,
        string $tenantId
    ): array {
        return [
            [
                'key'=>'company',
                'title'=>'Dados da empresa',
                'description'=>
                    'Complete os dados principais da empresa e deixe o cadastro ativo.',
                'feature_key'=>'empresas',
                'action_url'=>'/empresas',
                'action_label'=>'Ver empresa',
                'optional'=>false,
                'completed'=>
                    Empresa::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'status_cadastro',
                            'ativo'
                        )
                        ->where(
                            'ativo',
                            true
                        )
                        ->exists(),
            ],

            [
                'key'=>'owner',
                'title'=>'Cadastrar primeiro proprietário',
                'description'=>
                    'Cadastre pelo menos um proprietário associado à sua operação.',
                'feature_key'=>'proprietarios',
                'action_url'=>'/proprietarios',
                'action_label'=>'Ir para Proprietários',
                'optional'=>false,
                'completed'=>
                    Proprietario::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->exists(),
            ],

            [
                'key'=>'vehicle',
                'title'=>'Cadastrar primeiro veículo',
                'description'=>
                    'Adicione o primeiro veículo que fará parte da frota.',
                'feature_key'=>'veiculos',
                'action_url'=>'/veiculos',
                'action_label'=>'Ir para Veículos',
                'optional'=>false,
                'completed'=>
                    Veiculo::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->exists(),
            ],

            [
                'key'=>'driver',
                'title'=>'Cadastrar primeiro motorista',
                'description'=>
                    'Registe pelo menos um motorista da operação.',
                'feature_key'=>'motoristas',
                'action_url'=>'/motoristas',
                'action_label'=>'Ir para Motoristas',
                'optional'=>false,
                'completed'=>
                    Motorista::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->exists(),
            ],

            [
                'key'=>'contract',
                'title'=>'Criar primeiro contrato',
                'description'=>
                    'Crie o primeiro contrato para começar a formalizar a operação.',
                'feature_key'=>'contratos',
                'action_url'=>'/contratos',
                'action_label'=>'Ir para Contratos',
                'optional'=>true,
                'completed'=>
                    Contrato::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->exists(),
            ],

            [
                'key'=>'employee',
                'title'=>'Adicionar funcionário',
                'description'=>
                    'Adicione membros da equipa e configure os respetivos acessos quando necessário.',
                'feature_key'=>'funcionarios',
                'action_url'=>'/funcionarios',
                'action_label'=>'Ir para Funcionários',
                'optional'=>true,
                'completed'=>
                    Funcionario::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->exists(),
            ],

            [
                'key'=>'notifications',
                'title'=>'Configurar notificações',
                'description'=>
                    'Defina como deseja receber alertas e notificações importantes.',
                'feature_key'=>'alertas',
                'action_url'=>'/alertas',
                'action_label'=>'Configurar Alertas',
                'optional'=>true,
                'completed'=>
                    NotificationPreference::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'user_id',
                            $user->id
                        )
                        ->exists(),
            ],

            [
                'key'=>'help_center',
                'title'=>'Conhecer a Central de Ajuda',
                'description'=>
                    'Veja pelo menos um artigo ou treinamento para conhecer os recursos de suporte do FrotaPro.',
                'feature_key'=>'onboarding',
                'action_url'=>'/ajuda',
                'action_label'=>'Abrir Central de Ajuda',
                'optional'=>true,
                'completed'=>
                    HelpContentView::query()
                        ->where(
                            'tenant_id',
                            $tenantId
                        )
                        ->where(
                            'user_id',
                            $user->id
                        )
                        ->exists(),
            ],
        ];
    }

    private function helpByFeature(
        array $features,
        array $audiences
    ): array {
        if(
            empty($features) ||
            empty($audiences)
        ){
            return [];
        }

        return HelpContent::query()
            ->with([
                'category:id,name,slug',
            ])
            ->whereIn(
                'feature_key',
                $features
            )
            ->where(
                'active',
                true
            )
            ->whereNotNull(
                'published_at'
            )
            ->where(
                'published_at',
                '<=',
                now()
            )
            ->whereHas(
                'category',
                fn(Builder $query)=>
                    $query->where(
                        'active',
                        true
                    )
            )
            ->whereHas(
                'audiences',
                fn(Builder $query)=>
                    $query->whereIn(
                        'audience',
                        $audiences
                    )
            )
            ->orderByDesc(
                'featured'
            )
            ->orderBy(
                'position'
            )
            ->orderByDesc(
                'published_at'
            )
            ->get()
            ->groupBy(
                'feature_key'
            )
            ->map(
                fn($contents)=>
                    $contents
                        ->take(2)
                        ->map(
                            fn(
                                HelpContent $content
                            )=>[
                                'id'=>
                                    $content->id,

                                'title'=>
                                    $content->title,

                                'slug'=>
                                    $content->slug,

                                'type'=>
                                    $content->type,

                                'type_label'=>
                                    $content
                                        ->type===
                                    'video'
                                        ?'Vídeo'
                                        :'Artigo',

                                'url'=>
                                    "/ajuda/{$content->slug}",
                            ]
                        )
                        ->values()
                        ->all()
            )
            ->all();
    }

    private function audiencesFor(
        User $user,
        string $tenantId
    ): array {
        if(
            $user->isSuperAdmin()
        ){
            return [
                'admin_empresa',
                'funcionario',
                'motorista',
                'proprietario',
            ];
        }

        $audiences=[];

        foreach([
            'admin_empresa',
            'funcionario',
            'motorista',
            'proprietario',
        ] as $audience){
            if(
                $user->hasRole(
                    $audience,
                    $tenantId
                )
            ){
                $audiences[]=
                    $audience;
            }
        }

        return $audiences;
    }
}
