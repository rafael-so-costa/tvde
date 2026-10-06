<?php

namespace App\Http\Controllers;

use App\Http\Requests\BackofficeHelpContentIndexRequest;
use App\Http\Requests\StoreHelpContentRequest;
use App\Http\Requests\UpdateHelpContentRequest;
use App\Services\HelpCenterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeHelpCenterController extends Controller
{
    public function __construct(
        private HelpCenterService $service
    ){}

    public function index(BackofficeHelpContentIndexRequest $request): JsonResponse
    {
        return response()->json(
            $this->service->backofficeIndex($request->validated())
        );
    }

    public function meta(): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->backofficeMeta(),
        ]);
    }

    public function summary(): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->backofficeSummary(),
        ]);
    }

    public function store(StoreHelpContentRequest $request): JsonResponse
    {
        return response()->json([
            'message'=>'Conteúdo criado.',
            'data'=>$this->service->storeContent(
                $request->user(),
                $request->validated()
            ),
        ],201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->backofficeShow($id),
        ]);
    }

    public function update(UpdateHelpContentRequest $request,string $id): JsonResponse
    {
        return response()->json([
            'message'=>'Conteúdo atualizado.',
            'data'=>$this->service->updateContent(
                $request->user(),
                $id,
                $request->validated()
            ),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->service->destroyContent($id);

        return response()->json([
            'message'=>'Conteúdo eliminado.',
        ]);
    }
}
