<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterSaasRequest;
use App\Services\SaasRegistrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class SaasRegistrationController extends Controller
{
    public function __construct(
        private SaasRegistrationService $registrationService
    ) {}

    public function store(
        RegisterSaasRequest $request
    ): RedirectResponse {
        $registration =
            $this->registrationService
                ->register(
                    $request->validated()
                );

        $user =
            $registration['user'];

        $tenant =
            $registration['tenant'];

        Auth::guard('web')
            ->login($user);

        $request->session()
            ->regenerate();

        $request->session()
            ->put(
                'tenant_id',
                $tenant->id
            );

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        return redirect('/onboarding');
    }
}
