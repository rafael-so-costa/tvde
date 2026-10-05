<?php

namespace App\Http\Controllers;

use App\Models\ChatAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ChatAttachmentController extends Controller
{
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
    ): ChatAttachment {
        $attachment=
            ChatAttachment::query()
                ->whereKey($id)
                ->whereHas(
                    'message.conversation.participants',
                    fn($query)=>
                        $query->where(
                            'user_id',
                            $request
                                ->user()
                                ->id
                        )
                )
                ->firstOrFail();

        if(
            !Storage::disk(
                $attachment->disk
            )->exists(
                $attachment->path
            )
        ){
            abort(
                404,
                'Ficheiro não encontrado.'
            );
        }

        return $attachment;
    }

    private function filename(
        ChatAttachment $attachment
    ): string {
        return str_replace(
            [
                "\r",
                "\n",
                '"',
            ],
            [
                '',
                '',
                '',
            ],
            $attachment
                ->original_name
        );
    }
}
