<?php

namespace App\Services;

use App\Models\AssinaturaDigital;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\Empresa;
use App\Models\LogAuditoriaContrato;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use App\Models\User;
use App\Models\Veiculo;
use App\Models\VersaoContrato;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContratoService
{
    public const MAX_MOTORISTAS_ATIVOS_POR_VEICULO = 3;

    private const ASSINATURAS = [
        'ASSINATURA_MOTORISTA',
        'ASSINATURA_PROPRIETARIO',
        'ASSINATURA_EMPRESA',
        'ASSINATURA_TESTEMUNHA',
    ];

    public function create(
        array $data,
        User $actor,
        string $tenantId,
        ?string $ip = null,
        ?string $userAgent = null
    ): Contrato {
        return DB::transaction(function () use (
            $data,
            $actor,
            $tenantId,
            $ip,
            $userAgent
        ) {
            $assinaturasInput = $data['assinaturas'] ?? [];
            $empresaId = $data['empresa_id'] ?? null;

            unset(
                $data['assinaturas'],
                $data['empresa_id']
            );

            $template = $this->template(
                $tenantId,
                $data['template_id'] ?? null
            );

            $motorista = $this->motorista(
                $tenantId,
                $data['motorista_id'] ?? null
            );

            $proprietario = $this->proprietario(
                $tenantId,
                $data['proprietario_id'] ?? null
            );

            $veiculo = $this->veiculo(
                $tenantId,
                $data['veiculo_id'] ?? null
            );

            $empresa = $this->empresa(
                $tenantId,
                $empresaId
            );

            $obrigatorias = $this
                ->assinaturasObrigatorias($template);

            $assinaturas = $this->prepararAssinaturas(
                $obrigatorias,
                $assinaturasInput,
                $motorista,
                $proprietario,
                $empresa,
                $actor
            );

            $campos = $data['campos_preenchidos'] ?? [];

            foreach ($assinaturas as $assinatura) {
                if (
                    $assinatura['modo'] === 'presencial' &&
                    filled($assinatura['assinatura_url'])
                ) {
                    $campos[$assinatura['placeholder']] =
                        $assinatura['assinatura_url'];
                }
            }

            $data['campos_preenchidos'] = $campos;

            $contrato = new Contrato($data);

            $contrato->tenant_id = $tenantId;
            $contrato->status = 'rascunho';
            $contrato->versao_atual = 1;
            $contrato->bloqueado = false;
            $contrato->valor_semanal =
                $veiculo?->valor_aluguel;

            $this->validarCronologia(
                $contrato
            );

            if ($assinaturas !== []) {
                $todasAssinadas = collect($assinaturas)
                    ->every(
                        fn(array $assinatura) =>
                        $assinatura['modo'] === 'presencial'
                    );

                $contrato->status = $todasAssinadas
                    ? 'assinado'
                    : 'enviado';

                if ($todasAssinadas) {
                    $contrato->data_assinatura = now();
                }
            }

            foreach ($assinaturas as $assinatura) {
                if (
                    $assinatura['placeholder'] ===
                    'ASSINATURA_MOTORISTA' &&
                    $assinatura['modo'] === 'presencial'
                ) {
                    $contrato->assinatura_motorista_url =
                        $assinatura['assinatura_url'];
                }

                if (
                    $assinatura['placeholder'] ===
                    'ASSINATURA_PROPRIETARIO' &&
                    $assinatura['modo'] === 'presencial'
                ) {
                    $contrato->assinatura_proprietario_url =
                        $assinatura['assinatura_url'];
                }
            }

            $contrato->save();

            foreach ($assinaturas as $dadosAssinatura) {
                $this->guardarAssinatura(
                    $contrato,
                    $dadosAssinatura,
                    $actor,
                    $ip,
                    $userAgent
                );
            }

            $this->guardarVersao(
                $contrato,
                $actor,
                'Versão inicial'
            );

            $this->auditar(
                $contrato,
                $actor,
                'criacao',
                [
                    'tipo' => $contrato->tipo,
                    'status' => $contrato->status,
                    'versao' => 1,
                ],
                $ip
            );

            if (
                $contrato->tipo === 'aluguer' &&
                $contrato->status === 'assinado'
            ) {
                $this->associarMotoristaVeiculo(
                    $contrato
                );
            }

            return $this->carregar($contrato);
        });
    }

    public function updateDraft(
        string $contratoId,
        string $tenantId,
        array $data,
        User $actor,
        ?string $ip = null
    ): Contrato {
        return DB::transaction(function () use (
            $contratoId,
            $tenantId,
            $data,
            $actor,
            $ip
        ) {
            $contrato = Contrato::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($contratoId)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $contrato->bloqueado ||
                $contrato->status !== 'rascunho'
            ) {
                throw ValidationException::withMessages([
                    'contrato' =>
                    'Apenas contratos em rascunho e não bloqueados podem ser editados.',
                ]);
            }

            if (
                array_key_exists(
                    'template_id',
                    $data
                )
            ) {
                $this->template(
                    $tenantId,
                    $data['template_id']
                );
            }

            if (
                array_key_exists(
                    'motorista_id',
                    $data
                )
            ) {
                $this->motorista(
                    $tenantId,
                    $data['motorista_id']
                );
            }

            if (
                array_key_exists(
                    'proprietario_id',
                    $data
                )
            ) {
                $this->proprietario(
                    $tenantId,
                    $data['proprietario_id']
                );
            }

            if (
                array_key_exists(
                    'veiculo_id',
                    $data
                )
            ) {
                $this->veiculo(
                    $tenantId,
                    $data['veiculo_id']
                );
            }

            $contrato->fill($data);

            $this->validarCronologia(
                $contrato
            );

            $veiculo = $this->veiculo(
                $tenantId,
                $contrato->veiculo_id
            );

            $contrato->valor_semanal =
                $veiculo?->valor_aluguel;

            $contrato->versao_atual =
                ((int) $contrato->versao_atual) + 1;

            $contrato->save();

            $this->guardarVersao(
                $contrato,
                $actor,
                'Atualização de campos'
            );

            $this->auditar(
                $contrato,
                $actor,
                'edicao',
                [
                    'campos_alterados' =>
                    array_keys($data),
                    'versao' =>
                    $contrato->versao_atual,
                ],
                $ip
            );

            return $this->carregar($contrato);
        });
    }

    public function encerrar(
        string $contratoId,
        string $tenantId,
        User $actor,
        ?string $dataFim = null,
        ?string $ip = null
    ): Contrato {
        return DB::transaction(function () use (
            $contratoId,
            $tenantId,
            $actor,
            $dataFim,
            $ip
        ) {
            $contrato = Contrato::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($contratoId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($contrato->status !== 'assinado') {
                throw ValidationException::withMessages([
                    'contrato' =>
                    'Apenas contratos ativos podem ser encerrados.',
                ]);
            }

            $contrato->status = 'encerrado';
            $contrato->bloqueado = true;

            $contrato->data_fim =
                $dataFim
                ?: $contrato->data_fim
                ?: today()->toDateString();

            $this->validarCronologia(
                $contrato
            );

            $contrato->save();

            ContratoAtivoVeiculo::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->where(
                    'contrato_id',
                    $contrato->id
                )
                ->where('ativo', true)
                ->update([
                    'ativo' => false,
                    'data_fim' => now(),
                ]);

            $this->auditar(
                $contrato,
                $actor,
                'encerramento',
                [
                    'data_fim' =>
                    $contrato->data_fim
                        ?->toDateString(),
                ],
                $ip
            );

            return $this->carregar($contrato);
        });
    }

    public function delete(
        string $contratoId,
        string $tenantId,
        User $actor,
        ?string $ip = null
    ): void {
        DB::transaction(function () use (
            $contratoId,
            $tenantId,
            $actor,
            $ip
        ) {
            $contrato = Contrato::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($contratoId)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $contrato->status === 'encerrado' ||
                $contrato->bloqueado
            ) {
                throw ValidationException::withMessages([
                    'contrato' =>
                    'Contratos encerrados ou bloqueados não podem ser eliminados.',
                ]);
            }

            $this->auditar(
                $contrato,
                $actor,
                'exclusao',
                [
                    'contrato_id' =>
                    $contrato->id,
                    'tipo' =>
                    $contrato->tipo,
                    'status' =>
                    $contrato->status,
                ],
                $ip
            );

            $contrato->delete();
        });
    }

    private function validarCronologia(
        Contrato $contrato
    ): void {
        if (
            !$contrato->data_inicio ||
            !$contrato->data_fim
        ) {
            return;
        }

        if (
            $contrato->data_fim
            ->lt(
                $contrato->data_inicio
            )
        ) {
            throw ValidationException::withMessages([
                'data_fim' =>
                'A data de fim deve ser igual ou posterior à data de início.',
            ]);
        }
    }

    private function guardarVersao(
        Contrato $contrato,
        User $actor,
        string $observacoes
    ): void {
        $versao = new VersaoContrato([
            'versao_numero' =>
            $contrato->versao_atual,
            'dados_campos' =>
            $contrato->campos_preenchidos ?? [],
            'criado_por' =>
            $actor->id,
            'observacoes' =>
            $observacoes,
        ]);

        $versao->contrato_id = $contrato->id;
        $versao->tenant_id = $contrato->tenant_id;

        $versao->save();
    }

    private function auditar(
        Contrato $contrato,
        User $actor,
        string $acao,
        array $detalhes,
        ?string $ip
    ): void {
        $log = new LogAuditoriaContrato([
            'acao' => $acao,
            'detalhes' => $detalhes,
            'ip_address' => $ip,
        ]);

        $log->contrato_id = $contrato->id;
        $log->tenant_id = $contrato->tenant_id;
        $log->user_id = $actor->id;

        $log->save();
    }

    private function guardarAssinatura(
        Contrato $contrato,
        array $dados,
        User $actor,
        ?string $ip,
        ?string $userAgent
    ): void {
        $remota = $dados['modo'] === 'remota';

        $assinatura = new AssinaturaDigital();

        $assinatura->contrato_id = $contrato->id;
        $assinatura->tenant_id = $contrato->tenant_id;

        $assinatura->signatario_tipo =
            $dados['signatario_tipo'];

        $assinatura->signatario_id =
            $dados['signatario_id'];

        $assinatura->signatario_user_id =
            $dados['signatario_user_id'];

        $assinatura->signatario_nome =
            $dados['signatario_nome'];

        $assinatura->signatario_email =
            $dados['signatario_email'];

        $assinatura->placeholder =
            $dados['placeholder'];

        if ($remota) {
            $assinatura->status = 'pendente';
            $assinatura->verificado = false;

            $assinatura->token_verificacao =
                Str::uuid()->toString();

            $assinatura->codigo_otp =
                (string) random_int(
                    100000,
                    999999
                );

            $assinatura->otp_expira_em =
                now()->addMinutes(30);

            $assinatura->solicitado_por =
                $actor->id;

            $assinatura->solicitado_em =
                now();
        } else {
            $assinatura->status = 'assinado';
            $assinatura->verificado = true;

            $assinatura->assinatura_url =
                $dados['assinatura_url'];

            $assinatura->assinado_em = now();
            $assinatura->ip_address = $ip;
            $assinatura->user_agent = $userAgent;

            $assinatura->hash_documento = hash(
                'sha256',
                implode('|', [
                    $contrato->id,
                    $dados['placeholder'],
                    $dados['assinatura_url'],
                ])
            );
        }

        $assinatura->save();
    }

    private function prepararAssinaturas(
        array $obrigatorias,
        array $input,
        ?Motorista $motorista,
        ?Proprietario $proprietario,
        ?Empresa $empresa,
        User $actor
    ): array {
        $porPlaceholder = [];

        foreach ($input as $indice => $assinatura) {
            $placeholder = mb_strtoupper(
                trim(
                    (string) (
                        $assinatura['placeholder']
                        ?? ''
                    )
                )
            );

            if (
                !in_array(
                    $placeholder,
                    self::ASSINATURAS,
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    "assinaturas.{$indice}.placeholder" =>
                    'Placeholder de assinatura inválido.',
                ]);
            }

            if (isset($porPlaceholder[$placeholder])) {
                throw ValidationException::withMessages([
                    'assinaturas' =>
                    'Não é permitido repetir o mesmo placeholder de assinatura.',
                ]);
            }

            $porPlaceholder[$placeholder] =
                $assinatura;
        }

        if ($obrigatorias === []) {
            if ($porPlaceholder !== []) {
                throw ValidationException::withMessages([
                    'assinaturas' =>
                    'O template selecionado não exige assinaturas.',
                ]);
            }

            return [];
        }

        $faltantes = array_diff(
            $obrigatorias,
            array_keys($porPlaceholder)
        );

        if ($faltantes !== []) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                'Faltam assinaturas obrigatórias: ' .
                    implode(', ', $faltantes) . '.',
            ]);
        }

        $extras = array_diff(
            array_keys($porPlaceholder),
            $obrigatorias
        );

        if ($extras !== []) {
            throw ValidationException::withMessages([
                'assinaturas' =>
                'Foram enviadas assinaturas que o template não exige.',
            ]);
        }

        $resultado = [];

        foreach ($obrigatorias as $placeholder) {
            $assinatura =
                $porPlaceholder[$placeholder];

            $modo =
                $assinatura['modo'] ?? null;

            if (
                !in_array(
                    $modo,
                    ['presencial', 'remota'],
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' =>
                    'Modo de assinatura inválido.',
                ]);
            }

            $target = $this->resolverSignatario(
                $placeholder,
                $assinatura,
                $motorista,
                $proprietario,
                $empresa
            );

            if ($modo === 'presencial') {
                if (
                    blank(
                        $assinatura['assinatura_url'] ?? null
                    )
                ) {
                    throw ValidationException::withMessages([
                        'assinaturas' =>
                        "A assinatura presencial {$placeholder} não possui imagem.",
                    ]);
                }
            }

            if ($modo === 'remota') {
                if (
                    blank($target['signatario_email']) ||
                    !filter_var(
                        $target['signatario_email'],
                        FILTER_VALIDATE_EMAIL
                    )
                ) {
                    throw ValidationException::withMessages([
                        'assinaturas' =>
                        "O signatário de {$placeholder} precisa de um e-mail válido para assinatura remota.",
                    ]);
                }
            }

            $resultado[] = array_merge(
                $target,
                [
                    'placeholder' =>
                    $placeholder,
                    'modo' =>
                    $modo,
                    'assinatura_url' =>
                    $assinatura['assinatura_url'] ?? null,
                ]
            );
        }

        return $resultado;
    }

    private function resolverSignatario(
        string $placeholder,
        array $input,
        ?Motorista $motorista,
        ?Proprietario $proprietario,
        ?Empresa $empresa
    ): array {
        if (
            $placeholder ===
            'ASSINATURA_MOTORISTA'
        ) {
            if (!$motorista) {
                throw ValidationException::withMessages([
                    'motorista_id' =>
                    'O template exige um motorista para assinatura.',
                ]);
            }

            return [
                'signatario_tipo' => 'motorista',
                'signatario_id' => $motorista->id,
                'signatario_user_id' =>
                $motorista->user_id,
                'signatario_nome' =>
                $motorista->nome_completo,
                'signatario_email' =>
                Str::lower(
                    trim(
                        (string) $motorista->email
                    )
                ),
            ];
        }

        if (
            $placeholder ===
            'ASSINATURA_PROPRIETARIO'
        ) {
            if (!$proprietario) {
                throw ValidationException::withMessages([
                    'proprietario_id' =>
                    'O template exige um proprietário para assinatura.',
                ]);
            }

            return [
                'signatario_tipo' =>
                'proprietario',
                'signatario_id' =>
                $proprietario->id,
                'signatario_user_id' =>
                $proprietario->user_id,
                'signatario_nome' =>
                $proprietario->nome_empresa
                    ?: $proprietario->nome_completo
                    ?: 'Proprietário',
                'signatario_email' =>
                Str::lower(
                    trim(
                        (string) $proprietario->email
                    )
                ),
            ];
        }

        if (
            $placeholder ===
            'ASSINATURA_EMPRESA'
        ) {
            if (!$empresa) {
                throw ValidationException::withMessages([
                    'empresa_id' =>
                    'O template exige uma empresa para assinatura.',
                ]);
            }

            return [
                'signatario_tipo' => 'empresa',
                'signatario_id' => $empresa->id,
                'signatario_user_id' => null,
                'signatario_nome' =>
                $empresa->nome_empresa
                    ?: 'Empresa',
                'signatario_email' =>
                Str::lower(
                    trim(
                        (string) $empresa->email
                    )
                ),
            ];
        }

        $nome = trim(
            (string) (
                $input['signatario_nome']
                ?? ''
            )
        );

        if ($nome === '') {
            throw ValidationException::withMessages([
                'assinaturas' =>
                'O nome da testemunha é obrigatório.',
            ]);
        }

        return [
            'signatario_tipo' => 'testemunha',
            'signatario_id' => null,
            'signatario_user_id' => null,
            'signatario_nome' => $nome,
            'signatario_email' =>
            Str::lower(
                trim(
                    (string) (
                        $input['signatario_email'] ?? ''
                    )
                )
            ),
        ];
    }

    private function assinaturasObrigatorias(
        ?TemplateContrato $template
    ): array {
        if (!$template) {
            return [];
        }

        $tokens = $this->extrairPlaceholders(
            (string) $template->conteudo_original
        );

        foreach (
            (array) $template->campos_detectados
            as $campo
        ) {
            if (is_string($campo)) {
                $tokens[] =
                    $this->normalizarPlaceholder(
                        $campo
                    );

                continue;
            }

            if (!is_array($campo)) {
                continue;
            }

            foreach (
                ['name', 'placeholder']
                as $chave
            ) {
                if (
                    isset($campo[$chave]) &&
                    is_string($campo[$chave])
                ) {
                    $tokens[] =
                        $this->normalizarPlaceholder(
                            $campo[$chave]
                        );
                }
            }
        }

        $tokens = array_values(
            array_unique(
                array_filter($tokens)
            )
        );

        return array_values(
            array_filter(
                self::ASSINATURAS,
                fn(string $assinatura) =>
                in_array(
                    $assinatura,
                    $tokens,
                    true
                )
            )
        );
    }

    private function extrairPlaceholders(
        string $conteudo
    ): array {
        if ($conteudo === '') {
            return [];
        }

        $patterns = [
            '/\{\{\s*([^{}]+?)\s*\}\}/u',
            '/\[\[\s*([^\[\]]+?)\s*\]\]/u',
            '/<<\s*([^<>]+?)\s*>>/u',
            '/__([A-Z0-9_\sÀ-ÿ]+)__/u',
            '/\(([A-Z0-9_\sÀ-ÿ]{2,})\)/u',
        ];

        $resultado = [];

        foreach ($patterns as $pattern) {
            preg_match_all(
                $pattern,
                $conteudo,
                $matches
            );

            foreach ($matches[1] ?? [] as $match) {
                $resultado[] =
                    $this->normalizarPlaceholder(
                        $match
                    );
            }
        }

        return $resultado;
    }

    private function normalizarPlaceholder(
        string $valor
    ): string {
        $valor = mb_strtoupper(
            Str::ascii(trim($valor))
        );

        $valor = preg_replace(
            '/[^A-Z0-9]+/',
            '_',
            $valor
        ) ?? '';

        $valor = preg_replace(
            '/_(DA|DO|DE|DAS|DOS)_/',
            '_',
            "_{$valor}_"
        ) ?? '';

        return trim(
            preg_replace(
                '/_+/',
                '_',
                $valor
            ) ?? '',
            '_'
        );
    }

    private function associarMotoristaVeiculo(
        Contrato $contrato
    ): void {
        if (
            !$contrato->motorista_id ||
            !$contrato->veiculo_id
        ) {
            return;
        }

        Motorista::query()
            ->where(
                'tenant_id',
                $contrato->tenant_id
            )
            ->whereKey(
                $contrato->motorista_id
            )
            ->lockForUpdate()
            ->firstOrFail();

        Veiculo::query()
            ->where(
                'tenant_id',
                $contrato->tenant_id
            )
            ->whereKey(
                $contrato->veiculo_id
            )
            ->lockForUpdate()
            ->firstOrFail();

        ContratoAtivoVeiculo::query()
            ->where(
                'tenant_id',
                $contrato->tenant_id
            )
            ->where(
                'motorista_id',
                $contrato->motorista_id
            )
            ->where('ativo', true)
            ->where(
                'veiculo_id',
                '!=',
                $contrato->veiculo_id
            )
            ->lockForUpdate()
            ->update([
                'ativo' => false,
                'data_fim' => now(),
            ]);

        $existente =
            ContratoAtivoVeiculo::query()
            ->where(
                'tenant_id',
                $contrato->tenant_id
            )
            ->where(
                'motorista_id',
                $contrato->motorista_id
            )
            ->where(
                'veiculo_id',
                $contrato->veiculo_id
            )
            ->where('ativo', true)
            ->lockForUpdate()
            ->first();

        if ($existente) {
            return;
        }

        $ativosNoVeiculo =
            ContratoAtivoVeiculo::query()
            ->where(
                'tenant_id',
                $contrato->tenant_id
            )
            ->where(
                'veiculo_id',
                $contrato->veiculo_id
            )
            ->where('ativo', true)
            ->lockForUpdate()
            ->count();

        if (
            $ativosNoVeiculo >=
            self::MAX_MOTORISTAS_ATIVOS_POR_VEICULO
        ) {
            throw ValidationException::withMessages([
                'veiculo_id' =>
                'Este veículo já possui 3 motoristas ativos.',
            ]);
        }

        $associacao = new ContratoAtivoVeiculo([
            'data_inicio' =>
            $contrato->data_inicio
                ?->copy()
                ->startOfDay()
                ?? now(),

            'ativo' => true,
        ]);

        $associacao->tenant_id =
            $contrato->tenant_id;

        $associacao->motorista_id =
            $contrato->motorista_id;

        $associacao->veiculo_id =
            $contrato->veiculo_id;

        $associacao->contrato_id =
            $contrato->id;

        $associacao->save();
    }

    private function template(
        string $tenantId,
        ?string $id
    ): ?TemplateContrato {
        if (!$id) {
            return null;
        }

        $model = TemplateContrato::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$model) {
            throw ValidationException::withMessages([
                'template_id' =>
                'Template inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function motorista(
        string $tenantId,
        ?string $id
    ): ?Motorista {
        if (!$id) {
            return null;
        }

        $model = Motorista::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$model) {
            throw ValidationException::withMessages([
                'motorista_id' =>
                'Motorista inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function proprietario(
        string $tenantId,
        ?string $id
    ): ?Proprietario {
        if (!$id) {
            return null;
        }

        $model = Proprietario::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$model) {
            throw ValidationException::withMessages([
                'proprietario_id' =>
                'Proprietário inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function veiculo(
        string $tenantId,
        ?string $id
    ): ?Veiculo {
        if (!$id) {
            return null;
        }

        $model = Veiculo::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$model) {
            throw ValidationException::withMessages([
                'veiculo_id' =>
                'Veículo inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function empresa(
        string $tenantId,
        ?string $id
    ): ?Empresa {
        if (!$id) {
            return null;
        }

        $model = Empresa::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$model) {
            throw ValidationException::withMessages([
                'empresa_id' =>
                'Empresa inválida para esta organização.',
            ]);
        }

        return $model;
    }

    private function carregar(
        Contrato $contrato
    ): Contrato {
        return $contrato->load([
            'template',
            'motorista',
            'proprietario',
            'veiculo',
            'versoes',
            'assinaturas',
        ]);
    }
}
