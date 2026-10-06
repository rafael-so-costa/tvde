<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHelpCategoryRequest;
use App\Http\Requests\UpdateHelpCategoryRequest;
use App\Services\HelpCenterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackofficeHelpCategoryController extends Controller
{
    public function __construct(
        private HelpCenterService $service
    ){}

    public function index(): JsonResponse
    {
        return response()->json([
            'data'=>$this->service->categories(),
        ]);
    }

    public function store(StoreHelpCategoryRequest $request): JsonResponse
    {
        return response()->json([
            'message'=>'Categoria criada.',
            'data'=>$this->service->storeCategory(
                $request->user(),
                $request->validated()
            ),
        ],201);
    }

    public function update(UpdateHelpCategoryRequest $request,string $id): JsonResponse
    {
        return response()->json([
            'message'=>'Categoria atualizada.',
            'data'=>$this->service->updateCategory(
                $request->user(),
                $id,
                $request->validated()
            ),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->service->destroyCategory($id);

        return response()->json([
            'message'=>'Categoria eliminada.',
        ]);
    }
}
