<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmpresaLogoRequest;
use App\Models\Empresa;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class EmpresaLogoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext
    ) {}

    public function show(string $id): BinaryFileResponse
    {
        $empresa = $this->findEmpresa($id);

        $path = $empresa->getRawOriginal('logo_url');

        if (
            ! is_string($path) ||
            ! Str::startsWith(
                $path,
                $this->directory($empresa).'/'
            ) ||
            ! Storage::disk('local')->exists($path)
        ) {
            abort(404, 'Logótipo não encontrado.');
        }

        $extension = strtolower(pathinfo(
            $path,
            PATHINFO_EXTENSION
        ));

        $mime = match ($extension) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => abort(404),
        };

                $response = response()->file(
            Storage::disk('local')->path($path),
            [
                'Content-Type' => $mime,
                'X-Content-Type-Options' => 'nosniff',
            ]
        );

        $response->headers->set('Cache-Control', 'no-store');
        $response->setPrivate();

        return $response;
    }

    public function store(
        StoreEmpresaLogoRequest $request,
        string $id
    ): JsonResponse {
        $empresa = $this->findEmpresa($id);

        $file = $request->file('logo');

        $extension = strtolower(
            $file->extension() ?: 'png'
        );

        $directory = $this->directory($empresa);

        $path = $file->storeAs(
            $directory,
            Str::uuid()->toString().'.'.$extension,
            'local'
        );

        if (! $path) {
            throw new RuntimeException(
                'Não foi possível guardar o logótipo.'
            );
        }

        $oldPath = $empresa->getRawOriginal('logo_url');

        try {
            $empresa->logo_url = $path;
            $empresa->save();
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if (
            is_string($oldPath) &&
            $oldPath !== $path &&
            Str::startsWith(
                $oldPath,
                $directory.'/'
            )
        ) {
            Storage::disk('local')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Logótipo atualizado com sucesso.',
            'data' => $empresa->fresh(),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $empresa = $this->findEmpresa($id);

        $directory = $this->directory($empresa);

        $oldPath = $empresa->getRawOriginal('logo_url');

        $empresa->logo_url = null;
        $empresa->save();

        if (
            is_string($oldPath) &&
            Str::startsWith(
                $oldPath,
                $directory.'/'
            )
        ) {
            Storage::disk('local')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Logótipo removido com sucesso.',
            'data' => $empresa->fresh(),
        ]);
    }

    private function findEmpresa(string $id): Empresa
    {
        return Empresa::query()
            ->where(
                'tenant_id',
                $this->tenantContext->requireId()
            )
            ->findOrFail($id);
    }

    private function directory(Empresa $empresa): string
    {
        return 'empresas/'.
            $this->tenantContext->requireId().'/'.
            $empresa->id.
            '/logo';
    }
}