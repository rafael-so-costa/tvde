<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\Documento;
use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\User;
use App\Models\UserFavorite;
use App\Models\Veiculo;

class ProductivityService
{
    private const TYPES = [
        'empresa' => 'empresas',
        'proprietario' => 'proprietarios',
        'motorista' => 'motoristas',
        'veiculo' => 'veiculos',
        'contrato' => 'contratos',
        'documento' => 'documentos',
    ];

    public function __construct(
        private PermissionService $permissionService
    ) {}

    public function search(
        User $user,
        string $tenantId,
        string $term,
        int $limit = 5
    ): array {
        $term = trim($term);
        $like = '%'.$term.'%';

        $results = [];

        if (
            $this->allowed(
                $user,
                $tenantId,
                'empresa'
            )
        ) {
            $items = Empresa::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    function ($query) use ($like) {
                        $query
                            ->where(
                                'nome_empresa',
                                'like',
                                $like
                            )
                            ->orWhere(
                                'nif',
                                'like',
                                $like
                            )
                            ->orWhere(
                                'email',
                                'like',
                                $like
                            )
                            ->orWhere(
                                'nome_gerente',
                                'like',
                                $like
                            );
                    }
                )
                ->limit($limit)
                ->get();

            foreach ($items as $item) {
                $results[] =
                    $this->empresaResult(
                        $item
                    );
            }
        }

        if (
            $this->allowed(
                $user,
                $tenantId,
                'proprietario'
            )
        ) {
            $items =
                Proprietario::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        function ($query) use ($like) {
                            $query
                                ->where(
                                    'nome_completo',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'nome_empresa',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'nif',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'email',
                                    'like',
                                    $like
                                );
                        }
                    )
                    ->limit($limit)
                    ->get();

            foreach ($items as $item) {
                $results[] =
                    $this->proprietarioResult(
                        $item
                    );
            }
        }

        if (
            $this->allowed(
                $user,
                $tenantId,
                'motorista'
            )
        ) {
            $items =
                Motorista::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        function ($query) use ($like) {
                            $query
                                ->where(
                                    'nome_completo',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'nif',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'email',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'telemovel',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'carta_numero',
                                    'like',
                                    $like
                                );
                        }
                    )
                    ->limit($limit)
                    ->get();

            foreach ($items as $item) {
                $results[] =
                    $this->motoristaResult(
                        $item
                    );
            }
        }

        if (
            $this->allowed(
                $user,
                $tenantId,
                'veiculo'
            )
        ) {
            $items =
                Veiculo::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        function ($query) use ($like) {
                            $query
                                ->where(
                                    'matricula',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'marca',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'modelo',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'chassi',
                                    'like',
                                    $like
                                );
                        }
                    )
                    ->limit($limit)
                    ->get();

            foreach ($items as $item) {
                $results[] =
                    $this->veiculoResult(
                        $item
                    );
            }
        }

        if (
            $this->allowed(
                $user,
                $tenantId,
                'contrato'
            )
        ) {
            $items =
                Contrato::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->with([
                        'motorista:id,nome_completo',
                        'veiculo:id,matricula,marca,modelo',
                        'tipoContrato:id,nome',
                    ])
                    ->where(
                        function ($query) use ($like) {
                            $query
                                ->where(
                                    'id',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'tipo',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'status',
                                    'like',
                                    $like
                                )
                                ->orWhereHas(
                                    'motorista',
                                    fn ($query) => $query->where(
                                        'nome_completo',
                                        'like',
                                        $like
                                    )
                                )
                                ->orWhereHas(
                                    'veiculo',
                                    fn ($query) => $query->where(
                                        'matricula',
                                        'like',
                                        $like
                                    )
                                )
                                ->orWhereHas(
                                    'tipoContrato',
                                    fn ($query) => $query->where(
                                        'nome',
                                        'like',
                                        $like
                                    )
                                );
                        }
                    )
                    ->limit($limit)
                    ->get();

            foreach ($items as $item) {
                $results[] =
                    $this->contratoResult(
                        $item
                    );
            }
        }

        if (
            $this->allowed(
                $user,
                $tenantId,
                'documento'
            )
        ) {
            $items =
                Documento::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        function ($query) use ($like) {
                            $query
                                ->where(
                                    'codigo',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'titulo',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'arquivo_nome',
                                    'like',
                                    $like
                                )
                                ->orWhere(
                                    'tipo',
                                    'like',
                                    $like
                                );
                        }
                    )
                    ->limit($limit)
                    ->get();

            foreach ($items as $item) {
                $results[] =
                    $this->documentoResult(
                        $item
                    );
            }
        }

        return $this->attachFavorites(
            $user,
            $tenantId,
            $results
        );
    }

    public function favorites(
        User $user,
        string $tenantId
    ): array {
        $favorites =
            UserFavorite::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->latest()
                ->get();

        $items = [];

        foreach ($favorites as $favorite) {
            if (
                ! $this->allowed(
                    $user,
                    $tenantId,
                    $favorite->entity_type
                )
            ) {
                continue;
            }

            $result =
                $this->resolve(
                    $favorite->entity_type,
                    $favorite->entity_id,
                    $tenantId
                );

            if (! $result) {
                continue;
            }

            $result['favorite_id'] =
                $favorite->id;

            $items[] = $result;
        }

        return $items;
    }

    public function favorite(
        User $user,
        string $tenantId,
        string $type,
        string $entityId
    ): array {
        if (
            ! $this->allowed(
                $user,
                $tenantId,
                $type
            )
        ) {
            abort(
                403,
                'Sem permissão para favoritar este recurso.'
            );
        }

        $result =
            $this->resolve(
                $type,
                $entityId,
                $tenantId
            );

        if (! $result) {
            abort(404);
        }

        $favorite =
            UserFavorite::query()
                ->firstOrCreate(
                    [
                        'tenant_id' => $tenantId,

                        'user_id' => $user->id,

                        'entity_type' => $type,

                        'entity_id' => $entityId,
                    ]
                );

        $result['favorite_id'] =
            $favorite->id;

        return [
            'data' => $result,
            'created' => $favorite
                ->wasRecentlyCreated,
        ];
    }

    public function removeFavorite(
        User $user,
        string $tenantId,
        string $favoriteId
    ): void {
        $favorite =
            UserFavorite::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->findOrFail(
                    $favoriteId
                );

        $favorite->delete();
    }

    private function allowed(
        User $user,
        string $tenantId,
        string $type
    ): bool {
        $permission =
            self::TYPES[$type] ??
            null;

        if (! $permission) {
            return false;
        }

        return $this
            ->permissionService
            ->allows(
                $user,
                $permission,
                'visualizar',
                $tenantId
            );
    }

    private function attachFavorites(
        User $user,
        string $tenantId,
        array $results
    ): array {
        if ($results === []) {
            return [];
        }

        $favorites =
            UserFavorite::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'user_id',
                    $user->id
                )
                ->get()
                ->keyBy(
                    fn (UserFavorite $favorite) => $favorite->entity_type.
                        ':'.
                        $favorite->entity_id
                );

        foreach ($results as &$result) {
            $key =
                $result['entity_type'].
                ':'.
                $result['entity_id'];

            $result['favorite_id'] =
                $favorites
                    ->get($key)
                    ?->id;
        }

        unset($result);

        return $results;
    }

    private function resolve(
        string $type,
        string $id,
        string $tenantId
    ): ?array {
        return match ($type) {
            'empresa' => $this->resolveEmpresa(
                $id,
                $tenantId
            ),

            'proprietario' => $this->resolveProprietario(
                $id,
                $tenantId
            ),

            'motorista' => $this->resolveMotorista(
                $id,
                $tenantId
            ),

            'veiculo' => $this->resolveVeiculo(
                $id,
                $tenantId
            ),

            'contrato' => $this->resolveContrato(
                $id,
                $tenantId
            ),

            'documento' => $this->resolveDocumento(
                $id,
                $tenantId
            ),

            default => null,
        };
    }

    private function resolveEmpresa(
        string $id,
        string $tenantId
    ): ?array {
        $model =
            Empresa::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->find($id);

        return $model
            ? $this->empresaResult($model)
            : null;
    }

    private function resolveProprietario(
        string $id,
        string $tenantId
    ): ?array {
        $model =
            Proprietario::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->find($id);

        return $model
            ? $this->proprietarioResult(
                $model
            )
            : null;
    }

    private function resolveMotorista(
        string $id,
        string $tenantId
    ): ?array {
        $model =
            Motorista::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->find($id);

        return $model
            ? $this->motoristaResult(
                $model
            )
            : null;
    }

    private function resolveVeiculo(
        string $id,
        string $tenantId
    ): ?array {
        $model =
            Veiculo::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->find($id);

        return $model
            ? $this->veiculoResult(
                $model
            )
            : null;
    }

    private function resolveContrato(
        string $id,
        string $tenantId
    ): ?array {
        $model =
            Contrato::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->with([
                    'motorista:id,nome_completo',
                    'veiculo:id,matricula,marca,modelo',
                    'tipoContrato:id,nome',
                ])
                ->find($id);

        return $model
            ? $this->contratoResult(
                $model
            )
            : null;
    }

    private function resolveDocumento(
        string $id,
        string $tenantId
    ): ?array {
        $model =
            Documento::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->find($id);

        return $model
            ? $this->documentoResult(
                $model
            )
            : null;
    }

    private function empresaResult(
        Empresa $model
    ): array {
        return [
            'entity_type' => 'empresa',
            'entity_id' => $model->id,
            'category' => 'Empresas',
            'title' => $model->nome_empresa,
            'subtitle' => $this->subtitle([
                $model->nif,
                $model->email,
            ]),
            'url' => '/empresas?q='.
                rawurlencode(
                    $model->nome_empresa
                ),
        ];
    }

    private function proprietarioResult(
        Proprietario $model
    ): array {
        $name =
            $model->nome_empresa
            ?: $model->nome_completo
            ?: 'Proprietário';

        return [
            'entity_type' => 'proprietario',

            'entity_id' => $model->id,

            'category' => 'Proprietários',

            'title' => $name,

            'subtitle' => $this->subtitle([
                $model->nif,
                $model->email,
            ]),

            'url' => '/proprietarios?q='.
                rawurlencode(
                    $name
                ),
        ];
    }

    private function motoristaResult(
        Motorista $model
    ): array {
        return [
            'entity_type' => 'motorista',

            'entity_id' => $model->id,

            'category' => 'Motoristas',

            'title' => $model->nome_completo,

            'subtitle' => $this->subtitle([
                $model->nif,
                $model->email,
            ]),

            'url' => '/motoristas?q='.
                rawurlencode(
                    $model->nome_completo
                ),
        ];
    }

    private function veiculoResult(
        Veiculo $model
    ): array {
        return [
            'entity_type' => 'veiculo',

            'entity_id' => $model->id,

            'category' => 'Veículos',

            'title' => $model->matricula,

            'subtitle' => $this->subtitle([
                trim(
                    $model->marca.
                    ' '.
                    $model->modelo
                ),
            ]),

            'url' => '/veiculos?q='.
                rawurlencode(
                    $model->matricula
                ),
        ];
    }

    private function contratoResult(
        Contrato $model
    ): array {
        $type =
            $model->tipoContrato?->nome
            ?: str_replace(
                '_',
                ' ',
                $model->tipo
            );

        return [
            'entity_type' => 'contrato',

            'entity_id' => $model->id,

            'category' => 'Contratos',

            'title' => 'Contrato '.
                $type,

            'subtitle' => $this->subtitle([
                $model
                    ->motorista
                    ?->nome_completo,

                $model
                    ->veiculo
                    ?->matricula,

                ucfirst(
                    $model->status
                ),
            ]),

            'url' => '/contratos?contrato='.
                rawurlencode(
                    $model->id
                ),
        ];
    }

    private function documentoResult(
        Documento $model
    ): array {
        return [
            'entity_type' => 'documento',

            'entity_id' => $model->id,

            'category' => 'Documentos',

            'title' => $model->codigo.
                ' · '.
                $model->titulo,

            'subtitle' => $this->subtitle([
                ucfirst(
                    $model->origem
                ),
                str_replace(
                    '_',
                    ' ',
                    $model->tipo
                ),
            ]),

            'url' => '/documentos?documento='.
                rawurlencode(
                    $model->id
                ),
        ];
    }

    private function subtitle(
        array $values
    ): ?string {
        $values =
            array_values(
                array_filter(
                    array_map(
                        fn ($value) => filled($value)
                                ? trim(
                                    (string) $value
                                )
                                : null,
                        $values
                    )
                )
            );

        return $values !== []
            ? implode(
                ' · ',
                $values
            )
            : null;
    }
}
