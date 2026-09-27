<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Manutencao;
use App\Models\Multa;
use App\Models\Proprietario;
use App\Models\Sinistro;
use App\Models\User;
use App\Models\Veiculo;
use Carbon\CarbonImmutable;

class ProprietarioDashboardService
{
    private const TIMEZONE='Europe/Lisbon';

    public function data(User $user,string $tenantId): array
    {
        if(!$user->hasRole('proprietario',$tenantId)){
            abort(403,'Apenas proprietários podem aceder a este dashboard.');
        }

        $proprietario=Proprietario::query()
            ->where('tenant_id',$tenantId)
            ->where('user_id',$user->id)
            ->firstOrFail();

        $veiculosQuery=Veiculo::query()
            ->where('tenant_id',$tenantId)
            ->where('proprietario_id',$proprietario->id);

        $veiculoIds=(clone $veiculosQuery)->pluck('id');

        $atribuicoes=ContratoAtivoVeiculo::query()
            ->where('tenant_id',$tenantId)
            ->whereIn('veiculo_id',$veiculoIds)
            ->where('ativo',true)
            ->with('motorista:id,nome_completo')
            ->get();

        $atribuicoesPorVeiculo=$atribuicoes->groupBy('veiculo_id');

        $frota=(clone $veiculosQuery)
            ->withCount([
                'multas as multas_abertas_count'=>fn($query)=>$query->whereIn('status',['pendente','contestada']),
                'sinistros as sinistros_abertos_count'=>fn($query)=>$query->whereIn('status',['aberto','em_andamento']),
                'manutencoes as manutencoes_abertas_count'=>fn($query)=>$query->whereNotIn('status',['concluida','cancelada']),
            ])
            ->orderBy('matricula')
            ->limit(8)
            ->get()
            ->map(function(Veiculo $veiculo) use($atribuicoesPorVeiculo){
                $vinculos=$atribuicoesPorVeiculo->get($veiculo->id,collect());

                return [
                    'id'=>$veiculo->id,
                    'matricula'=>$veiculo->matricula,
                    'marca'=>$veiculo->marca,
                    'modelo'=>$veiculo->modelo,
                    'ativo'=>(bool)$veiculo->ativo,
                    'status_cadastro'=>$veiculo->status_cadastro,
                    'km_atual'=>$veiculo->km_atual,
                    'motoristas'=>$vinculos->pluck('motorista')->filter()->map(fn($motorista)=>[
                        'id'=>$motorista->id,
                        'nome'=>$motorista->nome_completo,
                    ])->values()->all(),
                    'multas_abertas'=>(int)$veiculo->multas_abertas_count,
                    'sinistros_abertos'=>(int)$veiculo->sinistros_abertos_count,
                    'manutencoes_abertas'=>(int)$veiculo->manutencoes_abertas_count,
                ];
            })
            ->values()
            ->all();

        $multas=Multa::query()
            ->where('tenant_id',$tenantId)
            ->whereIn('veiculo_id',$veiculoIds);

        $sinistros=Sinistro::query()
            ->where('tenant_id',$tenantId)
            ->whereIn('veiculo_id',$veiculoIds);

        $manutencoes=Manutencao::query()
            ->where('tenant_id',$tenantId)
            ->whereIn('veiculo_id',$veiculoIds);

        $documentos=$this->documents(
            $proprietario,
            (clone $veiculosQuery)->get()
        );

        return [
            'proprietario'=>[
                'id'=>$proprietario->id,
                'tipo'=>$proprietario->tipo,
                'nome'=>$proprietario->nome_empresa ?: $proprietario->nome_completo,
                'ativo'=>(bool)$proprietario->ativo,
                'status_cadastro'=>$proprietario->status_cadastro,
            ],
            'frota'=>[
                'total'=>(clone $veiculosQuery)->count(),
                'ativos'=>(clone $veiculosQuery)->where('ativo',true)->count(),
                'inativos'=>(clone $veiculosQuery)->where('ativo',false)->count(),
                'incompletos'=>(clone $veiculosQuery)->where('status_cadastro','!=','ativo')->count(),
                'items'=>$frota,
            ],
            'contratos'=>[
                'ativos'=>$atribuicoes->whereNotNull('contrato_id')->count(),
                'motoristas_vinculados'=>$atribuicoes->count(),
            ],
            'multas'=>[
                'pendentes'=>(clone $multas)->where('status','pendente')->count(),
                'contestadas'=>(clone $multas)->where('status','contestada')->count(),
                'total_abertas'=>(clone $multas)->whereIn('status',['pendente','contestada'])->count(),
            ],
            'sinistros'=>[
                'abertos'=>(clone $sinistros)->where('status','aberto')->count(),
                'em_andamento'=>(clone $sinistros)->where('status','em_andamento')->count(),
                'total_abertos'=>(clone $sinistros)->whereIn('status',['aberto','em_andamento'])->count(),
            ],
            'manutencoes'=>[
                'abertas'=>(clone $manutencoes)->whereNotIn('status',['concluida','cancelada'])->count(),
                'criticas'=>(clone $manutencoes)
                    ->whereNotIn('status',['concluida','cancelada'])
                    ->where('prioridade','critica')
                    ->count(),
            ],
            'documentos'=>$documentos,
            'alertas'=>$this->alerts($user,$tenantId),
        ];
    }

    private function documents(Proprietario $proprietario,$veiculos): array
    {
        $items=[
            ['codigo'=>'documento_proprietario','nome'=>'Documento do proprietário','origem'=>'proprietario','referencia'=>null,'data'=>$proprietario->documento_valid_until],
            ['codigo'=>'certidao_permanente','nome'=>'Certidão permanente','origem'=>'proprietario','referencia'=>null,'data'=>$proprietario->certidao_valid_until],
            ['codigo'=>'certificado_tvde','nome'=>'Certificado TVDE','origem'=>'proprietario','referencia'=>null,'data'=>$proprietario->certificado_tvde_valid_until],
        ];

        foreach($veiculos as $veiculo){
            foreach([
                ['carta_verde','Carta verde',$veiculo->carta_verde_valid_until],
                ['inspecao_tvde','Inspeção TVDE',$veiculo->inspecao_tvde_valid_until],
                ['uber','Uber',$veiculo->uber_valid_until],
                ['bolt','Bolt',$veiculo->bolt_valid_until],
                ['extintor','Extintor',$veiculo->extintor_valid_until],
            ] as [$codigo,$nome,$data]){
                $items[]=[
                    'codigo'=>$codigo,
                    'nome'=>$nome,
                    'origem'=>'veiculo',
                    'referencia'=>$veiculo->matricula,
                    'data'=>$data,
                ];
            }
        }

        $today=CarbonImmutable::today(self::TIMEZONE);

        $docs=collect($items)
            ->filter(fn(array $item)=>filled($item['data']))
            ->map(function(array $item) use($today){
                $date=CarbonImmutable::parse($item['data'],self::TIMEZONE)->startOfDay();

                return [
                    'codigo'=>$item['codigo'],
                    'nome'=>$item['nome'],
                    'origem'=>$item['origem'],
                    'referencia'=>$item['referencia'],
                    'valid_until'=>$date->toDateString(),
                    'dias_restantes'=>(int)$today->diffInDays($date,false),
                    'vencido'=>$date->lt($today),
                ];
            })
            ->sortBy('valid_until')
            ->values();

        return [
            'vencidos'=>$docs->where('dias_restantes','<',0)->count(),
            'a_vencer_30_dias'=>$docs->filter(fn(array $item)=>$item['dias_restantes']>=0&&$item['dias_restantes']<=30)->count(),
            'proximo_vencimento'=>$docs->first(fn(array $item)=>$item['dias_restantes']>=0),
            'atencao'=>$docs->filter(fn(array $item)=>$item['dias_restantes']<=30)->take(10)->values()->all(),
        ];
    }

    private function alerts(User $user,string $tenantId): array
    {
        $base=Alert::query()
            ->where('tenant_id',$tenantId)
            ->where('status','open')
            ->whereHas('recipients',function($query) use($tenantId,$user){
                $query
                    ->where('tenant_id',$tenantId)
                    ->where('user_id',$user->id)
                    ->where('active',true)
                    ->where(function($query){
                        $query->whereNull('snoozed_until')->orWhere('snoozed_until','<=',now());
                    });
            });

        $unread=(clone $base)->whereHas('recipients',fn($query)=>$query
            ->where('tenant_id',$tenantId)
            ->where('user_id',$user->id)
            ->where('active',true)
            ->whereNull('read_at')
        )->count();

        $items=(clone $base)
            ->orderByRaw("CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->orderByRaw('CASE WHEN due_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_at')
            ->limit(5)
            ->get()
            ->map(fn(Alert $alert)=>[
                'id'=>$alert->id,
                'severity'=>$alert->severity,
                'category'=>$alert->category,
                'title'=>$alert->title,
                'message'=>$alert->message,
                'due_at'=>$alert->due_at?->toISOString(),
                'action_url'=>$alert->action_url,
            ])
            ->values()
            ->all();

        return [
            'total'=>$base->count(),
            'nao_lidos'=>$unread,
            'items'=>$items,
        ];
    }
}
