<?php

namespace App\Services;

use App\Models\Fornecedor;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FornecedorService
{
    public function __construct(
        private PermissionService $permissionService
    ){}

    public function create(
        array $data,
        User $actor,
        string $tenantId
    ): Fornecedor {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $data,
            $tenantId
        ){
            $fornecedor=new Fornecedor([
                'tipo'=>$data['tipo'] ?? 'geral',
                'nome'=>trim($data['nome']),
                'nif'=>$this->nullableTrim(
                    $data['nif'] ?? null
                ),
                'email'=>$this->nullableTrim(
                    $data['email'] ?? null
                ),
                'telemovel'=>$this->nullableTrim(
                    $data['telemovel'] ?? null
                ),
                'morada'=>$this->nullableTrim(
                    $data['morada'] ?? null
                ),
                'contacto_responsavel'=>
                    $this->nullableTrim(
                        $data['contacto_responsavel']
                        ?? null
                    ),
                'observacoes'=>$this->nullableTrim(
                    $data['observacoes'] ?? null
                ),
                'ativo'=>$data['ativo'] ?? true,
            ]);

            $fornecedor->tenant_id=$tenantId;
            $fornecedor->save();

            return $fornecedor;
        });
    }

    public function update(
        string $id,
        array $data,
        User $actor,
        string $tenantId
    ): Fornecedor {
        $this->assertCanConfigure(
            $actor,
            $tenantId
        );

        return DB::transaction(function() use(
            $id,
            $data,
            $tenantId
        ){
            $fornecedor=Fornecedor::query()
                ->where('tenant_id',$tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            foreach([
                'tipo',
                'nome',
                'nif',
                'email',
                'telemovel',
                'morada',
                'contacto_responsavel',
                'observacoes',
                'ativo',
            ] as $field){
                if(!array_key_exists($field,$data)){
                    continue;
                }

                if($field==='ativo'){
                    $fornecedor->ativo=
                        (bool)$data[$field];

                    continue;
                }

                $fornecedor->{$field}=
                    $field==='nome'
                        ? trim($data[$field])
                        : $this->nullableTrim(
                            $data[$field]
                        );
            }

            $fornecedor->save();

            return $fornecedor;
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

        $fornecedor=Fornecedor::query()
            ->where('tenant_id',$tenantId)
            ->findOrFail($id);

        if(
            $fornecedor->compras()->exists() ||
            $fornecedor->manutencoes()->exists() ||
            $fornecedor->pecasPreferenciais()->exists() ||
            $fornecedor->garantias()->exists()
        ){
            throw ValidationException::withMessages([
                'fornecedor'=>
                    'O fornecedor já possui histórico e não pode ser eliminado. Desative-o em vez disso.',
            ]);
        }

        $fornecedor->delete();
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
                'Sem permissão suficiente para gerir fornecedores.'
            );
        }
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        return blank($value)
            ? null
            : trim($value);
    }
}
