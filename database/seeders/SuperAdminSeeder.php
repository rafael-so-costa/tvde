<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $name = config('frotapro.super_admin.name');
        $email = config('frotapro.super_admin.email');
        $password = config('frotapro.super_admin.password');

        if (!$name || !$email || !$password) {
            throw new RuntimeException('Defina SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD no .env.');
        }

        $role = Role::where('codigo', 'super_admin')->firstOrFail();

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'ativo' => true,
                'email_verified_at' => now(),
            ]
        );

        UserRole::updateOrCreate(
            [
                'user_id' => $user->id,
                'role_id' => $role->id,
                'tenant_id' => null,
            ]
        );
    }
}
