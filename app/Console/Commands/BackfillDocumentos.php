<?php

namespace App\Console\Commands;

use App\Models\ChecklistRecord;
use App\Models\Contrato;
use App\Models\Declaracao;
use App\Models\ManutencaoDocumento;
use App\Models\MultaDocumento;
use App\Models\ReciboVerde;
use App\Models\RegistoCriminal;
use App\Models\SinistroDocumento;
use App\Services\DocumentoRegistryService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;

class BackfillDocumentos extends Command
{
    protected $signature='documentos:backfill {--dry-run : Apenas contabiliza os documentos}';

    protected $description='Regista na Base Documental os documentos existentes antes da criação do módulo.';

    public function handle(
        DocumentoRegistryService $registry
    ): int {
        $classes=[
            Contrato::class,
            Declaracao::class,
            ChecklistRecord::class,
            RegistoCriminal::class,
            ReciboVerde::class,
            MultaDocumento::class,
            SinistroDocumento::class,
            ManutencaoDocumento::class,
        ];

        $items=collect();

        foreach($classes as $class){
            $class::query()
                ->select(['id','created_at'])
                ->orderBy('created_at')
                ->get()
                ->each(function(Model $model) use($class,$items){
                    $items->push([
                        'class'=>$class,
                        'id'=>$model->id,
                        'created_at'=>$model->created_at,
                    ]);
                });
        }

        $items=$items
            ->sortBy(fn(array $item)=>$item['created_at']?->getTimestamp()??0)
            ->values();

        $this->info("Documentos encontrados: {$items->count()}");

        if($this->option('dry-run')){
            return self::SUCCESS;
        }

        $bar=$this->output->createProgressBar($items->count());
        $bar->start();

        foreach($items as $item){
            $model=$item['class']::query()->find($item['id']);

            if($model){
                $registry->sync($model);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('Base Documental atualizada com sucesso.');

        return self::SUCCESS;
    }
}
