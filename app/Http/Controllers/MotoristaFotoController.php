<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMotoristaFotoRequest;
use App\Models\Motorista;
use App\Services\PermissionService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class MotoristaFotoController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService
    ) {}

    public function show(
        Request $request,
        string $id
    ): BinaryFileResponse {
        $motorista =
            $this->findMotorista($id);

        $this->authorizeView(
            $request,
            $motorista
        );

        $path =
            $motorista->getRawOriginal(
                'foto_perfil_url'
            );

        if (
            blank($path) ||
            Str::startsWith(
                $path,
                [
                    'http://',
                    'https://',
                ]
            ) ||
            ! Storage::disk('local')
                ->exists($path)
        ) {
            abort(
                404,
                'Fotografia do motorista não encontrada.'
            );
        }

        $mime =
            Storage::disk('local')
                ->mimeType($path)
            ?: 'application/octet-stream';

        return response()->file(
            Storage::disk('local')
                ->path($path),
            [
                'Content-Type' => $mime,

                'Cache-Control' => 'private, max-age=3600',

                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }

    public function store(
        StoreMotoristaFotoRequest $request,
        string $id
    ): JsonResponse {
        $motorista =
            $this->findMotorista($id);

        $foto =
            $request->file('foto');

        $extension =
            strtolower(
                $foto->extension()
                ?: 'jpg'
            );

        $directory =
            'motoristas/'.
            $this->tenantId().
            '/'.
            $motorista->id.
            '/perfil';

        $filename =
            Str::uuid()->toString().
            '.'.
            $extension;

        $path =
            $foto->storeAs(
                $directory,
                $filename,
                'local'
            );

        if (! $path) {
            throw new RuntimeException(
                'Não foi possível guardar a fotografia do motorista.'
            );
        }

        $oldPath =
            $motorista->getRawOriginal(
                'foto_perfil_url'
            );

        try {
            $motorista->foto_perfil_url =
                $path;

            $motorista->sincronizarCadastro();
            $motorista->save();
        } catch (Throwable $exception) {
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }

        if (
            filled($oldPath) &&
            $oldPath !== $path &&
            ! Str::startsWith(
                $oldPath,
                [
                    'http://',
                    'https://',
                ]
            )
        ) {
            Storage::disk('local')
                ->delete($oldPath);
        }

        return response()->json([
            'message' => 'Fotografia do motorista atualizada com sucesso.',

            'data' => $motorista->fresh(),
        ]);
    }

    private function authorizeView(
        Request $request,
        Motorista $motorista
    ): void {
        $tenantId =
            $this->tenantId();

        $user =
            $request->user();

        if (
            $this->permissionService
                ->allows(
                    $user,
                    'motoristas',
                    'visualizar',
                    $tenantId
                )
        ) {
            return;
        }

        if (
            $user->hasRole(
                'motorista',
                $tenantId
            ) &&
            $motorista->user_id ===
                $user->id
        ) {
            return;
        }

        abort(
            403,
            'Sem permissão para visualizar esta fotografia.'
        );
    }

    private function findMotorista(
        string $id
    ): Motorista {
        return Motorista::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->findOrFail($id);
    }

    private function tenantId(): string
    {
        return $this->tenantContext
            ->requireId();
    }
}
