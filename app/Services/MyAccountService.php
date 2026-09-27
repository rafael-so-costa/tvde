<?php

namespace App\Services;

use App\Models\Profile;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class MyAccountService
{
    public function data(
        User $user
    ): array {
        $user->load(
            'profile'
        );

        return [
            'id'=>$user->id,
            'name'=>$user->name,
            'email'=>$user->email,
            'ativo'=>$user->ativo,
            'last_login_at'=>
                $user->last_login_at
                    ?->toISOString(),

            'profile'=>[
                'telefone'=>
                    $user->profile
                        ?->telefone,

                'timezone'=>
                    $user->profile
                        ?->timezone ??
                    'Europe/Lisbon',

                'locale'=>
                    $user->profile
                        ?->locale ??
                    'pt_PT',
            ],
        ];
    }

    public function update(
        User $user,
        array $data
    ): array {
        DB::transaction(
            function () use (
                $user,
                $data
            ) {
                if (
                    array_key_exists(
                        'name',
                        $data
                    )
                ) {
                    $user->forceFill([
                        'name'=>
                            trim(
                                $data['name']
                            ),
                    ])->save();
                }

                $profileData=
                    Arr::only(
                        $data,
                        [
                            'telefone',
                            'timezone',
                            'locale',
                        ]
                    );

                if (
                    $profileData !== []
                ) {
                    Profile::query()
                        ->updateOrCreate(
                            [
                                'user_id'=>
                                    $user->id,
                            ],
                            $profileData
                        );
                }
            }
        );

        return $this->data(
            $user->fresh()
        );
    }

    public function updatePassword(
        User $user,
        string $password,
        string $currentSessionId
    ): int {
        return DB::transaction(
            function () use (
                $user,
                $password,
                $currentSessionId
            ) {
                $user->forceFill([
                    'password'=>
                        $password,

                    'remember_token'=>
                        null,
                ])->save();

                return $this
                    ->terminateOtherSessions(
                        $user,
                        $currentSessionId
                    );
            }
        );
    }

    public function sessions(
        User $user,
        string $currentSessionId
    ): array {
        return DB::table(
            'sessions'
        )
            ->where(
                'user_id',
                $user->id
            )
            ->orderByDesc(
                'last_activity'
            )
            ->get([
                'id',
                'ip_address',
                'user_agent',
                'last_activity',
            ])
            ->map(
                fn($session)=>[
                    'current'=>
                        hash_equals(
                            (string)
                                $session->id,
                            $currentSessionId
                        ),

                    'ip_address'=>
                        $session
                            ->ip_address,

                    'user_agent'=>
                        $session
                            ->user_agent,

                    'last_activity'=>
                        CarbonImmutable
                            ::createFromTimestamp(
                                (int)
                                    $session
                                        ->last_activity,
                                'UTC'
                            )
                            ->toISOString(),
                ]
            )
            ->values()
            ->all();
    }

    public function terminateOtherSessions(
        User $user,
        string $currentSessionId
    ): int {
        return DB::table(
            'sessions'
        )
            ->where(
                'user_id',
                $user->id
            )
            ->where(
                'id',
                '!=',
                $currentSessionId
            )
            ->delete();
    }
}
