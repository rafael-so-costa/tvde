<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreChecklistMediaRequest;
use App\Models\ChecklistMedia;
use App\Models\ChecklistRecord;
use App\Services\ChecklistMediaService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChecklistMediaController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ChecklistMediaService $mediaService
    ) {}

    public function index(
        string $id
    ): JsonResponse {
        $checklist=
            $this->findChecklist(
                $id
            );

        return response()->json([
            'data'=>
                $checklist
                    ->mediaFiles()
                    ->with(
                        'uploadedBy:id,name'
                    )
                    ->get(),
        ]);
    }

    public function store(
        StoreChecklistMediaRequest $request,
        string $id
    ): JsonResponse {
        $checklist=
            $this->findChecklist(
                $id
            );

        $media=
            $this
                ->mediaService
                ->store(
                    $checklist,
                    $request->file(
                        'arquivo'
                    ),
                    $request->user(),
                    $request
                        ->safe()
                        ->except(
                            'arquivo'
                        )
                );

        return response()->json([
            'message'=>
                'Evidência adicionada com sucesso.',

            'data'=>
                $media,
        ],201);
    }

    public function file(
        string $id,
        string $mediaId
    ): StreamedResponse {
        $checklist=
            $this->findChecklist(
                $id
            );

        $media=
            $this->findMedia(
                $checklist,
                $mediaId
            );

        $this->ensureStored(
            $media
        );

        return Storage::disk('local')
            ->response(
                $media->arquivo_path,
                $media->arquivo_nome,
                [
                    'Content-Type'=>
                        $media->arquivo_mime,

                    'Content-Disposition'=>
                        'inline',
                ]
            );
    }

    public function download(
        string $id,
        string $mediaId
    ): StreamedResponse {
        $checklist=
            $this->findChecklist(
                $id
            );

        $media=
            $this->findMedia(
                $checklist,
                $mediaId
            );

        $this->ensureStored(
            $media
        );

        return Storage::disk('local')
            ->download(
                $media->arquivo_path,
                $media->arquivo_nome
            );
    }

    public function destroy(
        string $id,
        string $mediaId
    ): Response {
        $checklist=
            $this->findChecklist(
                $id
            );

        $media=
            $this->findMedia(
                $checklist,
                $mediaId
            );

        $this
            ->mediaService
            ->destroy(
                $checklist,
                $media
            );

        return response()
            ->noContent();
    }

    private function findChecklist(
        string $id
    ): ChecklistRecord {
        return ChecklistRecord::query()
            ->where(
                'tenant_id',
                $this
                    ->tenantContext
                    ->requireId()
            )
            ->findOrFail(
                $id
            );
    }

    private function findMedia(
        ChecklistRecord $checklist,
        string $mediaId
    ): ChecklistMedia {
        return ChecklistMedia::query()
            ->where(
                'tenant_id',
                $checklist->tenant_id
            )
            ->where(
                'checklist_record_id',
                $checklist->id
            )
            ->findOrFail(
                $mediaId
            );
    }

    private function ensureStored(
        ChecklistMedia $media
    ): void {
        if(
            !$media->arquivo_path ||
            !Storage::disk('local')
                ->exists(
                    $media->arquivo_path
                )
        ){
            abort(
                404,
                'Evidência não encontrada.'
            );
        }
    }
}