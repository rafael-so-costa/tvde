<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmRemoteSignatureRequest;
use App\Http\Requests\PrepareChecklistSignaturesRequest;
use App\Models\ChecklistRecord;
use App\Services\ChecklistSignatureService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;

class ChecklistRemoteSignatureController extends Controller
{
    public function __construct(
        private ChecklistSignatureService $signatureService,
        private TenantContext $tenantContext
    ) {}

    public function prepare(
        PrepareChecklistSignaturesRequest $request,
        string $id
    ):JsonResponse{
        $checklist=
            ChecklistRecord::query()
                ->where(
                    'tenant_id',
                    $this
                        ->tenantContext
                        ->requireId()
                )
                ->findOrFail(
                    $id
                );

        $result=
            $this
                ->signatureService
                ->prepare(
                    $checklist,
                    $request
                        ->validated(),
                    $request
                        ->user()
                        ->id
                );

        return response()->json([
            'message'=>
                $result[
                    'estado'
                ]===
                'finalizado'
                    ?'Checklist finalizado e PDF gerado com sucesso.'
                    :'Solicitações de assinatura enviadas com sucesso.',

            'data'=>
                $result,
        ]);
    }

    public function show(
        string $token
    ):JsonResponse{
        return response()->json([
            'data'=>
                $this
                    ->signatureService
                    ->preview(
                        $token
                    ),
        ]);
    }

    public function confirm(
        ConfirmRemoteSignatureRequest $request,
        string $token
    ):JsonResponse{
        $result=
            $this
                ->signatureService
                ->confirm(
                    $token,
                    $request
                        ->string(
                            'codigo_otp'
                        )
                        ->toString(),

                    $request
                        ->string(
                            'assinatura'
                        )
                        ->toString(),

                    $request->ip(),
                    $request
                        ->userAgent()
                );

        return response()->json([
            'message'=>
                $result[
                    'checklist_finalizado'
                ]
                    ?'Assinatura concluída. O checklist foi finalizado e o PDF foi gerado.'
                    :'Assinatura registada com sucesso. Ainda existem assinaturas pendentes.',

            'data'=>
                $result,
        ]);
    }
}