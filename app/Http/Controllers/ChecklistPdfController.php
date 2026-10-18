<?php

namespace App\Http\Controllers;

use App\Models\ChecklistRecord;
use App\Services\ChecklistPdfService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ChecklistPdfController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private ChecklistPdfService $pdfService
    ) {}

    public function generate(
        string $id
    ): JsonResponse {
        $result=
            $this
                ->pdfService
                ->generate(
                    $this->find(
                        $id
                    )
                );

        return response()->json([
            'message'=>
                'PDF do checklist gerado com sucesso.',

            'data'=>[
                'checklist'=>
                    $result[
                        'checklist'
                    ],

                'codigo'=>
                    $result[
                        'documento'
                    ]?->codigo,

                'numero_global'=>
                    $result[
                        'documento'
                    ]?->numero_global,

                'codigo_entrega'=>
                    $result[
                        'entrega_documento'
                    ]?->codigo,
            ],
        ]);
    }

    public function pdf(
        string $id
    ): BinaryFileResponse {
        $result=
            $this
                ->pdfService
                ->prepare(
                    $this->find(
                        $id
                    )
                );

        $checklist=
            $result[
                'checklist'
            ];

        return response()->file(
            Storage::disk('local')
                ->path(
                    $checklist
                        ->pdf_url
                ),
            [
                'Content-Type'=>
                    'application/pdf',

                'Content-Disposition'=>
                    'inline; filename="'.
                    $this->filename(
                        $result
                    ).
                    '"',
            ]
        );
    }

    public function download(
        string $id
    ): BinaryFileResponse {
        $result=
            $this
                ->pdfService
                ->prepare(
                    $this->find(
                        $id
                    )
                );

        return response()->download(
            Storage::disk('local')
                ->path(
                    $result[
                        'checklist'
                    ]->pdf_url
                ),
            $this->filename(
                $result
            ),
            [
                'Content-Type'=>
                    'application/pdf',
            ]
        );
    }

    private function find(
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

    private function filename(
        array $result
    ): string {
        $checklist=
            $result[
                'checklist'
            ];

        $codigo=
            $result[
                'documento'
            ]?->codigo
            ?: substr(
                $checklist->id,
                0,
                8
            );

        return 'checklist-'.
            Str::slug(
                $checklist->tipo
            ).
            '-'.
            $codigo.
            '.pdf';
    }
}