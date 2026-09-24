<?php

namespace App\Services;

use App\Models\Fornecedor;
use App\Models\Peca;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PecaService
{
    public function __construct(
        private PermissionService $permissionService
    ){}

    public function create(
        array $data,
        User $actor,
        string $tenantId
    ): Peca {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $fornecedor=$this->resolveFornecedor(
            $data['fornecedor_preferencial_id']
                ?? null,
            $tenantId
        );

        return DB::transaction(function() use(
            $data,
            $fornecedor,
            $tenantId
        ){
            $peca=new Peca([
                'fornecedor_preferencial_id'=>
                    $fornecedor?->id,
                'codigo'=>$this->normalizeCode(
                    $data['codigo']
                ),
                'nome'=>trim($data['nome']),
                'fabricante'=>$this->nullableTrim(
                    $data['fabricante'] ?? null
                ),
                'unidade'=>trim(
                    $data['unidade'] ?? 'un'
                ),
                'estoque_minimo'=>
                    (float)($data['estoque_minimo'] ?? 0),
                'ativo'=>$data['ativo'] ?? true,
            ]);

            $peca->tenant_id=$tenantId;

            /*
             * Sempre começa zerado.
             * Estoque inicial deve ser lançado pelo ledger.
             */
            $peca->estoque_atual=0;
            $peca->custo_medio=0;

            $peca->save();

            return $this->load($peca);
        });
    }

    public function update(
        string $id,
        array $data,
        User $actor,
        string $tenantId
    ): Peca {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $id,
            $data,
            $tenantId
        ){
            $peca=Peca::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if(array_key_exists(
                'fornecedor_preferencial_id',
                $data
            )){
                $peca->fornecedor_preferencial_id=
                    $this->resolveFornecedor(
                        $data['fornecedor_preferencial_id'],
                        $tenantId
                    )?->id;
            }

            if(array_key_exists('codigo',$data)){
                $peca->codigo=$this->normalizeCode(
                    $data['codigo']
                );
            }

            if(array_key_exists('nome',$data)){
                $peca->nome=trim(
                    $data['nome']
                );
            }

            foreach([
                'fabricante',
                'unidade',
            ] as $field){
                if(array_key_exists($field,$data)){
                    $peca->{$field}=
                        $this->nullableTrim(
                            $data[$field]
                        );
                }
            }

            if(array_key_exists(
                'estoque_minimo',
                $data
            )){
                $peca->estoque_minimo=
                    (float)$data['estoque_minimo'];
            }

            if(array_key_exists('ativo',$data)){
                $peca->ativo=
                    (bool)$data['ativo'];
            }

            $peca->save();

            return $this->load($peca);
        });
    }

    public function delete(
        string $id,
        User $actor,
        string $tenantId
    ): void {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        $peca=Peca::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($id);

        if(
            $peca->movimentosEstoque()->exists() ||
            $peca->compraItens()->exists() ||
            $peca->manutencaoItens()->exists() ||
            $peca->garantias()->exists()
        ){
            throw ValidationException::withMessages([
                'peca'=>
                    'A peça já possui histórico e não pode ser eliminada. Desative-a em vez disso.',
            ]);
        }

        $peca->delete();
    }

    private function resolveFornecedor(
        ?string $id,
        string $tenantId
    ): ?Fornecedor {
        if(blank($id)){
            return null;
        }

        $fornecedor=Fornecedor::query()
            ->where('tenant_id',$tenantId)
            ->find($id);

        if(!$fornecedor){
            throw ValidationException::withMessages([
                'fornecedor_preferencial_id'=>
                    'O fornecedor selecionado não pertence a esta organização.',
            ]);
        }

        return $fornecedor;
    }

    private function normalizeCode(
        string $value
    ): string {
        return mb_strtoupper(
            trim($value)
        );
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
    }

    private function load(Peca $peca): Peca
    {
        return $peca->load(
            'fornecedorPreferencial:id,nome,nif'
        );
    }

    private function assertCanConfigure(
        User $actor,
        string $tenantId
    ): void {
        if(!$this->permissionService->allows(
            $actor,
            'manutencao',
            'configurar',
            $tenantId
        )){
            abort(
                403,
                'Sem permissão suficiente para gerir peças.'
            );
        }
    }
}
