<?php

namespace App\Console\Commands;

use App\Services\FrotaProDocumentCatalogSyncService;
use Illuminate\Console\Command;

class SyncFrotaProDocumentCatalog extends Command
{
    protected $signature=
        'frotapro:document-catalog
        {--apply : Aplica a sincronização no banco de dados}';

    protected $description=
        'Audita ou sincroniza os modelos documentais recomendados do FrotaPRO.';

    public function handle(
        FrotaProDocumentCatalogSyncService $service
    ): int {
        if(
            !$this->option(
                'apply'
            )
        ){
            $plan=
                $service->plan();

            $this->newLine();

            $this->info(
                'DRY-RUN — nenhum dado será alterado.'
            );

            $this->newLine();

            $this->table(
                [
                    'Código',
                    'Ação',
                    'Versão atual',
                    'Versão alvo',
                    'Campos',
                    'Validação',
                ],
                collect(
                    $plan['models']
                )
                    ->map(
                        fn(array $model)=>[
                            $model['codigo'],
                            $model['action'],
                            $model['versao_atual']
                                ?? '-',
                            $model['versao_alvo'],
                            $model['campos'],
                            $model[
                                'tecnicamente_validado'
                            ]
                                ? 'OK'
                                : 'FALHOU',
                        ]
                    )
                    ->all()
            );

            $this->newLine();

            $this->line(
                sprintf(
                    'Criar: %d | Nova versão: %d | Sem alteração: %d | Bloqueados: %d',
                    $plan['summary']['create'],
                    $plan['summary']['publish_version'],
                    $plan['summary']['unchanged'],
                    $plan['summary']['blocked']
                )
            );

            if(
                $plan['blockers']!==[]
            ){
                $this->newLine();

                $this->error(
                    'Foram encontrados bloqueios:'
                );

                foreach(
                    $plan['blockers']
                    as $blocker
                ){
                    $this->line(
                        '- '.
                        $blocker['codigo'].
                        ': '.
                        $blocker['mensagem']
                    );
                }

                return self::FAILURE;
            }

            $this->newLine();

            $this->warn(
                'Para aplicar futuramente, execute explicitamente com --apply.'
            );

            return self::SUCCESS;
        }

        $this->warn(
            'MODO APPLY — o banco será alterado.'
        );

        $result=
            $service->apply();

        $this->newLine();

        $this->table(
            [
                'Código',
                'Ação',
                'Versão',
            ],
            collect(
                $result['models']
            )
                ->map(
                    fn(array $model)=>[
                        $model['codigo'],
                        $model['action'],
                        $model['versao'],
                    ]
                )
                ->all()
        );

        $this->newLine();

        $this->info(
            sprintf(
                'Criados: %d | Novas versões: %d | Sem alteração: %d',
                $result['summary']['created'],
                $result['summary']['published'],
                $result['summary']['unchanged']
            )
        );

        return self::SUCCESS;
    }
}
