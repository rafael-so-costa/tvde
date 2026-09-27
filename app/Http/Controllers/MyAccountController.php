<?php

namespace App\Http\Controllers;

use App\Http\Requests\TerminateOtherSessionsRequest;
use App\Http\Requests\UpdateMyAccountRequest;
use App\Http\Requests\UpdateMyPasswordRequest;
use App\Services\MyAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyAccountController extends Controller
{
    public function __construct(
        private MyAccountService $service
    ) {}

    public function show(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service
                    ->data(
                        $request->user()
                    ),
        ]);
    }

    public function update(
        UpdateMyAccountRequest $request
    ): JsonResponse {
        return response()->json([
            'message'=>
                'Conta atualizada com sucesso.',

            'data'=>
                $this->service
                    ->update(
                        $request->user(),
                        $request->validated()
                    ),
        ]);
    }

    public function password(
        UpdateMyPasswordRequest $request
    ): JsonResponse {
        $terminated=
            $this->service
                ->updatePassword(
                    $request->user(),
                    $request->validated(
                        'password'
                    ),
                    $request->session()
                        ->getId()
                );

        $request->session()
            ->regenerate();

        return response()->json([
            'message'=>
                'Palavra-passe atualizada com sucesso.',

            'terminated_sessions'=>
                $terminated,
        ]);
    }

    public function sessions(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data'=>
                $this->service
                    ->sessions(
                        $request->user(),
                        $request->session()
                            ->getId()
                    ),
        ]);
    }

    public function terminateOtherSessions(
        TerminateOtherSessionsRequest $request
    ): JsonResponse {
        $terminated=
            $this->service
                ->terminateOtherSessions(
                    $request->user(),
                    $request->session()
                        ->getId()
                );

        return response()->json([
            'message'=>
                'As outras sessões foram terminadas.',

            'terminated_sessions'=>
                $terminated,
        ]);
    }
}
