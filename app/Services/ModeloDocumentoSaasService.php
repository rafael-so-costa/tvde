<?php

namespace App\Services;

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Models\ModeloDocumentoSaasVersao;
use App\Models\TemplateContrato;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ModeloDocumentoSaasService
{
    public function __construct(
        private TemplateTextAnalyzerService $analyzer,
        private TemplateSourceCatalog $sourceCatalog
    ) {}

    public function categories(): array
    {
        return ModeloDocumentoSaasCategoria::query()
            ->withCount('modelos')
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get()
            ->toArray();
    }

    public function storeCategory(
        User $user,
        array $data
    ): ModeloDocumentoSaasCategoria {
        $category =
            new ModeloDocumentoSaasCategoria();

        $category->fill([
            'nome' =>
            trim($data['nome']),

            'slug' =>
            $this->uniqueCategorySlug(
                $data['slug'] ??
                    $data['nome']
            ),

            'descricao' =>
            $data['descricao'] ??
                null,

            'ordem' =>
            $data['ordem'] ??
                0,

            'ativo' =>
            $data['ativo'] ??
                true,

            'created_by_user_id' =>
            $user->id,

            'updated_by_user_id' =>
            $user->id,
        ]);

        $category->save();

        return $category;
    }

    public function updateCategory(
        User $user,
        string $id,
        array $data
    ): ModeloDocumentoSaasCategoria {
        $category =
            ModeloDocumentoSaasCategoria::query()
            ->findOrFail($id);

        if (
            array_key_exists(
                'nome',
                $data
            )
        ) {
            $category->nome =
                trim($data['nome']);
        }

        if (
            array_key_exists(
                'slug',
                $data
            )
        ) {
            $category->slug =
                $this->uniqueCategorySlug(
                    $data['slug'],
                    $category->id
                );
        }

        if (
            array_key_exists(
                'descricao',
                $data
            )
        ) {
            $category->descricao =
                $data['descricao'];
        }

        if (
            array_key_exists(
                'ordem',
                $data
            )
        ) {
            $category->ordem =
                $data['ordem'];
        }

        if (
            array_key_exists(
                'ativo',
                $data
            )
        ) {
            $category->ativo =
                $data['ativo'];
        }

        $category->updated_by_user_id =
            $user->id;

        $category->save();

        return $category;
    }

    public function destroyCategory(
        string $id
    ): void {
        $category =
            ModeloDocumentoSaasCategoria::query()
            ->withCount('modelos')
            ->findOrFail($id);

        if (
            $category->modelos_count >
            0
        ) {
            throw ValidationException::withMessages([
                'categoria' =>
                'A categoria possui modelos associados e não pode ser eliminada.',
            ]);
        }

        $category->delete();
    }

    public function backofficeIndex(
        array $filters = []
    ): array {
        $query =
            ModeloDocumentoSaas::query()
            ->with('categoria')
            ->withCount([
                'versoes',
                'templatesTenant',
            ]);

        if (
            !empty($filters['categoria_id'])
        ) {
            $query->where(
                'categoria_id',
                $filters['categoria_id']
            );
        }

        if (
            !empty($filters['status'])
        ) {
            $query->where(
                'status',
                $filters['status']
            );
        }

        if (
            array_key_exists(
                'ativo',
                $filters
            ) &&
            $filters['ativo'] !== null
        ) {
            $query->where(
                'ativo',
                (bool)$filters['ativo']
            );
        }

        if (
            !empty($filters['search'])
        ) {
            $search =
                trim(
                    $filters['search']
                );

            $query->where(
                function (
                    Builder $query
                ) use (
                    $search
                ): void {
                    $query
                        ->where(
                            'nome',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'resumo',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'descricao',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        return [
            'data' =>
            $query
                ->orderByDesc('destaque')
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get(),

            'categories' =>
            $this->categories(),
        ];
    }

    public function backofficeShow(
        string $id
    ): ModeloDocumentoSaas {
        return ModeloDocumentoSaas::query()
            ->with([
                'categoria',
                'versoes' =>
                fn($query) =>
                $query
                    ->orderByDesc(
                        'publicado_em'
                    ),
            ])
            ->withCount('templatesTenant')
            ->findOrFail($id);
    }

    public function storeModel(
        User $user,
        array $data
    ): ModeloDocumentoSaas {
        return DB::transaction(
            function () use (
                $user,
                $data
            ): ModeloDocumentoSaas {
                $analysis =
                    $this->analyze(
                        $data['conteudo']
                    );

                $model =
                    new ModeloDocumentoSaas();

                $model->fill([
                    'categoria_id' =>
                    $data['categoria_id'],

                    'nome' =>
                    trim(
                        $data['nome']
                    ),

                    'slug' =>
                    $this->uniqueModelSlug(
                        $data['slug'] ??
                            $data['nome']
                    ),

                    'resumo' =>
                    $data['resumo'] ??
                        null,

                    'descricao' =>
                    $data['descricao'] ??
                        null,

                    'tipo_documento' =>
                    $data['tipo_documento'] ?? null,

                    'pais' =>
                    $data['pais'] ??
                        'PT',

                    'idioma' =>
                    $data['idioma'] ??
                        'pt-PT',

                    'versao' =>
                    $data['versao'] ??
                        '1.0',

                    'juridicamente_revisto' =>
                    $data['juridicamente_revisto'] ?? false,

                    'destaque' =>
                    $data['destaque'] ??
                        false,

                    'ativo' =>
                    $data['ativo'] ??
                        true,

                    'ordem' =>
                    $data['ordem'] ??
                        0,

                    'status' =>
                    'rascunho',

                    'created_by_user_id' =>
                    $user->id,

                    'updated_by_user_id' =>
                    $user->id,
                ]);

                $this->applyAnalysis(
                    $model,
                    $data['conteudo'],
                    $analysis
                );

                $model->save();

                return $model->load(
                    'categoria'
                );
            }
        );
    }

    public function updateModel(
        User $user,
        string $id,
        array $data
    ): ModeloDocumentoSaas {
        return DB::transaction(
            function () use (
                $user,
                $id,
                $data
            ): ModeloDocumentoSaas {
                $model =
                    ModeloDocumentoSaas::query()
                    ->findOrFail($id);

                foreach (
                    [
                        'categoria_id',
                        'resumo',
                        'descricao',
                        'tipo_documento',
                        'pais',
                        'idioma',
                        'versao',
                        'juridicamente_revisto',
                        'destaque',
                        'ativo',
                        'ordem',
                    ]
                    as $field
                ) {
                    if (
                        array_key_exists(
                            $field,
                            $data
                        )
                    ) {
                        $model->{$field} =
                            $data[$field];
                    }
                }

                if (
                    array_key_exists(
                        'nome',
                        $data
                    )
                ) {
                    $model->nome =
                        trim(
                            $data['nome']
                        );
                }

                if (
                    array_key_exists(
                        'slug',
                        $data
                    ) &&
                    $data['slug'] !== null &&
                    trim(
                        (string)$data['slug']
                    ) !== ''
                ) {
                    $model->slug =
                        $this->uniqueModelSlug(
                            $data['slug'],
                            $model->id
                        );
                }

                if (
                    array_key_exists(
                        'conteudo',
                        $data
                    )
                ) {
                    $analysis =
                        $this->analyze(
                            $data['conteudo']
                        );

                    $this->applyAnalysis(
                        $model,
                        $data['conteudo'],
                        $analysis
                    );
                }

                $model->updated_by_user_id =
                    $user->id;

                $model->save();

                return $model->load([
                    'categoria',
                    'versoes' =>
                    fn($query) =>
                    $query
                        ->orderByDesc(
                            'publicado_em'
                        ),
                ]);
            }
        );
    }

    public function publish(
        User $user,
        string $id
    ): ModeloDocumentoSaasVersao {
        return DB::transaction(
            function () use (
                $user,
                $id
            ): ModeloDocumentoSaasVersao {
                $model =
                    ModeloDocumentoSaas::query()
                    ->with('categoria')
                    ->lockForUpdate()
                    ->findOrFail($id);

                if (
                    !$model->ativo
                ) {
                    throw ValidationException::withMessages([
                        'modelo' =>
                        'Ative o modelo antes de o publicar.',
                    ]);
                }

                if (
                    !$model->categoria ||
                    !$model->categoria->ativo
                ) {
                    throw ValidationException::withMessages([
                        'categoria' =>
                        'A categoria do modelo deve estar ativa antes da publicação.',
                    ]);
                }

                if (
                    !$model->tecnicamente_validado
                ) {
                    throw ValidationException::withMessages([
                        'modelo' =>
                        'O modelo não passou na validação técnica e não pode ser publicado.',
                    ]);
                }

                if (
                    !$model->conteudo ||
                    !$model->conteudo_parametrizado
                ) {
                    throw ValidationException::withMessages([
                        'conteudo' =>
                        'O modelo não possui conteúdo válido para publicação.',
                    ]);
                }

                $exists =
                    ModeloDocumentoSaasVersao::query()
                    ->where(
                        'modelo_documento_saas_id',
                        $model->id
                    )
                    ->where(
                        'versao',
                        $model->versao
                    )
                    ->exists();

                if ($exists) {
                    throw ValidationException::withMessages([
                        'versao' =>
                        "A versão {$model->versao} já foi publicada. Defina uma nova versão antes de publicar novamente.",
                    ]);
                }

                $publishedAt =
                    now();

                $version =
                    new ModeloDocumentoSaasVersao([
                        'modelo_documento_saas_id' =>
                        $model->id,

                        'versao' =>
                        $model->versao,

                        'conteudo_original' =>
                        $model->conteudo,

                        'conteudo_parametrizado' =>
                        $model
                            ->conteudo_parametrizado,

                        'campos_detectados' =>
                        $model
                            ->campos_detectados ??
                            [],

                        'campos_mapeados' =>
                        $model
                            ->campos_mapeados ??
                            [],

                        'entidades_requeridas' =>
                        $model
                            ->entidades_requeridas ??
                            [],

                        'assinaturas_requeridas' =>
                        $model
                            ->assinaturas_requeridas ??
                            [],

                        'checksum' =>
                        hash(
                            'sha256',
                            $model
                                ->conteudo_parametrizado
                        ),

                        'juridicamente_revisto' =>
                        $model
                            ->juridicamente_revisto,

                        'publicado_em' =>
                        $publishedAt,

                        'created_by_user_id' =>
                        $user->id,
                    ]);

                $version->save();

                $model->status =
                    'publicado';

                $model->versao_publicada =
                    $model->versao;

                $model->publicado_em =
                    $publishedAt;

                $model->updated_by_user_id =
                    $user->id;

                $model->save();

                return $version;
            }
        );
    }

    public function archive(
        User $user,
        string $id
    ): ModeloDocumentoSaas {
        $model =
            ModeloDocumentoSaas::query()
            ->findOrFail($id);

        $model->status =
            'arquivado';

        $model->ativo =
            false;

        $model->updated_by_user_id =
            $user->id;

        $model->save();

        return $model;
    }

    public function versions(
        string $id
    ): array {
        ModeloDocumentoSaas::query()
            ->findOrFail($id);

        return ModeloDocumentoSaasVersao::query()
            ->where(
                'modelo_documento_saas_id',
                $id
            )
            ->orderByDesc(
                'publicado_em'
            )
            ->get()
            ->toArray();
    }

    public function catalog(
        array $filters = []
    ): array {
        $query =
            ModeloDocumentoSaas::query()
            ->where(
                'status',
                'publicado'
            )
            ->where(
                'ativo',
                true
            )
            ->whereNotNull(
                'versao_publicada'
            )
            ->whereHas(
                'categoria',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->with([
                'categoria',

                'versoes' =>
                fn($query) =>
                $query->orderByDesc(
                    'publicado_em'
                ),
            ]);

        if (
            !empty($filters['categoria_id'])
        ) {
            $query->where(
                'categoria_id',
                $filters['categoria_id']
            );
        }

        if (
            !empty($filters['search'])
        ) {
            $search =
                trim(
                    $filters['search']
                );

            $query->where(
                function (
                    Builder $query
                ) use (
                    $search
                ): void {
                    $query
                        ->where(
                            'nome',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'resumo',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        return [
            'data' =>
            $query
                ->orderByDesc('destaque')
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get()
                ->map(
                    fn(
                        ModeloDocumentoSaas $model
                    ) =>
                    $this->catalogCard(
                        $model
                    )
                )
                ->values()
                ->all(),

            'categories' =>
            ModeloDocumentoSaasCategoria::query()
                ->where(
                    'ativo',
                    true
                )
                ->whereHas(
                    'modelos',
                    fn($query) =>
                    $query
                        ->where(
                            'status',
                            'publicado'
                        )
                        ->where(
                            'ativo',
                            true
                        )
                )
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get([
                    'id',
                    'nome',
                    'slug',
                    'descricao',
                ])
                ->toArray(),
        ];
    }

    public function catalogShow(
        string $id
    ): array {
        $model =
            $this->publishedModel(
                $id
            );

        $version =
            $this->publishedVersion(
                $model
            );

        return [
            'id' =>
            $model->id,

            'categoria' =>
            $model->categoria,

            'nome' =>
            $model->nome,

            'slug' =>
            $model->slug,

            'resumo' =>
            $model->resumo,

            'descricao' =>
            $model->descricao,

            'tipo_documento' =>
            $model->tipo_documento,

            'pais' =>
            $model->pais,

            'idioma' =>
            $model->idioma,

            'versao' =>
            $version->versao,

            'tecnicamente_validado' =>
            true,

            'juridicamente_revisto' =>
            $version
                ->juridicamente_revisto,

            'destaque' =>
            $model->destaque,

            'conteudo_parametrizado' =>
            $version
                ->conteudo_parametrizado,

            'campos_detectados' =>
            $version
                ->campos_detectados,

            'campos_mapeados' =>
            $version
                ->campos_mapeados,

            'entidades_requeridas' =>
            $version
                ->entidades_requeridas,

            'assinaturas_requeridas' =>
            $version
                ->assinaturas_requeridas,

            'checksum' =>
            $version->checksum,

            'publicado_em' =>
            $version->publicado_em,
        ];
    }

    public function copyToTenant(
        string $tenantId,
        string $id,
        array $data = []
    ): TemplateContrato {
        return DB::transaction(
            function () use (
                $tenantId,
                $id,
                $data
            ): TemplateContrato {
                $model =
                    $this->publishedModel(
                        $id
                    );

                $version =
                    $this->publishedVersion(
                        $model
                    );

                $template =
                    new TemplateContrato([
                        'perfil_id' =>
                        $data['perfil_id'] ?? null,

                        'nome' =>
                        trim(
                            $data['nome'] ??
                                $model->nome
                        ),

                        'tipo_arquivo' =>
                        'txt',

                        'conteudo_original' =>
                        $version
                            ->conteudo_parametrizado,

                        'campos_detectados' =>
                        $version
                            ->campos_detectados,

                        'campos_mapeados' =>
                        $version
                            ->campos_mapeados,
                    ]);

                $template->tenant_id =
                    $tenantId;

                $template->modelo_documento_saas_id =
                    $model->id;

                $template->modelo_documento_saas_versao_id =
                    $version->id;

                $template->modelo_documento_saas_versao =
                    $version->versao;

                $template->save();

                return $template->load([
                    'perfil:id,nome',
                    'modeloDocumentoSaas:id,nome,slug,versao_publicada',
                    'modeloDocumentoSaasVersaoOrigem:id,modelo_documento_saas_id,versao,checksum,publicado_em',
                ]);
            }
        );
    }

    private function analyze(
        string $content
    ): array {
        $analysis =
            $this->analyzer->analyze(
                $content
            );

        $warnings =
            $analysis['warnings'] ?? [];

        $mappings =
            $analysis['campos_mapeados'] ?? [];

        foreach (
            $mappings
            as $field => $mapping
        ) {
            $type =
                $mapping['tipo'] ?? null;

            if (
                $type ===
                'manual'
            ) {
                continue;
            }

            $origin =
                $mapping['origem'] ?? null;

            $sourceField =
                $mapping['campo'] ?? null;

            if (
                !in_array(
                    $type,
                    [
                        'automatico',
                        'calculado',
                        'assinatura',
                    ],
                    true
                ) ||
                !$this
                    ->sourceCatalog
                    ->allowed(
                        $origin,
                        $sourceField
                    )
            ) {
                $warnings[] = [
                    'code' =>
                    'INVALID_SOURCE_MAPPING',

                    'severity' =>
                    'warning',

                    'message' =>
                    "O campo {$field} não possui uma origem técnica válida no catálogo do FrotaPro.",

                    'field' =>
                    $field,
                ];
            }
        }

        $blocking =
            collect(
                $warnings
            )
            ->filter(
                fn(array $warning) => (
                    $warning['severity'] ?? 'warning'
                ) !==
                    'info'
            )
            ->values()
            ->all();

        $entities =
            collect(
                $mappings
            )
            ->pluck(
                'origem'
            )
            ->filter(
                fn($origin) =>
                in_array(
                    $origin,
                    [
                        'empresa',
                        'motorista',
                        'proprietario',
                        'veiculo',
                    ],
                    true
                )
            )
            ->unique()
            ->values()
            ->all();

        $signatures =
            collect(
                $mappings
            )
            ->filter(
                fn(
                    array $mapping,
                    string $field
                ) => (
                    $mapping['tipo'] ?? null
                ) ===
                    'assinatura' ||
                    str_starts_with(
                        $field,
                        'ASSINATURA_'
                    )
            )
            ->keys()
            ->values()
            ->all();

        $analysis['warnings'] = $warnings;

        $analysis['blocking_warnings'] = $blocking;

        $analysis['entidades_requeridas'] = $entities;

        $analysis['assinaturas_requeridas'] = $signatures;

        $analysis['tecnicamente_validado'] =
            $blocking === [];

        return $analysis;
    }

    private function applyAnalysis(
        ModeloDocumentoSaas $model,
        string $content,
        array $analysis
    ): void {
        $model->conteudo =
            trim($content);

        $model->conteudo_parametrizado =
            $analysis['conteudo_parametrizado'] ?? '';

        $model->campos_detectados =
            $analysis['campos_detectados'] ?? [];

        $model->campos_mapeados =
            $analysis['campos_mapeados'] ?? [];

        $model->entidades_requeridas =
            $analysis['entidades_requeridas'] ?? [];

        $model->assinaturas_requeridas =
            $analysis['assinaturas_requeridas'] ?? [];

        $model->warnings =
            $analysis['warnings'] ?? [];

        $model->tecnicamente_validado =
            $analysis['tecnicamente_validado'] ?? false;
    }

    private function publishedModel(
        string $id
    ): ModeloDocumentoSaas {
        return ModeloDocumentoSaas::query()
            ->where(
                'status',
                'publicado'
            )
            ->where(
                'ativo',
                true
            )
            ->whereNotNull(
                'versao_publicada'
            )
            ->whereHas(
                'categoria',
                fn($query) =>
                $query->where(
                    'ativo',
                    true
                )
            )
            ->with('categoria')
            ->findOrFail($id);
    }

    private function publishedVersion(
        ModeloDocumentoSaas $model
    ): ModeloDocumentoSaasVersao {
        return ModeloDocumentoSaasVersao::query()
            ->where(
                'modelo_documento_saas_id',
                $model->id
            )
            ->where(
                'versao',
                $model->versao_publicada
            )
            ->firstOrFail();
    }

    private function catalogCard(
        ModeloDocumentoSaas $model
    ): array {
        $version =
            $model
            ->versoes
            ->firstWhere(
                'versao',
                $model->versao_publicada
            );

        if (!$version) {
            $version =
                $this->publishedVersion(
                    $model
                );
        }

        return [
            'id' =>
            $model->id,

            'categoria' => [
                'id' =>
                $model
                    ->categoria
                    ->id,

                'nome' =>
                $model
                    ->categoria
                    ->nome,

                'slug' =>
                $model
                    ->categoria
                    ->slug,
            ],

            'nome' =>
            $model->nome,

            'slug' =>
            $model->slug,

            'resumo' =>
            $model->resumo,

            'tipo_documento' =>
            $model->tipo_documento,

            'pais' =>
            $model->pais,

            'idioma' =>
            $model->idioma,

            'versao' =>
            $version->versao,

            'tecnicamente_validado' =>
            true,

            'juridicamente_revisto' =>
            $version
                ->juridicamente_revisto,

            'destaque' =>
            $model->destaque,

            'entidades_requeridas' =>
            $version
                ->entidades_requeridas ??
                [],

            'assinaturas_requeridas' =>
            $version
                ->assinaturas_requeridas ??
                [],

            'publicado_em' =>
            $version
                ->publicado_em,
        ];
    }

    private function uniqueCategorySlug(
        string $value,
        ?string $ignoreId = null
    ): string {
        return $this->uniqueSlug(
            ModeloDocumentoSaasCategoria::query(),
            $value,
            $ignoreId
        );
    }

    private function uniqueModelSlug(
        string $value,
        ?string $ignoreId = null
    ): string {
        return $this->uniqueSlug(
            ModeloDocumentoSaas::query(),
            $value,
            $ignoreId
        );
    }

    private function uniqueSlug(
        Builder $query,
        string $value,
        ?string $ignoreId = null
    ): string {
        $base =
            Str::slug(
                trim($value)
            );

        if ($base === '') {
            $base =
                Str::lower(
                    Str::random(12)
                );
        }

        $slug =
            $base;

        $suffix =
            2;

        while (
            (clone $query)
            ->when(
                $ignoreId,
                fn($query) =>
                $query->where(
                    'id',
                    '!=',
                    $ignoreId
                )
            )
            ->where(
                'slug',
                $slug
            )
            ->exists()
        ) {
            $slug =
                $base .
                '-' .
                $suffix;

            $suffix++;
        }

        return $slug;
    }
}
