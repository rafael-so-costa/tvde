<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcceptFuncionarioInvitationRequest;
use App\Services\FuncionarioAccessService;
use Illuminate\Http\JsonResponse;

class FuncionarioInvitationController extends Controller
{
    public function __construct(
        private FuncionarioAccessService $service
    ){}

    public function show(
        string $token
    ): JsonResponse {
        $invitation=
            $this->service
                ->invitationByToken(
                    $token
                );

        return response()->json([
            'data'=>[
                'funcionario'=>
                    $invitation
                        ->funcionario
                        ->nome,

                'email'=>
                    $invitation->email,

                'tenant'=>[
                    'id'=>
                        $invitation
                            ->tenant
                            ->id,

                    'nome'=>
                        $invitation
                            ->tenant
                            ->nome,
                ],

                'expires_at'=>
                    $invitation
                        ->expires_at
                        ->toISOString(),
            ],
        ]);
    }

    public function accept(
        AcceptFuncionarioInvitationRequest $request,
        string $token
    ): JsonResponse {
        $user=$this
            ->service
            ->accept(
                $token,
                $request
                    ->string(
                        'password'
                    )
                    ->toString()
            );

        return response()->json([
            'message'=>
                'Conta criada e ativada com sucesso.',

            'data'=>[
                'id'=>$user->id,
                'name'=>$user->name,
                'email'=>$user->email,
            ],
        ]);
    }
}
