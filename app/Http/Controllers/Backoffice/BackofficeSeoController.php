<?php

namespace App\Http\Controllers\Backoffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSeoConfiguracaoRequest;
use App\Models\SeoConfiguracao;
use App\Services\SeoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BackofficeSeoController extends Controller
{
    public function index(
        SeoService $service
    ): JsonResponse {
        $presets=
            $service->presets();

        $resolved=[];

        foreach(
            array_keys($presets)
            as $key
        ){
            $resolved[$key]=
                $service->resolve(
                    $key
                );
        }

        return response()->json([
            'data'=>
                SeoConfiguracao::query()
                    ->orderBy(
                        'chave'
                    )
                    ->get(),

            'presets'=>$presets,

            'resolved'=>$resolved,
        ]);
    }

    public function update(
        StoreSeoConfiguracaoRequest $request,
        string $chave,
        SeoService $service
    ): JsonResponse {
        $config=
            $service->upsert(
                $chave,
                $request->validated(),
                $request->user()
            );

        return response()->json([
            'message'=>
                'SEO atualizado com sucesso.',

            'data'=>$config,

            'resolved'=>
                $service->resolve(
                    $chave
                ),
        ]);
    }

    public function uploadAsset(
        Request $request,
        SeoService $service
    ): JsonResponse {
        $validated=
            $request->validate([
                'kind'=>[
                    'required',
                    Rule::in([
                        'favicon',
                        'social',
                    ]),
                ],

                'image'=>[
                    'required',
                    'file',
                    'mimes:png,jpg,jpeg,webp,ico',
                    'max:8192',
                ],
            ]);

        $kind=
            $validated['kind'];

        $field=
            $kind==='favicon'
                ? 'favicon_path'
                : 'social_image_path';

        $config=
            SeoConfiguracao::query()
                ->firstOrNew([
                    'chave'=>'global',
                ]);

        $oldPath=
            $config->{$field};

        $file=
            $request->file(
                'image'
            );

        $extension=
            strtolower(
                $file->getClientOriginalExtension()
            );

        $path=
            $file->storeAs(
                'seo/site',
                $kind
                    .'-'
                    .Str::uuid()
                    .'.'
                    .$extension,
                'public'
            );

        $config->{$field}=
            $path;

        $config->updated_by=
            $request->user()->id;

        $config->save();

        if(
            $oldPath &&
            $oldPath!==$path &&
            Str::startsWith(
                $oldPath,
                'seo/'
            )
        ){
            Storage::disk(
                'public'
            )->delete(
                $oldPath
            );
        }

        return response()->json([
            'message'=>
                $kind==='favicon'
                    ? 'Favicon atualizado com sucesso.'
                    : 'Imagem social padrão atualizada com sucesso.',

            'data'=>[
                'kind'=>$kind,
                'path'=>$path,
                'url'=>$service->assetUrl(
                    $path
                ),
            ],

            'resolved'=>
                $service->resolve(
                    'global'
                ),
        ]);
    }
}