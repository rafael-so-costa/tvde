<?php

namespace App\Http\Controllers\Backoffice\Ads;

use App\Http\Controllers\Controller;
use App\Models\AdCampaign;
use App\Models\AdCreative;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BackofficeAdCreativeController extends Controller
{
    public function store(
        Request $request,
        string $campaignId
    ): JsonResponse {
        $campaign = AdCampaign::query()
            ->findOrFail(
                $campaignId
            );

        $data = $this->validatedData(
            $request
        );

        $data['campaign_id'] =
            $campaign->id;

        $data = $this->normalizeDestination(
            $data
        );

        $data = $this->storeMedia(
            $request,
            $campaign->id,
            $data
        );

        $creative = AdCreative::create(
            $data
        );

        return response()->json([
            'message' => 'Criativo criado com sucesso.',
            'data' => $creative,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $creative = AdCreative::query()
            ->findOrFail(
                $id
            );

        $data = $this->validatedData(
            $request
        );

        $data = $this->normalizeDestination(
            $data
        );

        $data = $this->storeMedia(
            $request,
            $creative->campaign_id,
            $data,
            $creative
        );

        $creative->fill(
            $data
        );

        $creative->save();

        return response()->json([
            'message' => 'Criativo atualizado com sucesso.',
            'data' => $creative->fresh(),
        ]);
    }

    public function destroy(
        string $id
    ): JsonResponse {
        $creative = AdCreative::query()
            ->findOrFail(
                $id
            );

        $this->deleteMedia(
            $creative
        );

        $creative->delete();

        return response()->json([
            'message' => 'Criativo eliminado.',
        ]);
    }

    private function validatedData(
        Request $request
    ): array {
        return $request->validate([
            'type' => [
                'required',
                Rule::in([
                    'native_card',
                    'banner',
                    'offer',
                    'sponsorship',
                ]),
            ],

            'media_type' => [
                'required',
                Rule::in(
                    AdCreative::mediaTypes()
                ),
            ],

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'headline' => [
                'required',
                'string',
                'max:255',
            ],

            'body' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'cta_label' => [
                'nullable',
                'string',
                'max:80',
            ],

            'destination_type' => [
                'required',
                Rule::in(
                    AdCreative::destinationTypes()
                ),
            ],

            'target_url' => [
                'nullable',
                'string',
                'max:2048',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:50',
            ],

            'whatsapp' => [
                'nullable',
                'string',
                'max:50',
            ],

            'whatsapp_message' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'image' => [
                'nullable',
                'image',
                'max:5120',
            ],

            'mobile_image' => [
                'nullable',
                'image',
                'max:5120',
            ],

            'video' => [
                'nullable',
                'file',
                'mimetypes:video/mp4,video/webm',
                'max:102400',
            ],

            'video_url' => [
                'nullable',
                'url',
                'max:2048',
            ],

            'alt_text' => [
                'nullable',
                'string',
                'max:255',
            ],

            'active' => [
                'required',
                'boolean',
            ],

            'sort_order' => [
                'required',
                'integer',
                'min:0',
            ],

            'metadata' => [
                'nullable',
                'array',
            ],
        ]);
    }

    private function normalizeDestination(
        array $data
    ): array {
        $type =
            $data['destination_type'];

        if (
            $type ===
            AdCreative::DESTINATION_NONE
        ) {
            $data['target_url'] = null;
            $data['phone'] = null;
            $data['whatsapp'] = null;
            $data['whatsapp_message'] = null;

            return $data;
        }

        if (
            $type ===
            AdCreative::DESTINATION_WEBSITE
        ) {
            $url = trim(
                (string) (
                    $data['target_url']
                    ?? ''
                )
            );

            if (
                ! $url ||
                ! filter_var(
                    $url,
                    FILTER_VALIDATE_URL
                ) ||
                ! preg_match(
                    '#^https?://#i',
                    $url
                )
            ) {
                throw ValidationException::withMessages([
                    'target_url' => 'Informe uma URL válida iniciada por http:// ou https://.',
                ]);
            }

            $data['target_url'] = $url;
            $data['phone'] = null;
            $data['whatsapp'] = null;
            $data['whatsapp_message'] = null;

            return $data;
        }

        if (
            $type ===
            AdCreative::DESTINATION_WHATSAPP
        ) {
            $number =
                $this->normalizePhone(
                    $data['whatsapp']
                    ?? null
                );

            if (! $number) {
                throw ValidationException::withMessages([
                    'whatsapp' => 'Informe o número WhatsApp com indicativo internacional.',
                ]);
            }

            $message = trim(
                (string) (
                    $data['whatsapp_message']
                    ?? ''
                )
            );

            $url =
                'https://wa.me/'.
                $number;

            if ($message !== '') {
                $url .=
                    '?text='.
                    rawurlencode(
                        $message
                    );
            }

            $data['whatsapp'] =
                $number;

            $data['target_url'] =
                $url;

            $data['phone'] = null;

            return $data;
        }

        $number =
            $this->normalizePhone(
                $data['phone']
                ?? null
            );

        if (! $number) {
            throw ValidationException::withMessages([
                'phone' => 'Informe um número de telefone válido com indicativo internacional.',
            ]);
        }

        $data['phone'] =
            $number;

        $data['target_url'] =
            'tel:+'.$number;

        $data['whatsapp'] = null;
        $data['whatsapp_message'] = null;

        return $data;
    }

    private function normalizePhone(
        ?string $value
    ): ?string {
        if (! $value) {
            return null;
        }

        $number = preg_replace(
            '/\D+/',
            '',
            $value
        );

        if (
            str_starts_with(
                $number,
                '00'
            )
        ) {
            $number =
                substr(
                    $number,
                    2
                );
        }

        if (
            strlen($number) < 8 ||
            strlen($number) > 15
        ) {
            return null;
        }

        return $number;
    }

    private function storeMedia(
        Request $request,
        string $campaignId,
        array $data,
        ?AdCreative $creative = null
    ): array {
        if (
            $request->hasFile(
                'image'
            )
        ) {
            if (
                $creative?->image_path
            ) {
                Storage::disk(
                    'public'
                )->delete(
                    $creative->image_path
                );
            }

            $data['image_path'] =
                $request
                    ->file('image')
                    ->store(
                        "ads/{$campaignId}",
                        'public'
                    );
        }

        if (
            $request->hasFile(
                'mobile_image'
            )
        ) {
            if (
                $creative
                    ?->mobile_image_path
            ) {
                Storage::disk(
                    'public'
                )->delete(
                    $creative
                        ->mobile_image_path
                );
            }

            $data['mobile_image_path'] =
                $request
                    ->file(
                        'mobile_image'
                    )
                    ->store(
                        "ads/{$campaignId}",
                        'public'
                    );
        }

        if (
            $request->hasFile(
                'video'
            )
        ) {
            if (
                $creative?->video_path
            ) {
                Storage::disk(
                    'public'
                )->delete(
                    $creative->video_path
                );
            }

            $data['video_path'] =
                $request
                    ->file('video')
                    ->store(
                        "ads/{$campaignId}",
                        'public'
                    );
        }

        unset(
            $data['image'],
            $data['mobile_image'],
            $data['video']
        );

        return $data;
    }

    private function deleteMedia(
        AdCreative $creative
    ): void {
        foreach ([
            $creative->image_path,
            $creative->mobile_image_path,
            $creative->video_path,
        ] as $path) {
            if ($path) {
                Storage::disk(
                    'public'
                )->delete(
                    $path
                );
            }
        }
    }
}
