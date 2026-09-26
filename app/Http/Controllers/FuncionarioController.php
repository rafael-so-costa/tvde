<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateFuncionarioAccessRequest;
use App\Http\Requests\StoreFuncionarioRequest;
use App\Http\Requests\UpdateFuncionarioAccessRequest;
use App\Http\Requests\UpdateFuncionarioPermissionsRequest;
use App\Http\Requests\UpdateFuncionarioRequest;
use App\Http\Requests\UpdateFuncionarioStatusRequest;
use App\Models\Funcionario;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\FuncionarioAccessService;
use App\Services\FuncionarioPermissionService;
use App\Services\FuncionarioService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FuncionarioController extends Controller
{
    public function __construct(
        private TenantContext $tenantContext,
        private FuncionarioService $service,
        private FuncionarioAccessService $accessService,
        private FuncionarioPermissionService $permissionService
    ) {}

    public function index(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:150',
            ],

            'estado' => [
                'nullable',
                Rule::in([
                    'ativo',
                    'inativo',
                    'suspenso',
                    'desligado',
                ]),
            ],

            'departamento' => [
                'nullable',
                'string',
                'max:150',
            ],

            'acesso' => [
                'nullable',
                Rule::in([
                    'com_acesso',
                    'sem_acesso',
                    'pendente',
                ]),
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $tenantId = $this->tenantId();

        $query = Funcionario::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->with([
                'user:id,name,email,ativo,last_login_at',

                'invitations' => fn($query) =>
                $query
                    ->whereNull(
                        'accepted_at'
                    )
                    ->whereNull(
                        'revoked_at'
                    )
                    ->latest(),
            ]);

        if (!empty($validated['search'])) {
            $search = trim(
                $validated['search']
            );

            $query->where(
                function (
                    Builder $query
                ) use ($search) {
                    $query
                        ->where(
                            'nome',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'nif',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'numero_funcionario',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'cargo',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        if (!empty($validated['estado'])) {
            $query->where(
                'estado',
                $validated['estado']
            );
        }

        if (!empty($validated['departamento'])) {
            $query->where(
                'departamento',
                $validated['departamento']
            );
        }

        if (
            ($validated['acesso'] ?? null) ===
            'com_acesso'
        ) {
            $query->whereNotNull(
                'user_id'
            );
        }

        if (
            ($validated['acesso'] ?? null) ===
            'sem_acesso'
        ) {
            $query->whereNull(
                'user_id'
            );
        }

        if (
            ($validated['acesso'] ?? null) ===
            'pendente'
        ) {
            $query
                ->whereNull('user_id')
                ->whereHas(
                    'invitations',
                    fn($query) =>
                    $query
                        ->whereNull(
                            'accepted_at'
                        )
                        ->whereNull(
                            'revoked_at'
                        )
                        ->where(
                            'expires_at',
                            '>',
                            now()
                        )
                );
        }

        $paginator = $query
            ->orderBy('nome')
            ->paginate(
                (int)(
                    $validated['per_page'] ?? 30
                )
            );

        $items = collect(
            $paginator->items()
        );

        $memberships =
            TenantUser::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->whereIn(
                'user_id',
                $items
                    ->pluck('user_id')
                    ->filter()
                    ->values()
            )
            ->get()
            ->keyBy('user_id');

        return response()->json([
            'data' => $items
                ->map(
                    fn(Funcionario $funcionario) =>
                    $this->serialize(
                        $funcionario,
                        $memberships->get(
                            $funcionario
                                ->user_id
                        )
                    )
                )
                ->values(),

            'meta' => [
                'current_page' =>
                $paginator
                    ->currentPage(),

                'last_page' =>
                $paginator
                    ->lastPage(),

                'per_page' =>
                $paginator
                    ->perPage(),

                'total' =>
                $paginator
                    ->total(),

                'can_manage_permissions' =>
                $this
                    ->canManagePermissions(
                        $request->user(),
                        $tenantId
                    ),
            ],
        ]);
    }

    public function store(
        StoreFuncionarioRequest $request
    ): JsonResponse {
        $funcionario =
            $this->service->create(
                $this->tenantId(),
                $request->user()->id,
                $request->validated()
            );

        return response()->json([
            'message' =>
            'Funcionário criado com sucesso.',

            'data' => $this->serialize(
                $funcionario,
                null
            ),
        ], 201);
    }

    public function show(
        Request $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->findFuncionario(
                $id
            );

        return response()->json([
            'data' => $this->serialize(
                $funcionario,
                $this->membership(
                    $funcionario
                )
            ),

            'can_manage_permissions' =>
            $this
                ->canManagePermissions(
                    $request->user(),
                    $this->tenantId()
                ),
        ]);
    }

    public function update(
        UpdateFuncionarioRequest $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->service
            ->update(
                $this
                    ->findFuncionario(
                        $id
                    ),

                $request->user()->id,

                $request->validated()
            );

        return response()->json([
            'message' =>
            'Funcionário atualizado com sucesso.',

            'data' => $this->serialize(
                $funcionario,
                $this->membership(
                    $funcionario
                )
            ),
        ]);
    }

    public function status(
        UpdateFuncionarioStatusRequest $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->findFuncionario(
                $id
            );

        $this->guardSelf(
            $request,
            $funcionario
        );

        $this->guardPrivilegedTarget(
            $request,
            $funcionario
        );

        $funcionario =
            $this->service
            ->updateStatus(
                $funcionario,
                $request->user()->id,
                $request->validated(
                    'estado'
                ),
                $request->validated(
                    'data_saida'
                )
            );

        return response()->json([
            'message' =>
            'Estado laboral atualizado.',

            'data' => $this->serialize(
                $funcionario,
                $this->membership(
                    $funcionario
                )
            ),
        ]);
    }

    public function provisionAccess(
        CreateFuncionarioAccessRequest $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->findFuncionario(
                $id
            );

        $this->guardSelf(
            $request,
            $funcionario
        );

        $result =
            $this->accessService
            ->provision(
                $funcionario,
                $request->user(),
                $request->boolean(
                    'confirm_existing_user'
                )
            );

        return response()->json(
            [
                'message' =>
                $result['mode'] ===
                    'invited'
                    ? 'Convite de acesso enviado.'
                    : 'Conta existente associada ao funcionário.',

                'data' => [
                    'mode' => $result['mode'],
                ],
            ],
            $result['mode'] === 'invited'
                ? 202
                : 200
        );
    }

    public function resendInvite(
        Request $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->findFuncionario(
                $id
            );

        $this->guardSelf(
            $request,
            $funcionario
        );

        $invitation =
            $this->accessService
            ->resend(
                $funcionario,
                $request->user()
            );

        return response()->json([
            'message' =>
            'Novo convite enviado.',

            'data' => [
                'expires_at' =>
                $invitation
                    ->expires_at
                    ->toISOString(),
            ],
        ], 202);
    }

    public function accessStatus(
    UpdateFuncionarioAccessRequest $request,
    string $id
): JsonResponse {
    $funcionario =
        $this->findFuncionario(
            $id
        );

    $this->guardSelf(
        $request,
        $funcionario
    );

    $this->guardPrivilegedTarget(
        $request,
        $funcionario
    );

    $this->accessService
        ->setStatus(
            $funcionario,
            $request->boolean(
                'ativo'
            )
        );

    return response()->json([
        'message' =>
            'Estado de acesso atualizado.',
    ]);
}

    public function permissions(
        Request $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->findFuncionario(
                $id
            );

        $this->assertPermissionAdmin(
            $request->user()
        );

        if (!$funcionario->user_id) {
            abort(
                422,
                'O funcionário ainda não possui conta de acesso.'
            );
        }

        $user = User::query()
            ->findOrFail(
                $funcionario->user_id
            );

        return response()->json([
            'data' => $this
                ->permissionService
                ->matrix(
                    $user,
                    $this->tenantId()
                ),

            'levels' => [
                'nenhum',
                'visualizar',
                'configurar',
            ],
        ]);
    }

    public function updatePermissions(
        UpdateFuncionarioPermissionsRequest $request,
        string $id
    ): JsonResponse {
        $funcionario =
            $this->findFuncionario(
                $id
            );

        $this->assertPermissionAdmin(
            $request->user()
        );

        $this->guardSelf(
            $request,
            $funcionario
        );

        if (!$funcionario->user_id) {
            abort(
                422,
                'O funcionário ainda não possui conta de acesso.'
            );
        }

        $user = User::query()
            ->findOrFail(
                $funcionario->user_id
            );

        $this->permissionService
            ->replace(
                $user,
                $this->tenantId(),
                $request->validated(
                    'permissions'
                )
            );

        return response()->json([
            'message' =>
            'Permissões atualizadas com sucesso.',

            'data' => $this
                ->permissionService
                ->matrix(
                    $user,
                    $this->tenantId()
                ),
        ]);
    }

    private function findFuncionario(
        string $id
    ): Funcionario {
        return Funcionario::query()
            ->where(
                'tenant_id',
                $this->tenantId()
            )
            ->with([
                'user:id,name,email,ativo,last_login_at',

                'invitations' => fn($query) =>
                $query
                    ->whereNull(
                        'accepted_at'
                    )
                    ->whereNull(
                        'revoked_at'
                    )
                    ->latest(),
            ])
            ->findOrFail($id);
    }

    private function membership(
        Funcionario $funcionario
    ): ?TenantUser {
        if (!$funcionario->user_id) {
            return null;
        }

        return TenantUser::query()
            ->where(
                'tenant_id',
                $funcionario->tenant_id
            )
            ->where(
                'user_id',
                $funcionario->user_id
            )
            ->first();
    }

    private function serialize(
        Funcionario $funcionario,
        ?TenantUser $membership
    ): array {
        $pending =
            $funcionario->relationLoaded(
                'invitations'
            )
            ? $funcionario
            ->invitations
            ->first()
            : null;

        return [
            'id' => $funcionario->id,

            'numero_funcionario' =>
            $funcionario
                ->numero_funcionario,

            'nome' => $funcionario->nome,
            'nif' => $funcionario->nif,
            'email' => $funcionario->email,

            'telefone' =>
            $funcionario->telefone,

            'data_nascimento' =>
            $funcionario
                ->data_nascimento
                ?->toDateString(),

            'cargo' => $funcionario->cargo,

            'departamento' =>
            $funcionario
                ->departamento,

            'data_admissao' =>
            $funcionario
                ->data_admissao
                ?->toDateString(),

            'data_saida' =>
            $funcionario
                ->data_saida
                ?->toDateString(),

            'estado' => $funcionario->estado,

            'observacoes' =>
            $funcionario
                ->observacoes,

            'access' => [
                'linked' =>
                (bool)
                $funcionario->user_id,

                'user_id' =>
                $funcionario->user_id,

                'user_email' =>
                $funcionario
                    ->user
                    ?->email,

                'global_active' =>
                $funcionario
                    ->user
                    ?->ativo,

                'tenant_status' =>
                $membership?->status,

                'last_login_at' =>
                $funcionario
                    ->user
                    ?->last_login_at
                    ?->toISOString(),

                'pending_invitation' =>
                $pending
                    ? [
                        'id' => $pending->id,

                        'expires_at' =>
                        $pending
                            ->expires_at
                            ?->toISOString(),

                        'sent_at' =>
                        $pending
                            ->sent_at
                            ?->toISOString(),
                    ]
                    : null,
            ],

            'created_at' =>
            $funcionario
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $funcionario
                ->updated_at
                ?->toISOString(),
        ];
    }

    private function canManagePermissions(
        User $user,
        string $tenantId
    ): bool {
        return
            $user->isSuperAdmin() ||
            $user->hasRole(
                'admin_empresa',
                $tenantId
            );
    }

    private function assertPermissionAdmin(
        User $user
    ): void {
        if (
            !$this
                ->canManagePermissions(
                    $user,
                    $this->tenantId()
                )
        ) {
            abort(
                403,
                'Apenas administradores da organização podem gerir permissões de funcionários.'
            );
        }
    }

    private function guardSelf(
        Request $request,
        Funcionario $funcionario
    ): void {
        $user = $request->user();

        if (
            $user &&
            $funcionario->user_id &&
            $funcionario->user_id === $user->id
        ) {
            abort(
                403,
                'Não pode alterar o seu próprio acesso através do cadastro de funcionário.'
            );
        }
    }

    private function guardPrivilegedTarget(
        Request $request,
        Funcionario $funcionario
    ): void {
        if (!$funcionario->user_id) {
            return;
        }

        $actor = $request->user();

        if (!$actor) {
            abort(403);
        }

        $tenantId = $funcionario->tenant_id;

        if (
            $actor->isSuperAdmin() ||
            $actor->hasRole(
                'admin_empresa',
                $tenantId
            )
        ) {
            return;
        }

        $target = $funcionario->user;

        if (!$target) {
            return;
        }

        if (
            $target->isSuperAdmin() ||
            $target->hasRole(
                'admin_empresa',
                $tenantId
            )
        ) {
            abort(
                403,
                'Apenas administradores podem alterar o acesso de outro administrador.'
            );
        }
    }

    private function tenantId(): string
    {
        if (
            !$this
                ->tenantContext
                ->hasTenant()
        ) {
            abort(
                403,
                'Selecione uma organização para aceder a este recurso.'
            );
        }

        return $this
            ->tenantContext
            ->requireId();
    }
}
