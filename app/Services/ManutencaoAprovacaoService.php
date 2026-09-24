<?php

namespace App\Services;

use App\Models\Manutencao;
use App\Models\ManutencaoAprovacao;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManutencaoAprovacaoService
{
    public function __construct(
        private PermissionService $permissionService
    ) {}

    public function solicitar(
        string $manutencaoId,
        array $data,
        User $actor,
        string $tenantId
    ): array {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function () use (
            $manutencaoId,
            $data,
            $actor,
            $tenantId
        ) {
            $manutencao = Manutencao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($manutencaoId)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array(
                $manutencao->status,
                [
                    'em_andamento',
                    'aguardando_pecas',
                    'concluida',
                    'cancelada',
                ],
                true
            )) {
                throw ValidationException::withMessages([
                    'manutencao' =>
                    'Não é possível solicitar aprovação no estado atual.',
                ]);
            }

            $valor = round(
                (float)(
                    $data['valor_orcamento']
                    ?? $manutencao->valor_orcamento
                    ?? 0
                ),
                2
            );

            if ($valor <= 0) {
                throw ValidationException::withMessages([
                    'valor_orcamento' =>
                    'Informe um valor de orçamento superior a zero.',
                ]);
            }

            ManutencaoAprovacao::query()
                ->where('tenant_id', $tenantId)
                ->where(
                    'manutencao_id',
                    $manutencao->id
                )
                ->where('status', 'pendente')
                ->update([
                    'status' => 'expirada',
                    'updated_at' => now(),
                ]);

            $token = Str::random(64);

            $aprovacao =
                new ManutencaoAprovacao([
                    'aprovador_nome' =>
                    $this->nullableTrim(
                        $data['aprovador_nome']
                            ?? null
                    ),
                    'aprovador_email' =>
                    $this->nullableTrim(
                        $data['aprovador_email']
                            ?? null
                    ),
                    'observacoes' =>
                    $this->nullableTrim(
                        $data['observacoes']
                            ?? null
                    ),
                ]);

            $aprovacao->tenant_id = $tenantId;
            $aprovacao->manutencao_id =
                $manutencao->id;
            $aprovacao->status = 'pendente';
            $aprovacao->valor_orcamento = $valor;
            $aprovacao->solicitado_por =
                $actor->id;
            $aprovacao->token_hash =
                hash('sha256', $token);
            $aprovacao->expires_at =
                now()->addDays(
                    (int)($data['validade_dias'] ?? 7)
                );

            $aprovacao->save();

            $manutencao->valor_orcamento = $valor;
            $manutencao->aprovacao_obrigatoria = true;
            $manutencao->status =
                'aguardando_aprovacao';
            $manutencao->updated_by = $actor->id;
            $manutencao->save();

            return [
                'aprovacao' => $aprovacao,
                /*
                 * Token em claro só é devolvido neste momento.
                 * No banco permanece apenas SHA-256.
                 */
                'token' => $token,
            ];
        });
    }

    public function responderExterno(
    string $token,
    string $decisao,
    ?string $observacoes=null,
    ?string $ip=null,
    ?string $userAgent=null
): ManutencaoAprovacao {
    if(!in_array(
        $decisao,
        ['aprovar','rejeitar'],
        true
    )){
        throw ValidationException::withMessages([
            'decisao'=>
                'A decisão deve ser aprovar ou rejeitar.',
        ]);
    }

    $resultado=DB::transaction(function() use(
        $token,
        $decisao,
        $observacoes,
        $ip,
        $userAgent
    ){
        $aprovacao=ManutencaoAprovacao::query()
            ->where(
                'token_hash',
                hash('sha256',$token)
            )
            ->lockForUpdate()
            ->firstOrFail();

        $this->assertPendente(
            $aprovacao
        );

        if(
            $aprovacao->expires_at &&
            $aprovacao->expires_at->isPast()
        ){
            $aprovacao->status='expirada';
            $aprovacao->save();

            return [
                'expirada'=>true,
                'aprovacao'=>$aprovacao,
            ];
        }

        $aprovacao->status=
            $decisao==='aprovar'
                ? 'aprovada'
                : 'rejeitada';

        $aprovacao->respondido_em=now();
        $aprovacao->ip_resposta=$ip;

        $aprovacao->user_agent_resposta=
            blank($userAgent)
                ? null
                : mb_substr(
                    $userAgent,
                    0,
                    1000
                );

        if(!blank($observacoes)){
            $aprovacao->observacoes=
                trim($observacoes);
        }

        $aprovacao->save();

        $manutencao=$aprovacao
            ->manutencao()
            ->lockForUpdate()
            ->first();

        if($manutencao){
            $manutencao->status=
                $decisao==='aprovar'
                    ? 'aprovada'
                    : 'rascunho';

            $manutencao->save();
        }

        return [
            'expirada'=>false,
            'aprovacao'=>$aprovacao,
        ];
    });

    if($resultado['expirada']){
        throw ValidationException::withMessages([
            'token'=>
                'Esta solicitação de aprovação expirou.',
        ]);
    }

    return $resultado['aprovacao'];
}

    public function responderInterno(
        string $id,
        string $decisao,
        User $actor,
        string $tenantId,
        ?string $observacoes = null
    ): ManutencaoAprovacao {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        if (!in_array(
            $decisao,
            ['aprovar', 'rejeitar'],
            true
        )) {
            throw ValidationException::withMessages([
                'decisao' =>
                'A decisão deve ser aprovar ou rejeitar.',
            ]);
        }

        return DB::transaction(function () use (
            $id,
            $decisao,
            $actor,
            $tenantId,
            $observacoes
        ) {
            $aprovacao = ManutencaoAprovacao::query()
                ->where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertPendente(
                $aprovacao
            );

            $aprovacao->status =
                $decisao === 'aprovar'
                ? 'aprovada'
                : 'rejeitada';

            $aprovacao->aprovado_por =
                $actor->id;

            $aprovacao->respondido_em = now();

            if (!blank($observacoes)) {
                $aprovacao->observacoes =
                    trim($observacoes);
            }

            $aprovacao->save();

            $this->sincronizarManutencao(
                $aprovacao,
                $actor
            );

            return $aprovacao;
        });
    }

    private function sincronizarManutencao(
        ManutencaoAprovacao $aprovacao,
        ?User $actor = null
    ): void {
        $manutencao = Manutencao::query()
            ->where(
                'tenant_id',
                $aprovacao->tenant_id
            )
            ->whereKey(
                $aprovacao->manutencao_id
            )
            ->lockForUpdate()
            ->firstOrFail();

        $manutencao->status =
            $aprovacao->status === 'aprovada'
            ? 'aprovada'
            : 'rascunho';

        if ($actor) {
            $manutencao->updated_by =
                $actor->id;
        }

        $manutencao->save();
    }

    private function assertPendente(
        ManutencaoAprovacao $aprovacao
    ): void {
        if ($aprovacao->status !== 'pendente') {
            throw ValidationException::withMessages([
                'aprovacao' =>
                'Esta solicitação já foi respondida ou expirou.',
            ]);
        }
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if (!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )) {
            abort(
                403,
                'Sem permissão suficiente para gerir aprovações de manutenção.'
            );
        }
    }
}
