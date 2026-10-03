<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBackofficeCrmTagRequest;
use App\Http\Requests\UpdateBackofficeCrmTagRequest;
use App\Models\CrmTag;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class BackofficeCrmTagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags =
            CrmTag::query()
                ->withCount(
                    'leads'
                )
                ->orderByDesc(
                    'is_active'
                )
                ->orderBy(
                    'name'
                )
                ->get();

        return response()->json([
            'data' => $tags
                ->map(
                    fn (
                        CrmTag $tag
                    ): array => $this->serialize(
                        $tag
                    )
                )
                ->values(),
        ]);
    }

    public function store(
        StoreBackofficeCrmTagRequest $request
    ): JsonResponse {
        $data =
            $request->validated();

        $slug =
            $this->uniqueSlug(
                $data['name']
            );

        $tag =
            CrmTag::create([
                ...$data,

                'slug' => $slug,
            ]);

        return response()->json([
            'message' => 'Tag criada com sucesso.',

            'data' => $this->serialize(
                $tag
            ),
        ], 201);
    }

    public function update(
        UpdateBackofficeCrmTagRequest $request,
        string $id
    ): JsonResponse {
        $tag =
            CrmTag::query()
                ->findOrFail(
                    $id
                );

        $data =
            $request->validated();

        if (
            isset(
                $data['name']
            ) &&
            $data['name'] !==
                $tag->name
        ) {
            $data['slug'] =
                $this->uniqueSlug(
                    $data['name'],
                    $tag->id
                );
        }

        $tag->fill(
            $data
        );

        $tag->save();

        return response()->json([
            'message' => 'Tag atualizada com sucesso.',

            'data' => $this->serialize(
                $tag
            ),
        ]);
    }

    public function destroy(
        string $id
    ): JsonResponse {
        $tag =
            CrmTag::query()
                ->withCount(
                    'leads'
                )
                ->findOrFail(
                    $id
                );

        if (
            $tag->leads_count > 0
        ) {
            $tag->is_active =
                false;

            $tag->save();

            return response()->json([
                'message' => 'A tag possui leads associados e foi desativada em vez de eliminada.',

                'data' => $this->serialize(
                    $tag
                ),
            ]);
        }

        $tag->delete();

        return response()->json([
            'message' => 'Tag eliminada com sucesso.',
        ]);
    }

    private function uniqueSlug(
        string $name,
        ?string $ignoreId = null
    ): string {
        $base =
            Str::slug(
                $name
            );

        if ($base === '') {
            $base = 'tag';
        }

        $base =
            Str::limit(
                $base,
                100,
                ''
            );

        $slug =
            $base;

        $suffix = 2;

        while (
            CrmTag::query()
                ->where(
                    'slug',
                    $slug
                )
                ->when(
                    $ignoreId,
                    fn ($query) => $query->where(
                        'id',
                        '!=',
                        $ignoreId
                    )
                )
                ->exists()
        ) {
            $suffixText =
                '-'.$suffix;

            $slug =
                Str::limit(
                    $base,
                    120 -
                        strlen(
                            $suffixText
                        ),
                    ''
                )
                .$suffixText;

            $suffix++;
        }

        return $slug;
    }

    private function serialize(
        CrmTag $tag
    ): array {
        return [
            'id' => $tag->id,

            'name' => $tag->name,

            'slug' => $tag->slug,

            'color' => $tag->color,

            'description' => $tag->description,

            'is_active' => $tag->is_active,

            'leads_count' => $tag
                ->leads_count
                ?? $tag
                    ->leads()
                    ->count(),

            'created_at' => $tag->created_at,

            'updated_at' => $tag->updated_at,
        ];
    }
}
