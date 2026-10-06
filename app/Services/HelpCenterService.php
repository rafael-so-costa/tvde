<?php

namespace App\Services;

use App\Models\HelpCategory;
use App\Models\HelpContent;
use App\Models\HelpContentView;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class HelpCenterService
{

    public function __construct(
        private NotificationCenterService $notifications
    ) {}


    private const TYPES = [
        'article' => 'Artigo',
        'video' => 'Vídeo',
    ];

    private const AUDIENCES = [
        'admin_empresa' => 'Gestor de Frota',
        'funcionario' => 'Funcionário',
        'motorista' => 'Motorista',
        'proprietario' => 'Proprietário',
    ];

    private const FEATURES = [
        'dashboard' => 'Dashboard',
        'empresas' => 'Empresas',
        'proprietarios' => 'Proprietários',
        'motoristas' => 'Motoristas',
        'funcionarios' => 'Funcionários',
        'veiculos' => 'Veículos',
        'alugueres' => 'Alugueres',
        'contratos' => 'Contratos',
        'templates' => 'Templates',
        'assinaturas' => 'Assinaturas',
        'checklists' => 'Checklists',
        'manutencao' => 'Manutenção',
        'multas' => 'Multas',
        'sinistros' => 'Sinistros',
        'expediente' => 'Expediente',
        'recibos_verdes' => 'Recibos verdes',
        'registos_criminais' => 'Registos criminais',
        'mensagens' => 'Mensagens',
        'alertas' => 'Alertas',
        'relatorios' => 'Relatórios',
        'auditoria' => 'Auditoria',
        'configuracoes' => 'Configurações',
        'conta' => 'Minha conta',
        'helpdesk' => 'Helpdesk',
        'onboarding' => 'Onboarding',
        'other' => 'Outro',
    ];

    public static function typeCodes(): array
    {
        return array_keys(self::TYPES);
    }

    public static function audienceCodes(): array
    {
        return array_keys(self::AUDIENCES);
    }

    public static function featureCodes(): array
    {
        return array_keys(self::FEATURES);
    }

    public function userMeta(User $user, string $tenantId): array
    {
        $audiences = $this->audiencesFor($user, $tenantId);

        $categories = HelpCategory::query()
            ->where('active', true)
            ->whereHas('contents', function (Builder $query) use ($audiences) {
                $this->applyPublished($query, $audiences);
            })
            ->orderBy('position')
            ->orderBy('name')
            ->get()
            ->map(fn(HelpCategory $category) => $this->categoryData($category))
            ->values()
            ->all();

        return [
            'types' => $this->options(self::TYPES),
            'features' => $this->options(self::FEATURES),
            'categories' => $categories,
            'audiences' => $audiences,
        ];
    }

    public function userIndex(User $user, string $tenantId, array $filters): array
    {
        $audiences = $this->audiencesFor($user, $tenantId);

        $query = HelpContent::query()
            ->with(['category', 'audiences'])
            ->withSum('viewRecords', 'views');

        $this->applyPublished($query, $audiences);
        $this->applyFilters($query, $filters);

        $query
            ->orderByDesc('featured')
            ->orderBy('position')
            ->orderByDesc('published_at');

        $paginator = $query->paginate((int)($filters['per_page'] ?? 12));

        $ids = $paginator->getCollection()->pluck('id');

        $viewed = HelpContentView::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->whereIn('content_id', $ids)
            ->pluck('content_id')
            ->flip();

        $data = $paginator->getCollection()
            ->map(fn(HelpContent $content) => [
                ...$this->contentData($content, false),
                'viewed' => $viewed->has($content->id),
            ])
            ->values()
            ->all();

        return [
            'data' => $data,
            'meta' => $this->pagination($paginator),
        ];
    }

    public function userShow(User $user, string $tenantId, string $slug): array
    {
        $audiences = $this->audiencesFor($user, $tenantId);

        $query = HelpContent::query()
            ->with(['category', 'audiences'])
            ->withSum('viewRecords', 'views')
            ->where('slug', $slug);

        $this->applyPublished($query, $audiences);

        $content = $query->firstOrFail();

        $relatedQuery = HelpContent::query()
            ->with(['category', 'audiences'])
            ->whereKeyNot($content->id)
            ->where(function (Builder $query) use ($content) {
                $query->where('category_id', $content->category_id);

                if ($content->feature_key) {
                    $query->orWhere('feature_key', $content->feature_key);
                }
            });

        $this->applyPublished($relatedQuery, $audiences);

        $related = $relatedQuery
            ->orderByDesc('featured')
            ->orderBy('position')
            ->limit(4)
            ->get()
            ->map(fn(HelpContent $item) => $this->contentData($item, false))
            ->values()
            ->all();

        return [
            ...$this->contentData($content, false, true),
            'related' => $related,
        ];
    }

    public function recordView(User $user, string $tenantId, string $id): array
    {
        $audiences = $this->audiencesFor($user, $tenantId);

        $query = HelpContent::query()->whereKey($id);
        $this->applyPublished($query, $audiences);

        $content = $query->firstOrFail();

        DB::transaction(function () use ($content, $user, $tenantId, $audiences) {
            $view = HelpContentView::query()
                ->where('content_id', $content->id)
                ->where('user_id', $user->id)
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();

            if (!$view) {
                HelpContentView::create([
                    'content_id' => $content->id,
                    'user_id' => $user->id,
                    'tenant_id' => $tenantId,
                    'audiences' => $audiences,
                    'views' => 1,
                    'first_viewed_at' => now(),
                    'last_viewed_at' => now(),
                ]);

                return;
            }

            $view->views++;
            $view->audiences = $audiences;
            $view->last_viewed_at = now();
            $view->save();
        });

        return ['recorded' => true];
    }

    public function backofficeMeta(): array
    {
        return [
            'types' => $this->options(self::TYPES),
            'audiences' => $this->options(self::AUDIENCES),
            'features' => $this->options(self::FEATURES),
            'statuses' => [
                ['value' => 'published', 'label' => 'Publicado'],
                ['value' => 'scheduled', 'label' => 'Agendado'],
                ['value' => 'draft', 'label' => 'Rascunho'],
            ],
            'categories' => HelpCategory::query()
                ->orderBy('position')
                ->orderBy('name')
                ->get()
                ->map(fn(HelpCategory $category) => $this->categoryData($category))
                ->values()
                ->all(),
        ];
    }

    public function backofficeSummary(): array
    {
        return [
            'contents' => HelpContent::query()->count(),
            'published' => HelpContent::query()
                ->where('active', true)
                ->whereNotNull('published_at')
                ->where('published_at', '<=', now())
                ->count(),
            'articles' => HelpContent::query()->where('type', 'article')->count(),
            'videos' => HelpContent::query()->where('type', 'video')->count(),
            'categories' => HelpCategory::query()->count(),
            'views' => (int)HelpContentView::query()->sum('views'),
            'unique_viewers' => HelpContentView::query()->distinct('user_id')->count('user_id'),
        ];
    }

    public function backofficeIndex(array $filters): array
    {
        $query = HelpContent::query()
            ->with(['category', 'audiences'])
            ->withSum('viewRecords', 'views')
            ->withCount('viewRecords');

        $this->applyFilters($query, $filters);

        if (!empty($filters['audience'])) {
            $query->whereHas(
                'audiences',
                fn(Builder $q) => $q->where('audience', $filters['audience'])
            );
        }

        if (!empty($filters['status'])) {
            match ($filters['status']) {
                'published' => $query
                    ->where('active', true)
                    ->whereNotNull('published_at')
                    ->where('published_at', '<=', now()),
                'scheduled' => $query
                    ->where('active', true)
                    ->whereNotNull('published_at')
                    ->where('published_at', '>', now()),
                'draft' => $query->where('active', false),
                default => null,
            };
        }

        $paginator = $query
            ->orderByDesc('updated_at')
            ->paginate((int)($filters['per_page'] ?? 25));

        return [
            'data' => $paginator->getCollection()
                ->map(fn(HelpContent $content) => $this->contentData($content, true))
                ->values()
                ->all(),
            'meta' => $this->pagination($paginator),
        ];
    }

    public function backofficeShow(string $id): array
    {
        $content = HelpContent::query()
            ->with(['category', 'audiences'])
            ->withSum('viewRecords', 'views')
            ->withCount('viewRecords')
            ->findOrFail($id);

        return $this->contentData($content, true, true);
    }

    public function categories(): array
    {
        return HelpCategory::query()
            ->withCount('contents')
            ->orderBy('position')
            ->orderBy('name')
            ->get()
            ->map(fn(HelpCategory $category) => [
                ...$this->categoryData($category),
                'contents_count' => $category->contents_count,
            ])
            ->values()
            ->all();
    }

    public function storeCategory(User $user, array $data): array
    {
        $category = HelpCategory::create([
            ...$data,
            'slug' => $this->uniqueSlug('help_categories', $data['name']),
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        return $this->categoryData($category);
    }

    public function updateCategory(User $user, string $id, array $data): array
    {
        $category = HelpCategory::findOrFail($id);
        $category->fill($data);
        $category->updated_by_user_id = $user->id;
        $category->save();

        return $this->categoryData($category);
    }

    public function destroyCategory(string $id): void
    {
        $category = HelpCategory::findOrFail($id);

        if ($category->contents()->exists()) {
            throw ValidationException::withMessages([
                'category' => 'A categoria possui conteúdos. Mova ou elimine os conteúdos antes de a apagar.',
            ]);
        }

        $category->delete();
    }

    public function storeContent(
        User $user,
        array $data
    ): array {
        $this->validateContent(
            $data
        );

        $content =
            DB::transaction(
                function () use (
                    $user,
                    $data
                ) {
                    $audiences =
                        $data['audiences'];

                    unset(
                        $data['audiences']
                    );

                    $this->prepareContentData(
                        $data
                    );

                    $content =
                        HelpContent::create([
                            ...$data,

                            'slug' =>
                            $this->uniqueSlug(
                                'help_contents',
                                $data['title']
                            ),

                            'created_by_user_id' =>
                            $user->id,

                            'updated_by_user_id' =>
                            $user->id,
                        ]);

                    $this->syncAudiences(
                        $content,
                        $audiences
                    );

                    return $content;
                }
            );

        $this->notifications
            ->syncHelpContent(
                $content->fresh(
                    'audiences'
                )
            );

        return $this->backofficeShow(
            $content->id
        );
    }

    public function updateContent(
        User $user,
        string $id,
        array $data
    ): array {
        $content =
            HelpContent::findOrFail(
                $id
            );

        $merged = [
            'type' =>
            $data['type'] ??
                $content->type,

            'body' =>
            array_key_exists(
                'body',
                $data
            )
                ? $data['body']
                : $content->body,

            'youtube_url' =>
            array_key_exists(
                'youtube_url',
                $data
            )
                ? $data['youtube_url']
                : $content->youtube_url,
        ];

        $this->validateContent(
            $merged
        );

        DB::transaction(
            function () use (
                $user,
                $content,
                $data
            ) {
                $audiences =
                    $data['audiences'] ?? null;

                unset(
                    $data['audiences']
                );

                $this->prepareContentData(
                    $data,
                    $content
                );

                $content->fill(
                    $data
                );

                $content
                    ->updated_by_user_id =
                    $user->id;

                $content->save();

                if (
                    $audiences !== null
                ) {
                    $this->syncAudiences(
                        $content,
                        $audiences
                    );
                }
            }
        );

        $this->notifications
            ->syncHelpContent(
                $content->fresh(
                    'audiences'
                )
            );

        return $this->backofficeShow(
            $content->id
        );
    }

    public function destroyContent(
        string $id
    ): void {
        $content =
            HelpContent::findOrFail(
                $id
            );

        $this->notifications
            ->removeHelpContent(
                $content
            );

        $content->delete();
    }

    private function applyPublished(Builder $query, array $audiences): void
    {
        $query
            ->where('active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->whereHas('category', fn(Builder $q) => $q->where('active', true))
            ->whereHas(
                'audiences',
                fn(Builder $q) => $q->whereIn('audience', $audiences)
            );
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';

            $query->where(function (Builder $q) use ($term) {
                $q->where('title', 'like', $term)
                    ->orWhere('excerpt', 'like', $term)
                    ->orWhere('body', 'like', $term);
            });
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['feature_key'])) {
            $query->where('feature_key', $filters['feature_key']);
        }

        if (isset($filters['featured']) && $filters['featured']) {
            $query->where('featured', true);
        }
    }

    private function audiencesFor(User $user, string $tenantId): array
    {
        if ($user->isSuperAdmin()) {
            return self::audienceCodes();
        }

        $audiences = [];

        foreach (self::audienceCodes() as $audience) {
            if ($user->hasRole($audience, $tenantId)) {
                $audiences[] = $audience;
            }
        }

        if (!$audiences) {
            abort(403, 'O seu perfil não possui acesso à Central de Ajuda.');
        }

        return $audiences;
    }

    private function validateContent(array $data): void
    {
        $type = $data['type'] ?? null;

        if ($type === 'article' && blank($data['body'] ?? null)) {
            throw ValidationException::withMessages([
                'body' => 'O conteúdo do artigo é obrigatório.',
            ]);
        }

        if ($type === 'video' && blank($data['youtube_url'] ?? null)) {
            throw ValidationException::withMessages([
                'youtube_url' => 'Informe o URL do vídeo do YouTube.',
            ]);
        }

        if ($type === 'video') {
            $this->youtubeId($data['youtube_url']);
        }
    }

    private function prepareContentData(array &$data, ?HelpContent $existing = null): void
    {
        $type = $data['type'] ?? $existing?->type;

        if ($type === 'video' && array_key_exists('youtube_url', $data)) {
            $data['youtube_video_id'] = $this->youtubeId($data['youtube_url']);
        }

        if ($type === 'article') {
            $data['youtube_url'] = null;
            $data['youtube_video_id'] = null;
        }

        $active = $data['active'] ?? $existing?->active ?? false;

        if ($active && empty($data['published_at']) && !$existing?->published_at) {
            $data['published_at'] = now();
        }
    }

    private function youtubeId(string $url): string
    {
        $parts = parse_url(trim($url));

        if (!$parts || empty($parts['host'])) {
            throw ValidationException::withMessages([
                'youtube_url' => 'URL do YouTube inválido.',
            ]);
        }

        $host = strtolower(preg_replace('/^www\./', '', $parts['host']));
        $id = null;

        if ($host === 'youtu.be') {
            $id = trim($parts['path'] ?? '', '/');
        } elseif (in_array($host, ['youtube.com', 'm.youtube.com'], true)) {
            parse_str($parts['query'] ?? '', $query);

            if (!empty($query['v'])) {
                $id = $query['v'];
            } else {
                $segments = array_values(array_filter(explode('/', trim($parts['path'] ?? '', '/'))));

                if (in_array($segments[0] ?? null, ['embed', 'shorts', 'live'], true)) {
                    $id = $segments[1] ?? null;
                }
            }
        }

        if (!$id || !preg_match('/^[A-Za-z0-9_-]{6,30}$/', $id)) {
            throw ValidationException::withMessages([
                'youtube_url' => 'O URL deve apontar para um vídeo válido do YouTube.',
            ]);
        }

        return $id;
    }

    private function syncAudiences(HelpContent $content, array $audiences): void
    {
        $content->audiences()->delete();

        foreach (array_values(array_unique($audiences)) as $audience) {
            $content->audiences()->create([
                'audience' => $audience,
            ]);
        }
    }

    private function contentData(HelpContent $content, bool $admin = false, bool $detail = false): array
    {
        $audiences = $content->audiences
            ->map(fn($item) => [
                'value' => $item->audience,
                'label' => self::AUDIENCES[$item->audience] ?? $item->audience,
            ])
            ->values()
            ->all();

        $data = [
            'id' => $content->id,
            'title' => $content->title,
            'slug' => $content->slug,
            'type' => $content->type,
            'type_label' => self::TYPES[$content->type] ?? $content->type,
            'excerpt' => $content->excerpt,
            'category' => [
                'id' => $content->category->id,
                'name' => $content->category->name,
                'slug' => $content->category->slug,
            ],
            'feature_key' => $content->feature_key,
            'feature_label' => $content->feature_key
                ? (self::FEATURES[$content->feature_key] ?? $content->feature_key)
                : null,
            'featured' => $content->featured,
            'position' => $content->position,
            'youtube_video_id' => $content->youtube_video_id,
            'youtube_thumbnail_url' => $content->youtube_video_id
                ? "https://i.ytimg.com/vi/{$content->youtube_video_id}/hqdefault.jpg"
                : null,
            'published_at' => $content->published_at?->toISOString(),
            'views' => (int)($content->view_records_sum_views ?? 0),
        ];

        if ($detail) {
            $data['body'] = $content->body;
            $data['youtube_url'] = $content->youtube_url;
            $data['youtube_embed_url'] = $content->youtube_video_id
                ? "https://www.youtube-nocookie.com/embed/{$content->youtube_video_id}"
                : null;
        }

        if ($admin) {
            $data = [
                ...$data,
                'audiences' => $audiences,
                'active' => $content->active,
                'status' => $this->statusOf($content),
                'status_label' => $this->statusLabel($this->statusOf($content)),
                'unique_viewers' => (int)($content->view_records_count ?? 0),
                'created_at' => $content->created_at?->toISOString(),
                'updated_at' => $content->updated_at?->toISOString(),
            ];
        }

        return $data;
    }

    private function categoryData(HelpCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'position' => $category->position,
            'active' => $category->active,
        ];
    }

    private function statusOf(HelpContent $content): string
    {
        if (!$content->active) {
            return 'draft';
        }

        if ($content->published_at && $content->published_at->isFuture()) {
            return 'scheduled';
        }

        return 'published';
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'published' => 'Publicado',
            'scheduled' => 'Agendado',
            default => 'Rascunho',
        };
    }

    private function uniqueSlug(string $table, string $value): string
    {
        $base = Str::slug($value) ?: Str::lower(Str::random(8));
        $slug = $base;
        $i = 2;

        while (DB::table($table)->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function options(array $items): array
    {
        return collect($items)
            ->map(fn(string $label, string $value) => [
                'value' => $value,
                'label' => $label,
            ])
            ->values()
            ->all();
    }

    private function pagination($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
