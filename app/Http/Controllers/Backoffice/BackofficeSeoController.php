<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSeoConfiguracaoRequest;
use App\Models\SeoConfiguracao;
use App\Services\SeoService;
use Illuminate\Http\JsonResponse;

class BackofficeSeoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data'=>SeoConfiguracao::query()
                ->orderBy('chave')
                ->get(),
        ]);
    }

    public function update(
        StoreSeoConfiguracaoRequest $request,
        string $chave,
        SeoService $service
    ): JsonResponse {
        $config=$service->upsert(
            $chave,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message'=>'SEO atualizado com sucesso.',
            'data'=>$config,
        ]);
    }
}
