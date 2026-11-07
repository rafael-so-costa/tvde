<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RgpdAssinatura;
use App\Models\RgpdComprovativo;
use App\Models\RgpdRegisto;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

final class RgpdComprovativoPdfService
{
    /*
     * FROTAPRO_4R102_PRIVATE_IMMUTABLE_PDF
     *
     * O comprovativo original nunca é
     * regenerado ou substituído.
     *
     * O documento utiliza o texto guardado
     * no registo, e não a versão atual
     * do catálogo documental.
     */

    public function emitir(
        string $tenantId,
        string $registoId
    ): RgpdComprovativo {
        $novoCaminho = null;

        try {
            return DB::transaction(
                function () use (
                    $tenantId,
                    $registoId,
                    &$novoCaminho
                ): RgpdComprovativo {
                    $registo = RgpdRegisto::query()
                        ->where('tenant_id', $tenantId)
                        ->whereKey($registoId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    $assinatura = $this->validar(
                        $registo
                    );

                    $existente = RgpdComprovativo::query()
                        ->where('tenant_id', $tenantId)
                        ->where(
                            'rgpd_registo_id',
                            $registo->id
                        )
                        ->where(
                            'tipo',
                            'original_assinado'
                        )
                        ->lockForUpdate()
                        ->first();

                    if ($existente) {
                        if (
                            !hash_equals(
                                (string)$existente->documento_sha256,
                                (string)$registo->documento_sha256
                            ) ||
                            !hash_equals(
                                (string)$existente->assinatura_sha256,
                                (string)$assinatura->assinatura_sha256
                            )
                        ) {
                            throw new RuntimeException(
                                'Metadados do comprovativo divergentes da assinatura.'
                            );
                        }

                        $this->verificarArquivo(
                            $existente
                        );

                        return $existente;
                    }

                    $imagem = Storage::disk('local')->get(
                        $assinatura->assinatura_path
                    );

                    $eventos = $registo->eventos()
                        ->orderBy('ocorrido_em')
                        ->get();

                    $pdf = Pdf::loadView(
                        'pdf.rgpd_comprovativo',
                        [
                            'registo' => $registo,
                            'assinatura' => $assinatura,
                            'eventos' => $eventos,
                            'imagemBase64' => base64_encode($imagem),
                            'emitidoEm' => now(),
                        ]
                    )
                        ->setPaper('a4', 'portrait')
                        ->setOptions([
                            'isRemoteEnabled' => false,
                            'isPhpEnabled' => false,
                            'defaultFont' => 'DejaVu Sans',
                        ]);

                    $binario = $pdf->output();

                    if (
                        !str_starts_with(
                            $binario,
                            '%PDF-'
                        )
                    ) {
                        throw new RuntimeException(
                            'O comprovativo RGPD gerado é inválido.'
                        );
                    }

                    $novoCaminho =
                        'rgpd-comprovativos/'.
                        $tenantId.'/'.
                        $registo->id.'/'.
                        Str::uuid().'.pdf';

                    if (
                        !Storage::disk('local')->put(
                            $novoCaminho,
                            $binario
                        )
                    ) {
                        throw new RuntimeException(
                            'Falha ao guardar comprovativo privado.'
                        );
                    }

                    $comprovativo = new RgpdComprovativo([
                        'tipo' => 'original_assinado',

                        'arquivo_path' =>
                            $novoCaminho,

                        'arquivo_sha256' =>
                            hash('sha256', $binario),

                        'documento_sha256' =>
                            $registo->documento_sha256,

                        'assinatura_sha256' =>
                            $assinatura->assinatura_sha256,

                        'emitido_em' => now(),
                    ]);

                    $comprovativo->tenant_id =
                        $tenantId;

                    $comprovativo->rgpd_registo_id =
                        $registo->id;

                    $comprovativo->rgpd_assinatura_id =
                        $assinatura->id;

                    $comprovativo->save();

                    return $comprovativo;
                }
            );
        }
        catch (Throwable $error) {
            if ($novoCaminho !== null) {
                Storage::disk('local')->delete(
                    $novoCaminho
                );
            }

            throw $error;
        }
    }

    public function obter(
        string $tenantId,
        string $registoId
    ): array {
        $comprovativo = RgpdComprovativo::query()
            ->where('tenant_id', $tenantId)
            ->where(
                'rgpd_registo_id',
                $registoId
            )
            ->where(
                'tipo',
                'original_assinado'
            )
            ->firstOrFail();

        return [
            $comprovativo,
            $this->verificarArquivo(
                $comprovativo
            ),
        ];
    }

    private function validar(
        RgpdRegisto $registo
    ): RgpdAssinatura {
        if ($registo->estado !== 'assinado') {
            throw ValidationException::withMessages([
                'registo' =>
                    'O RGPD ainda não foi assinado.',
            ]);
        }

        $assinatura = RgpdAssinatura::query()
            ->where(
                'tenant_id',
                $registo->tenant_id
            )
            ->where(
                'rgpd_registo_id',
                $registo->id
            )
            ->where(
                'status',
                'assinado'
            )
            ->first();

        if (
            !$assinatura ||
            !$assinatura->assinado_em ||
            !$assinatura->assinatura_path
        ) {
            throw ValidationException::withMessages([
                'assinatura' =>
                    'Evidência de assinatura inexistente.',
            ]);
        }

        $texto = $registo->documento_texto_snapshot;

        if (
            !is_string($texto) ||
            trim($texto) === '' ||
            !hash_equals(
                (string)$registo->documento_sha256,
                hash('sha256', $texto)
            ) ||
            !hash_equals(
                (string)$assinatura->documento_sha256,
                (string)$registo->documento_sha256
            )
        ) {
            throw ValidationException::withMessages([
                'documento' =>
                    'Snapshot do documento ausente ou adulterado.',
            ]);
        }

        $disk = Storage::disk('local');

        if (
            !$disk->exists(
                $assinatura->assinatura_path
            )
        ) {
            throw ValidationException::withMessages([
                'assinatura' =>
                    'Imagem de assinatura privada inexistente.',
            ]);
        }

        $imagem = $disk->get(
            $assinatura->assinatura_path
        );

        if (
            !hash_equals(
                (string)$assinatura->assinatura_sha256,
                hash('sha256', $imagem)
            ) ||
            !str_starts_with(
                $imagem,
                "\x89PNG\r\n\x1a\n"
            )
        ) {
            throw ValidationException::withMessages([
                'assinatura' =>
                    'Imagem de assinatura adulterada.',
            ]);
        }

        $eventos = $registo->eventos()->get();

        if (
            $eventos
                ->where('tipo', 'assinatura')
                ->count() !== 1
        ) {
            throw ValidationException::withMessages([
                'assinatura' =>
                    'Histórico de assinatura inconsistente.',
            ]);
        }

        $decisoes = $eventos->where(
            'tipo',
            'decisao'
        );

        if (
            $decisoes->count() !==
            count(
                RgpdConsentimentoService::FINALIDADES
            )
        ) {
            throw ValidationException::withMessages([
                'escolhas' =>
                    'Histórico de decisões incompleto.',
            ]);
        }

        $escolhas = [];

        foreach (
            RgpdConsentimentoService::FINALIDADES
            as $finalidade
        ) {
            $encontradas = $decisoes->where(
                'finalidade',
                $finalidade
            );

            if ($encontradas->count() !== 1) {
                throw ValidationException::withMessages([
                    'escolhas' =>
                        'Histórico de decisões inconsistente.',
                ]);
            }

            $valor = $encontradas
                ->first()
                ->escolha;

            if (
                !in_array(
                    $valor,
                    [
                        'autorizo',
                        'nao_autorizo',
                        'nao_aplicavel',
                    ],
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'escolhas' =>
                        'Escolha original inválida.',
                ]);
            }

            $escolhas[$finalidade] = $valor;
        }

        $snapshot = [
            'tenant_id' =>
                $registo->tenant_id,

            'registo_id' =>
                $registo->id,

            'titular_tipo' =>
                $registo->titular_tipo,

            'titular_id' =>
                $registo->titular_id,

            'titular_nome' =>
                $assinatura->signatario_nome,

            'modelo_codigo' =>
                $registo->modelo_codigo,

            'versao' =>
                $registo->versao_documento,

            'documento_sha256' =>
                $registo->documento_sha256,

            'escolhas' =>
                $escolhas,

            'finalidades_especificas' =>
                $registo->finalidades_especificas ?? [],
        ];

        $digest = hash(
            'sha256',
            json_encode(
                $snapshot,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES |
                JSON_THROW_ON_ERROR
            )
        );

        if (
            !hash_equals(
                (string)$assinatura->escolhas_sha256,
                $digest
            )
        ) {
            throw ValidationException::withMessages([
                'integridade' =>
                    'As escolhas não correspondem às escolhas assinadas.',
            ]);
        }

        return $assinatura;
    }

    private function verificarArquivo(
        RgpdComprovativo $comprovativo
    ): string {
        $disk = Storage::disk('local');

        if (
            !$disk->exists(
                $comprovativo->arquivo_path
            )
        ) {
            throw new RuntimeException(
                'Comprovativo RGPD original em falta.'
            );
        }

        $binario = $disk->get(
            $comprovativo->arquivo_path
        );

        if (
            !str_starts_with(
                $binario,
                '%PDF-'
            ) ||
            !hash_equals(
                (string)$comprovativo->arquivo_sha256,
                hash('sha256', $binario)
            )
        ) {
            throw new RuntimeException(
                'Integridade do comprovativo RGPD comprometida.'
            );
        }

        return $binario;
    }
}
