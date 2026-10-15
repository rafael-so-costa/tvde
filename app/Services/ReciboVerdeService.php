<?php

namespace App\Services;

use App\Models\Empresa;
use App\Models\Motorista;
use App\Models\ReciboVerde;
use App\Models\User;
use App\Support\PortugueseDataNormalizer;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ReciboVerdeService
{
    public function __construct(
        private PermissionService $permissionService
    ) {}

    public function create(
        array $data,
        UploadedFile $arquivo,
        User $actor,
        string $tenantId
    ): ReciboVerde {
        $motorista = $this->resolveMotorista(
            $data,
            $actor,
            $tenantId
        );

        $numeroDocumento = $this
            ->normalizeDocumentNumber(
                $data['numero_documento']
            );

        $this->assertNotDuplicate(
            $tenantId,
            $motorista->id,
            $numeroDocumento
        );

        $nifEmitente = $this->normalizeNif(
            $data['nif_emitente']
        );

        $nifAdquirente = $this->normalizeNif(
            $data['nif_adquirente']
        );

        $empresa = $this->resolveEmpresa(
            $tenantId,
            $nifAdquirente
        );

        $dataEmissao = Carbon::parse(
            $data['data_emissao']
        )->startOfDay();

        $valorBase = $this->money(
            $data['valor_base']
        );

        $valorIva = $this->money(
            $data['valor_iva'] ?? 0
        );

        $retencaoIrs = $this->money(
            $data['retencao_irs'] ?? 0
        );

        $valorTotal = $this->money(
            $data['valor_total']
        );

        $avisos = $this->buildWarnings(
            $motorista,
            $empresa,
            $nifEmitente,
            $nifAdquirente,
            $dataEmissao,
            $valorBase,
            $valorIva,
            $retencaoIrs,
            $valorTotal
        );

        $directory =
            'recibos-verdes/'.
            $tenantId.'/'.
            $motorista->id;

        $filename =
            Str::uuid()->toString().
            '.pdf';

        $path = $arquivo->storeAs(
            $directory,
            $filename,
            'local'
        );

        if (! $path) {
            throw new RuntimeException(
                'Não foi possível guardar o recibo verde.'
            );
        }

        $absolutePath = Storage::disk('local')
            ->path($path);

        $hash = hash_file(
            'sha256',
            $absolutePath
        );

        if (! $hash) {
            Storage::disk('local')
                ->delete($path);

            throw new RuntimeException(
                'Não foi possível calcular a integridade do recibo.'
            );
        }

        try {
            return DB::transaction(function () use (
                $data,
                $arquivo,
                $actor,
                $tenantId,
                $motorista,
                $empresa,
                $numeroDocumento,
                $dataEmissao,
                $nifEmitente,
                $nifAdquirente,
                $valorBase,
                $valorIva,
                $retencaoIrs,
                $valorTotal,
                $avisos,
                $path,
                $hash
            ) {
                $recibo = new ReciboVerde([
                    'motorista_id' => $motorista->id,
                    'numero_documento' => $numeroDocumento,
                    'data_emissao' => $dataEmissao->toDateString(),
                    'nif_emitente' => $nifEmitente,
                    'nome_emitente' => $this->nullableTrim(
                        $data['nome_emitente'] ??
                        null
                    ),
                    'nif_adquirente' => $nifAdquirente,
                    'nome_adquirente' => $this->nullableTrim(
                        $data['nome_adquirente'] ??
                        null
                    ),
                    'valor_base' => $valorBase,
                    'valor_iva' => $valorIva,
                    'retencao_irs' => $retencaoIrs,
                    'valor_total' => $valorTotal,
                    'dados_extraidos' => $data['dados_extraidos'] ??
                        null,
                ]);

                $recibo->tenant_id = $tenantId;
                $recibo->empresa_id = $empresa?->id;

                $recibo->ano =
                    $dataEmissao->year;

                $recibo->mes =
                    $dataEmissao->month;

                $recibo->status =
                    'pendente_validacao';

                $recibo->avisos_validacao =
                    $avisos;

                $recibo->arquivo_path = $path;

                $recibo->arquivo_nome =
                    $arquivo
                        ->getClientOriginalName();

                $recibo->arquivo_mime =
                    $arquivo->getMimeType() ??
                    $arquivo->getClientMimeType() ??
                    'application/pdf';

                $recibo->arquivo_tamanho =
                    $arquivo->getSize();

                $recibo->hash_arquivo = $hash;
                $recibo->created_by = $actor->id;

                $recibo->save();

                return $this->load(
                    $recibo
                );
            });
        } catch (QueryException $exception) {
            Storage::disk('local')
                ->delete($path);

            if (
                $this->isUniqueViolation(
                    $exception
                )
            ) {
                throw ValidationException::withMessages([
                    'numero_documento' => 'Este recibo verde já foi enviado para este motorista.',
                ]);
            }

            throw $exception;
        } catch (Throwable $exception) {
            Storage::disk('local')
                ->delete($path);

            throw $exception;
        }
    }

    public function approve(
        string $id,
        string $tenantId,
        User $actor
    ): ReciboVerde {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $tenantId,
            $actor
        ) {
            $recibo = ReciboVerde::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $recibo->status !==
                'pendente_validacao'
            ) {
                throw ValidationException::withMessages([
                    'recibo_verde' => 'Apenas recibos pendentes podem ser validados.',
                ]);
            }

            $recibo->status = 'validado';
            $recibo->validado_por = $actor->id;
            $recibo->validado_em = now();

            $recibo->rejeitado_por = null;
            $recibo->rejeitado_em = null;
            $recibo->observacoes_empresa = null;

            $recibo->save();

            return $this->load(
                $recibo
            );
        });
    }

    public function reject(
        string $id,
        string $tenantId,
        User $actor,
        string $motivo
    ): ReciboVerde {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $id,
            $tenantId,
            $actor,
            $motivo
        ) {
            $recibo = ReciboVerde::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $recibo->status !==
                'pendente_validacao'
            ) {
                throw ValidationException::withMessages([
                    'recibo_verde' => 'Apenas recibos pendentes podem ser rejeitados.',
                ]);
            }

            $recibo->status = 'rejeitado';

            $recibo->observacoes_empresa =
                trim($motivo);

            $recibo->rejeitado_por = $actor->id;
            $recibo->rejeitado_em = now();

            $recibo->validado_por = null;
            $recibo->validado_em = null;

            $recibo->save();

            return $this->load(
                $recibo
            );
        });
    }

    private function buildWarnings(
        Motorista $motorista,
        ?Empresa $empresa,
        string $nifEmitente,
        string $nifAdquirente,
        Carbon $dataEmissao,
        float $valorBase,
        float $valorIva,
        float $retencaoIrs,
        float $valorTotal
    ): array {
        $avisos = [];

        $motoristaNif = $this->normalizeNif(
            $motorista->nif
        );

        if (blank($motoristaNif)) {
            $avisos[] = [
                'codigo' => 'motorista_sem_nif',
                'campo' => 'nif_emitente',
                'mensagem' => 'O motorista não possui NIF preenchido no cadastro para comparação.',
            ];
        } elseif (
            $motoristaNif !== $nifEmitente
        ) {
            $avisos[] = [
                'codigo' => 'nif_emitente_divergente',
                'campo' => 'nif_emitente',
                'mensagem' => 'O NIF do emitente não corresponde ao NIF do motorista.',
            ];
        }

        if (! $empresa) {
            $avisos[] = [
                'codigo' => 'nif_adquirente_nao_encontrado',
                'campo' => 'nif_adquirente',
                'mensagem' => 'O NIF do adquirente não corresponde a nenhuma empresa desta organização.',
            ];
        } elseif (
            $this->normalizeNif(
                $empresa->nif
            ) !== $nifAdquirente
        ) {
            $avisos[] = [
                'codigo' => 'nif_adquirente_divergente',
                'campo' => 'nif_adquirente',
                'mensagem' => 'O NIF do adquirente não corresponde à empresa identificada.',
            ];
        }

        if (
            $dataEmissao->gt(
                today()
            )
        ) {
            $avisos[] = [
                'codigo' => 'data_emissao_futura',
                'campo' => 'data_emissao',
                'mensagem' => 'A data de emissão do recibo está no futuro.',
            ];
        }

        $valorCalculado = round(
            $valorBase +
            $valorIva -
            $retencaoIrs,
            2
        );

        if (
            abs(
                $valorCalculado -
                $valorTotal
            ) > 0.02
        ) {
            $avisos[] = [
                'codigo' => 'valor_total_incoerente',
                'campo' => 'valor_total',
                'mensagem' => 'O valor total não corresponde a valor base + IVA - retenção de IRS.',
                'valor_calculado' => number_format(
                    $valorCalculado,
                    2,
                    '.',
                    ''
                ),
            ];
        }

        return $avisos;
    }

    private function resolveMotorista(
        array $data,
        User $actor,
        string $tenantId
    ): Motorista {
        if (
            $this->permissionService
                ->allows(
                    $actor,
                    'recibos_verdes',
                    'configurar',
                    $tenantId
                )
        ) {
            if (
                blank(
                    $data['motorista_id'] ??
                    null
                )
            ) {
                throw ValidationException::withMessages([
                    'motorista_id' => 'Selecione o motorista.',
                ]);
            }

            return Motorista::query()
                ->where(
                    'tenant_id',
                    $tenantId
                )
                ->findOrFail(
                    $data['motorista_id']
                );
        }

        if (
            ! $actor->hasRole(
                'motorista',
                $tenantId
            )
        ) {
            abort(
                403,
                'Sem permissão suficiente para enviar recibos verdes.'
            );
        }

        $motorista = Motorista::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'user_id',
                $actor->id
            )
            ->first();

        if (! $motorista) {
            throw ValidationException::withMessages([
                'motorista' => 'A conta não possui um motorista associado.',
            ]);
        }

        if (
            ! empty(
                $data['motorista_id']
            ) &&
            $data['motorista_id'] !==
                $motorista->id
        ) {
            throw ValidationException::withMessages([
                'motorista_id' => 'O motorista só pode enviar recibos para o próprio cadastro.',
            ]);
        }

        return $motorista;
    }

    private function resolveEmpresa(
        string $tenantId,
        string $nifAdquirente
    ): ?Empresa {
        if (blank($nifAdquirente)) {
            return null;
        }

        return Empresa::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->orderByDesc('ativo')
            ->get()
            ->first(
                fn (Empresa $empresa) => $this->normalizeNif(
                    $empresa->nif
                ) === $nifAdquirente
            );
    }

    private function assertNotDuplicate(
        string $tenantId,
        string $motoristaId,
        string $numeroDocumento
    ): void {
        $exists = ReciboVerde::query()
            ->where(
                'tenant_id',
                $tenantId
            )
            ->where(
                'motorista_id',
                $motoristaId
            )
            ->where(
                'numero_documento',
                $numeroDocumento
            )
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'numero_documento' => 'Este recibo verde já foi enviado para este motorista.',
            ]);
        }
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if (
            ! $this->permissionService
                ->allows(
                    $actor,
                    'recibos_verdes',
                    'configurar',
                    $tenantId
                )
        ) {
            abort(
                403,
                'Sem permissão suficiente para este recurso.'
            );
        }
    }

    private function normalizeNif(
        ?string $value
    ): string {
        return PortugueseDataNormalizer::nif(
            $value
        ) ?? '';
    }

    private function normalizeDocumentNumber(
        string $value
    ): string {
        return preg_replace(
            '/\s+/u',
            ' ',
            trim($value)
        ) ?? trim($value);
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        if (blank($value)) {
            return null;
        }

        return trim($value);
    }

    private function money(
        mixed $value
    ): float {
        return round(
            (float) $value,
            2
        );
    }

    private function isUniqueViolation(
        QueryException $exception
    ): bool {
        return in_array(
            (string) $exception->getCode(),
            [
                '23000',
                '23505',
            ],
            true
        );
    }

    private function load(
        ReciboVerde $recibo
    ): ReciboVerde {
        return $recibo->load([
            'motorista:id,nome_completo,nif,email,telemovel,user_id',
            'empresa:id,nome_empresa,nif',
            'createdBy:id,name',
            'validadoPor:id,name',
            'rejeitadoPor:id,name',
        ]);
    }
}
