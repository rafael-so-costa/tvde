<?php

namespace App\Services;

use App\Models\AssinaturaDigital;
use App\Models\Contrato;
use App\Models\ContratoAtivoVeiculo;
use App\Models\ContratoRelacao;
use App\Models\Empresa;
use App\Models\LogAuditoriaContrato;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use App\Models\User;
use App\Models\Veiculo;
use App\Models\VersaoContrato;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ContratoService
{
    public function __construct(
        private ChecklistProcessService $checklistProcessService,
        private RemoteSignatureMailService $remoteSignatureMailService,
        private ContratoTipoResolverService $tipoResolver,
        private ContratoRelacionadoService $contratoRelacionadoService,
        private DocumentoRegistryService $documentoRegistryService
    ) {}

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
            $resolved = $this
                ->tipoResolver
                ->resolve(
                    $data,
                    $tenantId
                );

            $data = $resolved['data'];

            /** @var TipoContrato|null $tipoContrato */
            $tipoContrato =
                $resolved['tipo_contrato'];

            $workflowTemplate =
                $resolved['workflow'];

            $signatureConfiguration =
                $resolved['assinaturas_configuracao'];

            $assinaturasInput =
                $data['assinaturas'] ?? [];

            unset(
                $data['assinaturas']
            );

            $template = $this->template(
                $tenantId,
                $data['template_id'] ?? null
            );

            app(
                \App\Services\FrotaProContractRequiredDates::class
            )->assertValid(
                $data,
                $template,
                $tipoContrato
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
                $data['empresa_id'] ?? null
            );

            if ($tipoContrato) {
                $assinaturas =
                    $this
                        ->prepararAssinaturasConfiguradas(
                            $signatureConfiguration,
                            $assinaturasInput,
                            $motorista,
                            $proprietario,
                            $empresa,
                            $actor
                        );
            } else {
                $obrigatorias =
                    $this
                        ->assinaturasObrigatorias(
                            $template
                        );

                $assinaturas =
                    $this
                        ->prepararAssinaturas(
                            $obrigatorias,
                            $assinaturasInput,
                            $motorista,
                            $proprietario,
                            $empresa,
                            $actor
                        );
            }

            $campos =
                $data['campos_preenchidos']
                ?? [];

            foreach (
                $assinaturas as $assinatura
            ) {
                if (
                    $assinatura['modo']
                    === 'presencial' &&
                    filled(
                        $assinatura['assinatura_url']
                    )
                ) {
                    $campos[$assinatura['placeholder']] =
                        $assinatura['assinatura_url'];
                }
            }

            app(\App\Services\FrotaProDocumentReadinessGuard::class)
                ->assertFinancialFields((array)$campos);
            $data['campos_preenchidos'] =
                $campos;

            $contrato =
                new Contrato(
                    $data
                );

            $contrato->tenant_id =
                $tenantId;

            $contrato->status =
                'rascunho';

            $contrato->versao_atual =
                1;

            $contrato->bloqueado =
                false;

            $contrato->valor_semanal =
                $veiculo?->valor_aluguel;

            $this->validarCronologia(
                $contrato
            );

            if ($assinaturas !== []) {
                $todasAssinadas =
                    collect(
                        $assinaturas
                    )->every(
                        fn (array $assinatura) => $assinatura['modo']
                            === 'presencial'
                    );

                $contrato->status =
                    $todasAssinadas
                    ? 'assinado'
                    : 'enviado';

                if ($todasAssinadas) {
                    $contrato
                        ->data_assinatura =
                        now();
                }
            }

            foreach (
                $assinaturas as $assinatura
            ) {
                if (
                    $assinatura['placeholder'] ===
                    'ASSINATURA_MOTORISTA' &&
                    $assinatura['modo'] ===
                    'presencial'
                ) {
                    $contrato
                        ->assinatura_motorista_url =
                        $assinatura['assinatura_url'];
                }

                if (
                    $assinatura['placeholder'] ===
                    'ASSINATURA_PROPRIETARIO' &&
                    $assinatura['modo'] ===
                    'presencial'
                ) {
                    $contrato
                        ->assinatura_proprietario_url =
                        $assinatura['assinatura_url'];
                }
            }

            $contrato->save();

            $processTemplate =
                $tipoContrato
                ? $workflowTemplate
                : $template
                    ?->checklistProcessTemplate;

            if ($processTemplate) {
                $this
                    ->checklistProcessService
                    ->start(
                        $tenantId,
                        $processTemplate,
                        ChecklistProcessService::ENTITY_CONTRATO,
                        $contrato->id,
                        [
                            'contrato_tipo' => $contrato->tipo,

                            'tipo_contrato_id' => $tipoContrato?->id,

                            'tipo_contrato_codigo' => $tipoContrato?->codigo,

                            'template_contrato_id' => $template?->id,
                        ]
                    );
            }

            foreach (
                $assinaturas as $dadosAssinatura
            ) {
                $this->guardarAssinatura(
                    $contrato,
                    $dadosAssinatura,
                    $actor,
                    $ip,
                    $userAgent
                );

                if (
                    $dadosAssinatura['modo'] === 'presencial'
                ) {
                    $this
                        ->checklistProcessService
                        ->completeSignature(
                            $tenantId,
                            $contrato->id,
                            $dadosAssinatura['placeholder'],
                            [
                                'modo' => 'presencial',
                            ],
                            $actor->id
                        );
                }
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

                    'tipo_contrato_id' => $contrato
                        ->tipo_contrato_id,

                    'status' => $contrato->status,

                    'versao' => 1,
                ],
                $ip
            );

            if (
                $contrato->status ===
                'assinado' &&
                $this
                    ->deveAssociarMotoristaVeiculo(
                        $contrato,
                        $tipoContrato
                    )
            ) {
                $this
                    ->associarMotoristaVeiculo(
                        $contrato
                    );
            }

            return $this->carregar(
                $contrato
            );
        });
    }

    public function remoteSignaturePreview(
        string $token
    ): array {
        $assinatura =
            AssinaturaDigital::query()
                ->where(
                    'token_verificacao',
                    $token
                )
                ->with([
                    'contrato.template',
                    'contrato.motorista',
                    'contrato.proprietario',
                    'contrato.veiculo',
                ])
                ->firstOrFail();

        $contrato =
            $assinatura->contrato;

        if (
            ! $contrato ||
            $contrato->tenant_id !==
            $assinatura->tenant_id
        ) {
            abort(404);
        }

        $empresa = Empresa::query()
            ->where(
                'tenant_id',
                $contrato->tenant_id
            )
            ->first();

        return [
            'assinatura' => [
                'id' => $assinatura->id,
                'signatario_tipo' => $assinatura
                    ->signatario_tipo,
                'signatario_nome' => $assinatura
                    ->signatario_nome,
                'signatario_email' => $this->mascararEmail(
                    $assinatura
                        ->signatario_email
                ),
                'placeholder' => $assinatura
                    ->placeholder,
                'status' => $assinatura->status,
                'verificado' => $assinatura
                    ->verificado,
                'solicitado_em' => $assinatura
                    ->solicitado_em,
                'otp_expira_em' => $assinatura
                    ->otp_expira_em,
                'expirado' => ! $assinatura
                    ->verificado &&
                    $assinatura
                        ->otp_expira_em
                        ?->isPast() === true,
            ],

            'contrato' => [
                'id' => $contrato->id,
                'tipo' => $contrato->tipo,
                'status' => $contrato->status,
                'data_inicio' => $contrato
                    ->data_inicio,
                'data_fim' => $contrato
                    ->data_fim,
                'valor_diaria' => $contrato
                    ->valor_diaria,
                'valor_semanal' => $contrato
                    ->valor_semanal,
                'valor_caucao' => $contrato
                    ->valor_caucao,
                'valor_total' => $contrato
                    ->valor_total,
                'campos_preenchidos' => $contrato
                    ->campos_preenchidos,
                'versao_atual' => $contrato
                    ->versao_atual,
            ],

            'template' => $contrato->template
                ? [
                    'nome' => $contrato
                        ->template
                        ->nome,
                    'conteudo_original' => $contrato
                        ->template
                        ->conteudo_original,
                    'campos_detectados' => $contrato
                        ->template
                        ->campos_detectados,
                    'campos_mapeados' => $contrato
                        ->template
                        ->campos_mapeados,
                ]
                : null,

            'empresa' => $empresa
                ? [
                    'nome_empresa' => $empresa
                        ->nome_empresa,
                    'nif' => $empresa->nif,
                    'email' => $empresa->email,
                    'telemovel' => $empresa
                        ->telemovel,
                    'nome_gerente' => $empresa
                        ->nome_gerente,
                    'endereco_rua' => $empresa
                        ->endereco_rua,
                    'endereco_numero' => $empresa
                        ->endereco_numero,
                    'endereco_complemento' => $empresa
                        ->endereco_complemento,
                    'endereco_cep' => $empresa
                        ->endereco_cep,
                    'endereco_cidade' => $empresa
                        ->endereco_cidade,
                    'capital_social' => $empresa
                        ->capital_social,
                    'certificado_tvde' => $empresa
                        ->certificado_tvde,
                ]
                : null,

            'motorista' => $contrato->motorista
                ? [
                    'nome_completo' => $contrato
                        ->motorista
                        ->nome_completo,
                    'nif' => $contrato
                        ->motorista
                        ->nif,
                    'email' => $contrato
                        ->motorista
                        ->email,
                    'telemovel' => $contrato
                        ->motorista
                        ->telemovel,
                    'iban' => $contrato
                        ->motorista
                        ->iban,
                    'endereco_rua' => $contrato
                        ->motorista
                        ->endereco_rua,
                    'endereco_numero' => $contrato
                        ->motorista
                        ->endereco_numero,
                    'endereco_complemento' => $contrato
                        ->motorista
                        ->endereco_complemento,
                    'endereco_cep' => $contrato
                        ->motorista
                        ->endereco_cep,
                    'endereco_cidade' => $contrato
                        ->motorista
                        ->endereco_cidade,
                    'tipo_documento' => $contrato
                        ->motorista
                        ->tipo_documento,
                    'numero_documento' => $contrato
                        ->motorista
                        ->numero_documento,
                    'documento_valid_until' => $contrato
                        ->motorista
                        ->documento_valid_until,
                    'certificado_tvde' => $contrato
                        ->motorista
                        ->certificado_tvde,
                    'carta_numero' => $contrato
                        ->motorista
                        ->carta_numero,
                    'carta_valid_until' => $contrato
                        ->motorista
                        ->carta_valid_until,
                    'data_nascimento' => $contrato
                        ->motorista
                        ->data_nascimento,
                ]
                : null,

            'proprietario' => $contrato->proprietario
                ? [
                    'tipo' => $contrato
                        ->proprietario
                        ->tipo,
                    'nome_completo' => $contrato
                        ->proprietario
                        ->nome_completo,
                    'nome_empresa' => $contrato
                        ->proprietario
                        ->nome_empresa,
                    'nome_gerente' => $contrato
                        ->proprietario
                        ->nome_gerente,
                    'nif' => $contrato
                        ->proprietario
                        ->nif,
                    'email' => $contrato
                        ->proprietario
                        ->email,
                    'telemovel' => $contrato
                        ->proprietario
                        ->telemovel,
                    'iban' => $contrato
                        ->proprietario
                        ->iban,
                    'endereco_rua' => $contrato
                        ->proprietario
                        ->endereco_rua,
                    'endereco_numero' => $contrato
                        ->proprietario
                        ->endereco_numero,
                    'endereco_complemento' => $contrato
                        ->proprietario
                        ->endereco_complemento,
                    'endereco_cep' => $contrato
                        ->proprietario
                        ->endereco_cep,
                    'endereco_cidade' => $contrato
                        ->proprietario
                        ->endereco_cidade,
                    'tipo_documento' => $contrato
                        ->proprietario
                        ->tipo_documento,
                    'numero_documento' => $contrato
                        ->proprietario
                        ->numero_documento,
                    'documento_valid_until' => $contrato
                        ->proprietario
                        ->documento_valid_until,
                    'capital_social' => $contrato
                        ->proprietario
                        ->capital_social,
                ]
                : null,

            'veiculo' => $contrato->veiculo
                ? [
                    'matricula' => $contrato
                        ->veiculo
                        ->matricula,
                    'marca' => $contrato
                        ->veiculo
                        ->marca,
                    'modelo' => $contrato
                        ->veiculo
                        ->modelo,
                    'data_matricula' => $contrato
                        ->veiculo
                        ->data_matricula,
                    'chassi' => $contrato
                        ->veiculo
                        ->chassi,
                    'cilindrada' => $contrato
                        ->veiculo
                        ->cilindrada,
                    'potencia' => $contrato
                        ->veiculo
                        ->potencia,
                    'combustivel' => $contrato
                        ->veiculo
                        ->combustivel,
                    'lugares' => $contrato
                        ->veiculo
                        ->lugares,
                    'portas' => $contrato
                        ->veiculo
                        ->portas,
                    'cor' => $contrato
                        ->veiculo
                        ->cor,
                    'valor_caucao' => $contrato
                        ->veiculo
                        ->valor_caucao,
                    'valor_aluguel' => $contrato
                        ->veiculo
                        ->valor_aluguel,
                ]
                : null,
        ];
    }

    public function confirmRemoteSignature(
        string $token,
        string $otp,
        string $assinaturaDataUrl,
        ?string $ip = null,
        ?string $userAgent = null
    ): array {
        $binary =
            $this->decodeRemoteSignature(
                $assinaturaDataUrl
            );

        $storedPath = null;

        try {
            return DB::transaction(
                function () use (
                    $token,
                    $otp,
                    $binary,
                    $ip,
                    $userAgent,
                    &$storedPath
                ): array {
                    $assinatura =
                        AssinaturaDigital::query()
                            ->where(
                                'token_verificacao',
                                $token
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    if (
                        $assinatura->verificado ||
                        $assinatura->status ===
                        'assinado'
                    ) {
                        throw ValidationException::withMessages([
                            'assinatura' => 'Esta solicitação já foi assinada.',
                        ]);
                    }

                    if (
                        ! $assinatura
                            ->otp_expira_em ||
                        $assinatura
                            ->otp_expira_em
                            ->isPast()
                    ) {
                        throw ValidationException::withMessages([
                            'codigo_otp' => 'O código OTP expirou.',
                        ]);
                    }

                    if (
                        blank(
                            $assinatura->codigo_otp
                        ) ||
                        ! hash_equals(
                            (string)
                            $assinatura->codigo_otp,
                            $otp
                        )
                    ) {
                        throw ValidationException::withMessages([
                            'codigo_otp' => 'Código OTP inválido.',
                        ]);
                    }

                    $contrato =
                        Contrato::query()
                            ->where(
                                'tenant_id',
                                $assinatura
                                    ->tenant_id
                            )
                            ->whereKey(
                                $assinatura
                                    ->contrato_id
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    if (
                        $contrato->status !==
                        'enviado'
                    ) {
                        throw ValidationException::withMessages([
                            'contrato' => 'Este contrato não está disponível para assinatura remota.',
                        ]);
                    }

                    $storedPath =
                        'contract-signatures/'.
                        $contrato->tenant_id.
                        '/'.
                        $contrato->id.
                        '/'.
                        $assinatura->id.
                        '.png';

                    $stored =
                        Storage::disk('local')
                            ->put(
                                $storedPath,
                                $binary
                            );

                    if (! $stored) {
                        throw new RuntimeException(
                            'Não foi possível guardar a assinatura.'
                        );
                    }

                    $assinatura
                        ->assinatura_url =
                        $storedPath;

                    $assinatura->verificado =
                        true;

                    $assinatura->status =
                        'assinado';

                    $assinatura->assinado_em =
                        now();

                    $assinatura->ip_address =
                        $ip;

                    $assinatura->user_agent =
                        $userAgent;

                    $assinatura
                        ->hash_documento =
                        hash(
                            'sha256',
                            implode('|', [
                                $contrato->id,
                                $assinatura->id,
                                hash(
                                    'sha256',
                                    $binary
                                ),
                            ])
                        );

                    $assinatura->codigo_otp =
                        null;

                    $assinatura->token_verificacao =
                        null;

                    $assinatura->save();
                    $campos =
                        $contrato
                            ->campos_preenchidos
                        ?? [];

                    if (
                        filled(
                            $assinatura
                                ->placeholder
                        )
                    ) {
                        $campos[$assinatura
                            ->placeholder] = $storedPath;
                    }

                    $contrato
                        ->campos_preenchidos =
                        $campos;

                    if (
                        $assinatura
                            ->placeholder ===
                        'ASSINATURA_MOTORISTA'
                    ) {
                        $contrato
                            ->assinatura_motorista_url =
                            $storedPath;
                    }

                    if (
                        $assinatura
                            ->placeholder ===
                        'ASSINATURA_PROPRIETARIO'
                    ) {
                        $contrato
                            ->assinatura_proprietario_url =
                            $storedPath;
                    }

                    $pendentes =
                        AssinaturaDigital::query()
                            ->where(
                                'tenant_id',
                                $contrato
                                    ->tenant_id
                            )
                            ->where(
                                'contrato_id',
                                $contrato->id
                            )
                            ->where(
                                function (
                                    $query
                                ) {
                                    $query
                                        ->where(
                                            'status',
                                            '!=',
                                            'assinado'
                                        )
                                        ->orWhere(
                                            'verificado',
                                            false
                                        );
                                }
                            )
                            ->exists();

                    $contratoAssinado =
                        ! $pendentes;

                    if ($contratoAssinado) {
                        $contrato->status =
                            'assinado';

                        $contrato
                            ->data_assinatura =
                            now();
                    }

                    $contrato->save();

                    $this
                        ->documentoRegistryService
                        ->sync(
                            $contrato
                        );

                    $actor =
                        $assinatura
                            ->signatario_user_id
                            ? User::query()
                                ->find(
                                    $assinatura
                                        ->signatario_user_id
                                )
                        : null;

                    if (
                        $contratoAssinado
                    ) {
                        $this
                            ->contratoRelacionadoService
                            ->syncByRelatedContract(
                                $contrato->tenant_id,
                                $contrato->id,
                                $actor?->id
                            );
                    }

                    $this
                        ->checklistProcessService
                        ->completeSignature(
                            $contrato->tenant_id,
                            $contrato->id,
                            $assinatura->placeholder,
                            [
                                'modo' => 'remota',

                                'assinatura_id' => $assinatura->id,
                            ],
                            $actor?->id
                        );

                    $this->auditar(
                        $contrato,
                        $actor,
                        'assinatura_remota',
                        [
                            'assinatura_id' => $assinatura->id,
                            'placeholder' => $assinatura
                                ->placeholder,
                            'signatario_tipo' => $assinatura
                                ->signatario_tipo,
                            'contrato_assinado' => $contratoAssinado,
                        ],
                        $ip
                    );

                    if (
                        $contratoAssinado &&
                        $this
                            ->deveAssociarMotoristaVeiculo(
                                $contrato
                            )
                    ) {
                        $this
                            ->associarMotoristaVeiculo(
                                $contrato
                            );
                    }

                    return [
                        'assinatura_id' => $assinatura->id,
                        'status' => $assinatura->status,
                        'verificado' => $assinatura
                            ->verificado,
                        'assinado_em' => $assinatura
                            ->assinado_em,
                        'contrato_id' => $contrato->id,
                        'contrato_status' => $contrato->status,
                    ];
                }
            );
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('local')
                    ->delete(
                        $storedPath
                    );
            }

            throw $exception;
        }
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
                    'contrato' => 'Apenas contratos em rascunho e não bloqueados podem ser editados.',
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

            if(array_key_exists('campos_preenchidos',$data)){
                $data=app(
                    FrotaProContractBillingIntegration::class
                )->forRequest(
                    $data,
                    $contrato->tipoContrato,
                    $contrato->template
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

            if (
                $contrato
                    ->documento()
                    ->exists()
            ) {
                $this
                    ->documentoRegistryService
                    ->sync(
                        $contrato
                    );
            }

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
                    'campos_alterados' => array_keys($data),
                    'versao' => $contrato->versao_atual,
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
                    'contrato' => 'Apenas contratos ativos podem ser encerrados.',
                ]);
            }

            $this->validarWorkflowAntesDoEncerramento(
                $contrato
            );

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

            $this
                ->documentoRegistryService
                ->sync(
                    $contrato
                );

            $this
                ->contratoRelacionadoService
                ->syncByRelatedContract(
                    $tenantId,
                    $contrato->id,
                    $actor->id
                );

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
                    'data_fim' => $contrato->data_fim
                        ?->toDateString(),
                ],
                $ip
            );

            return $this->carregar($contrato);
        });
    }

    private function validarWorkflowAntesDoEncerramento(
        Contrato $contrato
    ): void {
        $run =
            $contrato
                ->checklistProcessRun()
                ->with(
                    'items'
                )
                ->first();

        if (! $run) {
            return;
        }

        $recolha =
            $run
                ->items
                ->first(
                    fn ($item) => $item->tipo ===
                            'checklist_veiculo' &&
                        data_get(
                            $item->configuracao_snapshot,
                            'checklist_tipo'
                        ) === 'recolha'
                );

        if (! $recolha) {
            return;
        }

        $pendentes =
            $run
                ->items
                ->filter(
                    fn ($item) => $item->obrigatorio &&
                        $item->ordem <
                            $recolha->ordem &&
                        ! in_array(
                            $item->status,
                            [
                                ChecklistProcessService::ITEM_DONE,
                                ChecklistProcessService::ITEM_WAIVED,
                            ],
                            true
                        )
                );

        if ($pendentes->isEmpty()) {
            return;
        }

        $primeira =
            $pendentes
                ->sortBy(
                    'ordem'
                )
                ->first();

        throw ValidationException::withMessages([
            'contrato' => 'Antes de encerrar o contrato, conclua a etapa obrigatória: '.
                ($primeira?->titulo_snapshot ?? 'etapa pendente').
                '.',
        ]);
    }

    public function resendRemoteSignature(
        string $contratoId,
        string $assinaturaId,
        string $tenantId,
        User $actor,
        ?string $ip = null
    ): AssinaturaDigital {
        $assinatura =
            DB::transaction(
                function () use (
                    $contratoId,
                    $assinaturaId,
                    $tenantId,
                    $actor
                ) {
                    $contrato =
                        Contrato::query()
                            ->where(
                                'tenant_id',
                                $tenantId
                            )
                            ->whereKey(
                                $contratoId
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    $assinatura =
                        AssinaturaDigital::query()
                            ->where(
                                'tenant_id',
                                $tenantId
                            )
                            ->where(
                                'contrato_id',
                                $contrato->id
                            )
                            ->whereKey(
                                $assinaturaId
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    if (
                        $assinatura
                            ->status !==
                            'pendente' ||
                            $assinatura
                                ->verificado ||
                                filled(
                                    $assinatura
                                        ->assinatura_url
                                )
                    ) {
                        throw ValidationException::withMessages([
                            'assinatura' => 'Apenas assinaturas remotas pendentes podem ser reenviadas.',
                        ]);
                    }

                    $email = strtolower(
                        trim(
                            (string)
                            $assinatura
                                ->signatario_email
                        )
                    );

                    if (
                        ! filter_var(
                            $email,
                            FILTER_VALIDATE_EMAIL
                        )
                    ) {
                        throw ValidationException::withMessages([
                            'assinatura' => 'O signatário não possui um e-mail válido.',
                        ]);
                    }

                    $assinatura
                        ->token_verificacao =
                        Str::uuid()
                            ->toString();

                    $assinatura
                        ->codigo_otp =
                        (string)
                        random_int(
                            100000,
                            999999
                        );

                    $assinatura
                        ->otp_expira_em =
                        now()
                            ->addMinutes(
                                30
                            );

                    $assinatura
                        ->solicitado_por =
                        $actor->id;

                    $assinatura
                        ->solicitado_em =
                        now();

                    $assinatura->save();

                    return $assinatura;
                }
            );

        try {
            $this
                ->remoteSignatureMailService
                ->send(
                    $assinatura
                );
        } catch (
            Throwable $exception
        ) {
            Log::warning(
                'Falha ao reenviar assinatura remota.',
                [
                    'contrato_id' => $contratoId,

                    'assinatura_id' => $assinaturaId,

                    'exception' => $exception::class,

                    'message' => $exception
                        ->getMessage(),
                ]
            );

            throw ValidationException::withMessages([
                'assinatura' => 'Não foi possível enviar o e-mail de assinatura. Tente novamente.',
            ]);
        }

        $contrato =
            Contrato::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->findOrFail(
                    $contratoId
                );

        $this->auditar(
            $contrato,
            $actor,
            'reenvio_assinatura_remota',
            [
                'assinatura_id' => $assinatura->id,

                'placeholder' => $assinatura
                    ->placeholder,

                'signatario_tipo' => $assinatura
                    ->signatario_tipo,
            ],
            $ip
        );

        return $assinatura
            ->fresh();
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
                    'contrato' => 'Contratos encerrados ou bloqueados não podem ser eliminados.',
                ]);
            }

            if (
                ContratoRelacao::query()
                    ->where(
                        'tenant_id',
                        $tenantId
                    )
                    ->where(
                        'contrato_relacionado_id',
                        $contrato->id
                    )
                    ->exists()
            ) {
                throw ValidationException::withMessages([
                    'contrato' => 'Este contrato está relacionado com outro processo e não pode ser eliminado.',
                ]);
            }

            $this->auditar(
                $contrato,
                $actor,
                'exclusao',
                [
                    'contrato_id' => $contrato->id,
                    'tipo' => $contrato->tipo,
                    'status' => $contrato->status,
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
            ! $contrato->data_inicio ||
            ! $contrato->data_fim
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
                'data_fim' => 'A data de fim deve ser igual ou posterior à data de início.',
            ]);
        }
    }

    private function decodeRemoteSignature(
        string $dataUrl
    ): string {
        $prefix =
            'data:image/png;base64,';

        if (
            ! str_starts_with(
                $dataUrl,
                $prefix
            )
        ) {
            throw ValidationException::withMessages([
                'assinatura' => 'A assinatura deve ser uma imagem PNG válida.',
            ]);
        }

        $binary = base64_decode(
            substr(
                $dataUrl,
                strlen($prefix)
            ),
            true
        );

        if (
            $binary === false ||
            ! str_starts_with(
                $binary,
                "\x89PNG\r\n\x1a\n"
            )
        ) {
            throw ValidationException::withMessages([
                'assinatura' => 'A assinatura deve ser uma imagem PNG válida.',
            ]);
        }

        if (
            strlen($binary) >
            1024 * 1024
        ) {
            throw ValidationException::withMessages([
                'assinatura' => 'A assinatura não pode exceder 1 MB.',
            ]);
        }

        return $binary;
    }

    private function mascararEmail(
        string $email
    ): string {
        $parts = explode(
            '@',
            $email,
            2
        );

        if (count($parts) !== 2) {
            return '';
        }

        [$local, $domain] =
            $parts;

        $visible =
            mb_substr(
                $local,
                0,
                min(
                    2,
                    mb_strlen($local)
                )
            );

        return $visible.
            str_repeat(
                '*',
                max(
                    3,
                    mb_strlen($local) - 2
                )
            ).
            '@'.
            $domain;
    }

    private function guardarVersao(
        Contrato $contrato,
        User $actor,
        string $observacoes
    ): void {
        $versao = new VersaoContrato([
            'versao_numero' => $contrato->versao_atual,
            'dados_campos' => $contrato->campos_preenchidos ?? [],
            'criado_por' => $actor->id,
            'observacoes' => $observacoes,
        ]);

        $versao->contrato_id = $contrato->id;
        $versao->tenant_id = $contrato->tenant_id;

        $versao->save();
    }

    private function auditar(
        Contrato $contrato,
        ?User $actor,
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
        $log->user_id =
            $actor?->id;

        $log->save();
    }

    private function guardarAssinatura(
        Contrato $contrato,
        array $dados,
        User $actor,
        ?string $ip,
        ?string $userAgent
    ): AssinaturaDigital {
        $remota = $dados['modo'] === 'remota';

        $assinatura = new AssinaturaDigital;

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
        if ($remota) {
            $assinaturaId =
                $assinatura->id;

            DB::afterCommit(
                function () use (
                    $assinaturaId
                ): void {
                    $pendente =
                        AssinaturaDigital::query()
                            ->find(
                                $assinaturaId
                            );

                    if (
                        ! $pendente ||
                        $pendente->status !==
                        'pendente' ||
                        $pendente->verificado
                    ) {
                        return;
                    }

                    try {
                        $this
                            ->remoteSignatureMailService
                            ->send(
                                $pendente
                            );
                    } catch (
                        Throwable $exception
                    ) {
                        Log::warning(
                            'Falha ao enviar solicitação de assinatura remota.',
                            [
                                'assinatura_id' => $assinaturaId,

                                'exception' => $exception::class,

                                'message' => $exception
                                    ->getMessage(),
                            ]
                        );
                    }
                }
            );
        }

        return $assinatura;
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
                ! in_array(
                    $placeholder,
                    self::ASSINATURAS,
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    "assinaturas.{$indice}.placeholder" => 'Placeholder de assinatura inválido.',
                ]);
            }

            if (isset($porPlaceholder[$placeholder])) {
                throw ValidationException::withMessages([
                    'assinaturas' => 'Não é permitido repetir o mesmo placeholder de assinatura.',
                ]);
            }

            $porPlaceholder[$placeholder] =
                $assinatura;
        }

        if ($obrigatorias === []) {
            if ($porPlaceholder !== []) {
                throw ValidationException::withMessages([
                    'assinaturas' => 'O template selecionado não exige assinaturas.',
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
                'assinaturas' => 'Faltam assinaturas obrigatórias: '.
                    implode(', ', $faltantes).'.',
            ]);
        }

        $extras = array_diff(
            array_keys($porPlaceholder),
            $obrigatorias
        );

        if ($extras !== []) {
            throw ValidationException::withMessages([
                'assinaturas' => 'Foram enviadas assinaturas que o template não exige.',
            ]);
        }

        $resultado = [];

        foreach ($obrigatorias as $placeholder) {
            $assinatura =
                $porPlaceholder[$placeholder];

            $modo =
                $assinatura['modo'] ?? null;

            if (
                ! in_array(
                    $modo,
                    ['presencial', 'remota'],
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' => 'Modo de assinatura inválido.',
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
                        'assinaturas' => "A assinatura presencial {$placeholder} não possui imagem.",
                    ]);
                }
            }

            if ($modo === 'remota') {
                if (
                    blank($target['signatario_email']) ||
                    ! filter_var(
                        $target['signatario_email'],
                        FILTER_VALIDATE_EMAIL
                    )
                ) {
                    throw ValidationException::withMessages([
                        'assinaturas' => "O signatário de {$placeholder} precisa de um e-mail válido para assinatura remota.",
                    ]);
                }
            }

            $resultado[] = array_merge(
                $target,
                [
                    'placeholder' => $placeholder,
                    'modo' => $modo,
                    'assinatura_url' => $assinatura['assinatura_url'] ?? null,
                ]
            );
        }

        return $resultado;
    }

    private function prepararAssinaturasConfiguradas(
        array $configuracoes,
        array $input,
        ?Motorista $motorista,
        ?Proprietario $proprietario,
        ?Empresa $empresa,
        User $actor
    ): array {
        $porPlaceholder = [];

        foreach (
            $input as $indice => $assinatura
        ) {
            $placeholder =
                mb_strtoupper(
                    trim(
                        (string) (
                            $assinatura['placeholder'] ?? ''
                        )
                    )
                );

            if (
                ! in_array(
                    $placeholder,
                    self::ASSINATURAS,
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    "assinaturas.{$indice}.placeholder" => 'Placeholder de assinatura inválido.',
                ]);
            }

            if (
                isset(
                    $porPlaceholder[$placeholder]
                )
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' => 'Não é permitido repetir o mesmo placeholder de assinatura.',
                ]);
            }

            $porPlaceholder[$placeholder] = $assinatura;
        }

        $configByPlaceholder = [];

        foreach (
            $configuracoes as $configuracao
        ) {
            $placeholder =
                $configuracao['placeholder'] ?? null;

            if (! $placeholder) {
                continue;
            }

            $configByPlaceholder[$placeholder] = $configuracao;
        }

        $obrigatorias =
            collect(
                $configByPlaceholder
            )
                ->filter(
                    fn (array $config) => (bool) (
                        $config['obrigatoria'] ?? true
                    )
                )
                ->keys()
                ->values()
                ->all();

        $faltantes = array_diff(
            $obrigatorias,
            array_keys(
                $porPlaceholder
            )
        );

        if ($faltantes !== []) {
            throw ValidationException::withMessages([
                'assinaturas' => 'Faltam assinaturas obrigatórias: '.
                    implode(
                        ', ',
                        $faltantes
                    ).
                    '.',
            ]);
        }

        $extras = array_diff(
            array_keys(
                $porPlaceholder
            ),
            array_keys(
                $configByPlaceholder
            )
        );

        if ($extras !== []) {
            throw ValidationException::withMessages([
                'assinaturas' => 'Foram enviadas assinaturas não permitidas para este tipo de contrato.',
            ]);
        }

        $resultado = [];

        foreach (
            $configByPlaceholder as $placeholder => $configuracao
        ) {
            if (
                ! isset(
                    $porPlaceholder[$placeholder]
                )
            ) {
                continue;
            }

            $assinatura =
                $porPlaceholder[$placeholder];

            $modo =
                strtolower(
                    trim(
                        (string) (
                            $assinatura['modo'] ?? ''
                        )
                    )
                );

            $modosPermitidos =
                (array) (
                    $configuracao['modos'] ?? [
                        'presencial',
                        'remota',
                    ]
                );

            if (
                ! in_array(
                    $modo,
                    $modosPermitidos,
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' => "O modo {$modo} não é permitido para {$placeholder}.",
                ]);
            }

            $target =
                $this
                    ->resolverSignatario(
                        $placeholder,
                        $assinatura,
                        $motorista,
                        $proprietario,
                        $empresa
                    );

            if (
                $modo === 'presencial' &&
                blank(
                    $assinatura['assinatura_url'] ?? null
                )
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' => "A assinatura presencial {$placeholder} não possui imagem.",
                ]);
            }

            if (
                $modo === 'remota' &&
                (
                    blank(
                        $target['signatario_email']
                    ) ||
                    ! filter_var(
                        $target['signatario_email'],
                        FILTER_VALIDATE_EMAIL
                    )
                )
            ) {
                throw ValidationException::withMessages([
                    'assinaturas' => "O signatário de {$placeholder} precisa de um e-mail válido para assinatura remota.",
                ]);
            }

            $resultado[] =
                array_merge(
                    $target,
                    [
                        'placeholder' => $placeholder,

                        'modo' => $modo,

                        'assinatura_url' => $assinatura['assinatura_url'] ?? null,
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
            if (! $motorista) {
                throw ValidationException::withMessages([
                    'motorista_id' => 'O template exige um motorista para assinatura.',
                ]);
            }

            return [
                'signatario_tipo' => 'motorista',
                'signatario_id' => $motorista->id,
                'signatario_user_id' => $motorista->user_id,
                'signatario_nome' => $motorista->nome_completo,
                'signatario_email' => Str::lower(
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
            if (! $proprietario) {
                throw ValidationException::withMessages([
                    'proprietario_id' => 'O template exige um proprietário para assinatura.',
                ]);
            }

            return [
                'signatario_tipo' => 'proprietario',
                'signatario_id' => $proprietario->id,
                'signatario_user_id' => $proprietario->user_id,
                'signatario_nome' => $proprietario->nome_empresa
                    ?: $proprietario->nome_completo
                    ?: 'Proprietário',
                'signatario_email' => Str::lower(
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
            if (! $empresa) {
                throw ValidationException::withMessages([
                    'empresa_id' => 'O template exige uma empresa para assinatura.',
                ]);
            }

            return [
                'signatario_tipo' => 'empresa',
                'signatario_id' => $empresa->id,
                'signatario_user_id' => null,
                'signatario_nome' => $empresa->nome_empresa
                    ?: 'Empresa',
                'signatario_email' => Str::lower(
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
                'assinaturas' => 'O nome da testemunha é obrigatório.',
            ]);
        }

        return [
            'signatario_tipo' => 'testemunha',
            'signatario_id' => null,
            'signatario_user_id' => null,
            'signatario_nome' => $nome,
            'signatario_email' => Str::lower(
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
        if (! $template) {
            return [];
        }

        $tokens = $this->extrairPlaceholders(
            (string) $template->conteudo_original
        );

        foreach (
            (array) $template->campos_detectados as $campo
        ) {
            if (is_string($campo)) {
                $tokens[] =
                    $this->normalizarPlaceholder(
                        $campo
                    );

                continue;
            }

            if (! is_array($campo)) {
                continue;
            }

            foreach (
                ['name', 'placeholder'] as $chave
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
                fn (string $assinatura) => in_array(
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

    private function deveAssociarMotoristaVeiculo(
        Contrato $contrato,
        ?TipoContrato $tipoContrato = null
    ): bool {
        if ($contrato->tipo_contrato_id) {
            $tipoContrato ??=
                TipoContrato::query()
                    ->where(
                        'tenant_id',
                        $contrato->tenant_id
                    )
                    ->find(
                        $contrato
                            ->tipo_contrato_id
                    );

            return (bool) data_get(
                $tipoContrato
                    ?->configuracao,
                'associar_motorista_veiculo',
                false
            );
        }

        return $contrato->tipo ===
            'aluguer';
    }

    private function associarMotoristaVeiculo(
        Contrato $contrato
    ): void {
        if (
            ! $contrato->motorista_id ||
            ! $contrato->veiculo_id
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
                'veiculo_id' => 'Este veículo já possui 3 motoristas ativos.',
            ]);
        }

        $associacao = new ContratoAtivoVeiculo([
            'data_inicio' => $contrato->data_inicio
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
        if (! $id) {
            return null;
        }

        $model = TemplateContrato::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->with(
                'checklistProcessTemplate.items'
            )
            ->find($id);

        if (! $model) {
            throw ValidationException::withMessages([
                'template_id' => 'Template inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function motorista(
        string $tenantId,
        ?string $id
    ): ?Motorista {
        if (! $id) {
            return null;
        }

        $model = Motorista::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (! $model) {
            throw ValidationException::withMessages([
                'motorista_id' => 'Motorista inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function proprietario(
        string $tenantId,
        ?string $id
    ): ?Proprietario {
        if (! $id) {
            return null;
        }

        $model = Proprietario::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (! $model) {
            throw ValidationException::withMessages([
                'proprietario_id' => 'Proprietário inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function veiculo(
        string $tenantId,
        ?string $id
    ): ?Veiculo {
        if (! $id) {
            return null;
        }

        $model = Veiculo::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (! $model) {
            throw ValidationException::withMessages([
                'veiculo_id' => 'Veículo inválido para esta organização.',
            ]);
        }

        return $model;
    }

    private function empresa(
        string $tenantId,
        ?string $id
    ): ?Empresa {
        if (! $id) {
            return null;
        }

        $model = Empresa::query()
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (! $model) {
            throw ValidationException::withMessages([
                'empresa_id' => 'Empresa inválida para esta organização.',
            ]);
        }

        return $model;
    }

    private function carregar(
        Contrato $contrato
    ): Contrato {
        return $contrato->load([
            'tipoContrato',
            'template.checklistProcessTemplate.items',
            'empresa',
            'motorista',
            'proprietario',
            'veiculo',
            'versoes',
            'assinaturas',
            'checklists',
            'checklistProcessRun.items',
        ]);
    }
}
