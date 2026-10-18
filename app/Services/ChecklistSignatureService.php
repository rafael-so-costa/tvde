<?php

namespace App\Services;

use App\Mail\ChecklistRemoteSignatureRequestMail;
use App\Models\ChecklistAssinatura;
use App\Models\ChecklistRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ChecklistSignatureService
{
    public function __construct(
        private ChecklistPdfService $pdfService
    ) {}

    public function prepare(
        ChecklistRecord $checklist,
        array $data,
        string $userId
    ):array{
        if(
            $checklist->estado!==
            'rascunho'
        ){
            throw ValidationException::withMessages([
                'checklist'=>
                    'Apenas checklists em rascunho podem iniciar assinaturas.',
            ]);
        }

        $stored=[];

        try{
            DB::transaction(
                function() use(
                    $checklist,
                    $data,
                    $userId,
                    &$stored
                ){
                    $locked=
                        ChecklistRecord::query()
                            ->where(
                                'tenant_id',
                                $checklist->tenant_id
                            )
                            ->whereKey(
                                $checklist->id
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    $locked
                        ->assinaturas()
                        ->delete();

                    foreach(
                        [
                            'empresa',
                            'motorista',
                        ] as $papel
                    ){
                        $config=
                            $data[
                                $papel
                            ];

                        $assinatura=
                            new ChecklistAssinatura();

                        $assinatura
                            ->checklist_record_id=
                            $locked->id;

                        $assinatura->tenant_id=
                            $locked->tenant_id;

                        $assinatura->papel=
                            $papel;

                        $assinatura->modo=
                            $config[
                                'modo'
                            ];

                        $assinatura
                            ->signatario_nome=
                            trim(
                                $config[
                                    'nome'
                                ]
                            );

                        $assinatura
                            ->signatario_email=
                            filled(
                                $config[
                                    'email'
                                ] ?? null
                            )
                                ?strtolower(
                                    trim(
                                        $config[
                                            'email'
                                        ]
                                    )
                                )
                                :null;

                        $assinatura
                            ->solicitado_por=
                            $userId;

                        $assinatura
                            ->solicitado_em=
                            now();

                        if(
                            $config[
                                'modo'
                            ]===
                            'presencial'
                        ){
                            $binary=
                                $this
                                    ->decodeSignature(
                                        $config[
                                            'assinatura'
                                        ]
                                    );

                            $path=
                                'checklist-signatures/'.
                                $locked
                                    ->tenant_id.
                                '/'.
                                $locked->id.
                                '/'.
                                $papel.
                                '.png';

                            if(
                                !Storage::disk(
                                    'local'
                                )->put(
                                    $path,
                                    $binary
                                )
                            ){
                                throw new RuntimeException(
                                    'Não foi possível guardar a assinatura presencial.'
                                );
                            }

                            $stored[]=
                                $path;

                            $assinatura
                                ->assinatura_path=
                                $path;

                            $assinatura->status=
                                'assinado';

                            $assinatura->verificado=
                                true;

                            $assinatura
                                ->assinado_em=
                                now();
                        }
                        else{
                            $assinatura
                                ->token_verificacao=
                                (string)
                                Str::uuid();

                            $assinatura
                                ->codigo_otp=
                                (string)
                                random_int(
                                    100000,
                                    999999
                                );

                            $assinatura
                                ->otp_expira_em=
                                now()
                                    ->addMinutes(
                                        30
                                    );

                            $assinatura->status=
                                'pendente';
                        }

                        $assinatura->save();
                    }

                    $hasRemote=
                        $locked
                            ->assinaturas()
                            ->where(
                                'modo',
                                'remota'
                            )
                            ->exists();

                    $locked->estado=
                        $hasRemote
                            ?'aguardando_assinaturas'
                            :'rascunho';

                    $locked->save();
                }
            );
        }
        catch(Throwable $exception){
            foreach(
                $stored as $path
            ){
                Storage::disk(
                    'local'
                )->delete(
                    $path
                );
            }

            throw $exception;
        }

        $checklist=
            ChecklistRecord::query()
                ->whereKey(
                    $checklist->id
                )
                ->with(
                    'assinaturas'
                )
                ->firstOrFail();

        foreach(
            $checklist
                ->assinaturas
                ->where(
                    'modo',
                    'remota'
                ) as $assinatura
        ){
            $this->sendRemote(
                $assinatura
            );
        }

        if(
            $checklist
                ->assinaturas
                ->where(
                    'status',
                    '!=',
                    'assinado'
                )
                ->isEmpty()
        ){
            $checklist=
                $this->finalize(
                    $checklist
                );

            return[
                'estado'=>
                    'finalizado',

                'checklist'=>
                    $checklist,
            ];
        }

        return[
            'estado'=>
                'aguardando_assinaturas',

            'checklist'=>
                $checklist,

            'assinaturas'=>
                $checklist
                    ->assinaturas
                    ->map(
                        fn(
                            ChecklistAssinatura $item
                        )=>[
                            'id'=>
                                $item->id,

                            'papel'=>
                                $item->papel,

                            'modo'=>
                                $item->modo,

                            'status'=>
                                $item->status,

                            'signatario_nome'=>
                                $item
                                    ->signatario_nome,

                            'signatario_email'=>
                                $item
                                    ->signatario_email,

                            'otp_expira_em'=>
                                $item
                                    ->otp_expira_em,
                        ]
                    )
                    ->values(),
        ];
    }

    public function preview(
        string $token
    ):array{
        $assinatura=
            ChecklistAssinatura::query()
                ->where(
                    'token_verificacao',
                    $token
                )
                ->with([
                    'checklist.motorista',
                    'checklist.veiculo',
                ])
                ->firstOrFail();

        $checklist=
            $assinatura
                ->checklist;

        return[
            'assinatura'=>[
                'id'=>
                    $assinatura->id,

                'papel'=>
                    $assinatura->papel,

                'signatario_nome'=>
                    $assinatura
                        ->signatario_nome,

                'signatario_email'=>
                    $assinatura
                        ->signatario_email,

                'status'=>
                    $assinatura->status,

                'expirado'=>
                    !$assinatura
                        ->otp_expira_em ||
                    $assinatura
                        ->otp_expira_em
                        ->isPast(),

                'otp_expira_em'=>
                    $assinatura
                        ->otp_expira_em,
            ],

            'checklist'=>[
                'id'=>
                    $checklist->id,

                'tipo'=>
                    $checklist->tipo,

                'estado'=>
                    $checklist->estado,

                'data_operacao'=>
                    $checklist
                        ->data_operacao,

                'motorista_nome'=>
                    $checklist
                        ->motorista_nome_snapshot,

                'matricula'=>
                    $checklist
                        ->matricula_snapshot,

                'modelo'=>
                    $checklist
                        ->modelo_snapshot,

                'quilometragem'=>
                    $checklist
                        ->quilometragem,

                'nivel_combustivel'=>
                    $checklist
                        ->nivel_combustivel,

                'observacoes'=>
                    $checklist
                        ->observacoes,
            ],
        ];
    }

    public function confirm(
        string $token,
        string $otp,
        string $signature,
        ?string $ip,
        ?string $userAgent
    ):array{
        $binary=
            $this->decodeSignature(
                $signature
            );

        $storedPath=null;

        try{
            $assinatura=
                DB::transaction(
                    function() use(
                        $token,
                        $otp,
                        $binary,
                        $ip,
                        $userAgent,
                        &$storedPath
                    ){
                        $assinatura=
                            ChecklistAssinatura::query()
                                ->where(
                                    'token_verificacao',
                                    $token
                                )
                                ->lockForUpdate()
                                ->firstOrFail();

                        if(
                            $assinatura->status!==
                            'pendente'
                        ){
                            throw ValidationException::withMessages([
                                'assinatura'=>
                                    'Esta assinatura já foi concluída.',
                            ]);
                        }

                        if(
                            !$assinatura
                                ->otp_expira_em ||
                            $assinatura
                                ->otp_expira_em
                                ->isPast()
                        ){
                            throw ValidationException::withMessages([
                                'codigo_otp'=>
                                    'O código OTP expirou.',
                            ]);
                        }

                        if(
                            !hash_equals(
                                (string)
                                $assinatura
                                    ->codigo_otp,
                                $otp
                            )
                        ){
                            throw ValidationException::withMessages([
                                'codigo_otp'=>
                                    'O código OTP é inválido.',
                            ]);
                        }

                        $path=
                            'checklist-signatures/'.
                            $assinatura
                                ->tenant_id.
                            '/'.
                            $assinatura
                                ->checklist_record_id.
                            '/'.
                            $assinatura
                                ->papel.
                            '.png';

                        if(
                            !Storage::disk(
                                'local'
                            )->put(
                                $path,
                                $binary
                            )
                        ){
                            throw new RuntimeException(
                                'Não foi possível guardar a assinatura.'
                            );
                        }

                        $storedPath=
                            $path;

                        $assinatura
                            ->assinatura_path=
                            $path;

                        $assinatura->status=
                            'assinado';

                        $assinatura->verificado=
                            true;

                        $assinatura->assinado_em=
                            now();

                        $assinatura->ip_address=
                            $ip;

                        $assinatura->user_agent=
                            $userAgent;

                        $assinatura
                            ->codigo_otp=
                            null;

                        $assinatura
                            ->token_verificacao=
                            null;

                        $assinatura->save();

                        return $assinatura;
                    }
                );
        }
        catch(Throwable $exception){
            if(
                $storedPath
            ){
                Storage::disk(
                    'local'
                )->delete(
                    $storedPath
                );
            }

            throw $exception;
        }

        $checklist=
            ChecklistRecord::query()
                ->whereKey(
                    $assinatura
                        ->checklist_record_id
                )
                ->with(
                    'assinaturas'
                )
                ->firstOrFail();

        $complete=
            $checklist
                ->assinaturas
                ->where(
                    'status',
                    '!=',
                    'assinado'
                )
                ->isEmpty();

        if($complete){
            $checklist=
                $this->finalize(
                    $checklist
                );
        }

        return[
            'assinatura_concluida'=>
                true,

            'checklist_finalizado'=>
                $complete,

            'checklist'=>
                $checklist,
        ];
    }

    private function finalize(
        ChecklistRecord $checklist
    ):ChecklistRecord{
        $checklist=
            DB::transaction(
                function() use(
                    $checklist
                ){
                    $locked=
                        ChecklistRecord::query()
                            ->whereKey(
                                $checklist->id
                            )
                            ->lockForUpdate()
                            ->with(
                                'assinaturas'
                            )
                            ->firstOrFail();

                    if(
                        $locked
                            ->assinaturas
                            ->where(
                                'status',
                                '!=',
                                'assinado'
                            )
                            ->isNotEmpty()
                    ){
                        throw new RuntimeException(
                            'Ainda existem assinaturas pendentes.'
                        );
                    }

                    $empresa=
                        $locked
                            ->assinaturas
                            ->firstWhere(
                                'papel',
                                'empresa'
                            );

                    $motorista=
                        $locked
                            ->assinaturas
                            ->firstWhere(
                                'papel',
                                'motorista'
                            );

                    $locked
                        ->assinatura_empresa_path=
                        $empresa
                            ?->assinatura_path;

                    $locked
                        ->assinatura_motorista_path=
                        $motorista
                            ?->assinatura_path;

                    $security=
                        $locked
                            ->metadados_seguranca ??
                        [];

                    $security[
                        'assinaturas'
                    ]=[
                        'empresa'=>[
                            'modo'=>
                                $empresa
                                    ?->modo,

                            'nome'=>
                                $empresa
                                    ?->signatario_nome,

                            'email'=>
                                $empresa
                                    ?->signatario_email,

                            'assinado_em'=>
                                $empresa
                                    ?->assinado_em
                                    ?->toISOString(),
                        ],

                        'motorista'=>[
                            'modo'=>
                                $motorista
                                    ?->modo,

                            'nome'=>
                                $motorista
                                    ?->signatario_nome,

                            'email'=>
                                $motorista
                                    ?->signatario_email,

                            'assinado_em'=>
                                $motorista
                                    ?->assinado_em
                                    ?->toISOString(),
                        ],
                    ];

                    $locked
                        ->metadados_seguranca=
                        $security;

                    $locked->estado=
                        'finalizado';

                    $locked->finalizado_em=
                        now();

                    $locked->save();

                    return $locked;
                }
            );

        try{
            $result=
                $this
                    ->pdfService
                    ->generate(
                        $checklist
                    );

            return $result[
                'checklist'
            ];
        }
        catch(Throwable $exception){
            DB::transaction(
                function() use(
                    $checklist
                ){
                    $locked=
                        ChecklistRecord::query()
                            ->whereKey(
                                $checklist->id
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    $locked->estado=
                        'aguardando_assinaturas';

                    $locked->finalizado_em=
                        null;

                    $locked->save();
                }
            );

            throw $exception;
        }
    }

    private function sendRemote(
        ChecklistAssinatura $assinatura
    ):void{
        if(
            !filter_var(
                $assinatura
                    ->signatario_email,
                FILTER_VALIDATE_EMAIL
            )
        ){
            throw new RuntimeException(
                'O signatário remoto não possui um e-mail válido.'
            );
        }

        $baseUrl=
            rtrim(
                (string)
                config(
                    'app.url'
                ),
                '/'
            );

        $url=
            $baseUrl.
            '/assinaturas/checklists/'.
            $assinatura
                ->token_verificacao;

        Mail::to(
            $assinatura
                ->signatario_email
        )->send(
            new ChecklistRemoteSignatureRequestMail(
                signerName:
                    $assinatura
                        ->signatario_nome,

                checklistName:
                    $assinatura
                        ->checklist
                        ->tipo===
                        'entrega'
                            ?'Checklist de entrega'
                            :'Checklist de recolha',

                signatureUrl:
                    $url,

                otp:
                    (string)
                    $assinatura
                        ->codigo_otp,

                expiresAt:
                    $assinatura
                        ->otp_expira_em
                        ->timezone(
                            config(
                                'app.timezone'
                            )
                        )
                        ->format(
                            'd/m/Y H:i'
                        )
            )
        );
    }

    private function decodeSignature(
        string $dataUrl
    ):string{
        $prefix=
            'data:image/png;base64,';

        if(
            !str_starts_with(
                $dataUrl,
                $prefix
            )
        ){
            throw ValidationException::withMessages([
                'assinatura'=>
                    'A assinatura deve ser uma imagem PNG válida.',
            ]);
        }

        $binary=
            base64_decode(
                substr(
                    $dataUrl,
                    strlen($prefix)
                ),
                true
            );

        if(
            $binary===false ||
            !str_starts_with(
                $binary,
                "\x89PNG\r\n\x1a\n"
            )
        ){
            throw ValidationException::withMessages([
                'assinatura'=>
                    'A assinatura deve ser uma imagem PNG válida.',
            ]);
        }

        return $binary;
    }
}