<?php

namespace App\Http\Controllers;

use App\Models\HelpdeskAttachment;
use App\Services\HelpdeskService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HelpdeskAttachmentController extends Controller
{
    public function __construct(
        private HelpdeskService $service
    ){}

    public function show(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $attachment=
            $this->attachment(
                $request,
                $id
            );

        $response=
            response()->file(
                Storage::disk(
                    $attachment->disk
                )->path(
                    $attachment->path
                ),
                [
                    'Content-Type'=>
                        $attachment
                            ->mime_type,
                ]
            );

        $response
            ->headers
            ->set(
                'Content-Disposition',
                'inline; filename="'.
                $this->filename(
                    $attachment
                ).
                '"'
            );

        return $response;
    }

    public function download(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $attachment=
            $this->attachment(
                $request,
                $id
            );

        return response()->download(
            Storage::disk(
                $attachment->disk
            )->path(
                $attachment->path
            ),
            $this->filename(
                $attachment
            ),
            [
                'Content-Type'=>
                    $attachment
                        ->mime_type,
            ]
        );
    }

    private function attachment(
        Request $request,
        string $id
    ): HelpdeskAttachment {
        return $this
            ->service
            ->attachmentForUser(
                $request->user(),
                $id
            );
    }

    private function filename(
        HelpdeskAttachment $attachment
    ): string {
        return str_replace(
            [
                "\r",
                "\n",
                '"',
            ],
            '',
            $attachment
                ->original_name
        );
    }
}
