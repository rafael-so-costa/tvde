<?php

namespace App\Http\Controllers;

use App\Http\Requests\PublicMarkExpedienteRequest;
use App\Services\ExpedienteService;
use Illuminate\Http\JsonResponse;

class ExpedientePublicController extends Controller
{
    public function __construct(private ExpedienteService $service){}

    public function marcar(PublicMarkExpedienteRequest $request): JsonResponse
    {
        $data=$request->validated();

        $registo=$this->service->markPublic(
            $data['nif'],
            $data['tenant_id'] ?? null,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'message'=>$registo->tipo==='entrada'
                ? 'Início de expediente registado.'
                : 'Fim de expediente registado.',
            'data'=>[
                'id'=>$registo->id,
                'tipo'=>$registo->tipo,
                'data_hora'=>$registo->data_hora,
                'data_local'=>$registo->data_local,
            ],
        ],201);
    }
}
