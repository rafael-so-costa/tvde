<?php

use App\Models\AdAdvertiser;
use App\Models\AdCampaign;
use App\Models\AdCreative;
use App\Models\Motorista;
use App\Models\Proprietario;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\AdSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        RoleSeeder::class,
        AdSeeder::class,
    ]);
});

function deliveryHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function deliveryTenant(
    string $name
): Tenant {
    return Tenant::create([
        'nome' => $name,
        'slug' => str($name)
            ->slug()
            ->toString(),
        'ativo' => true,
    ]);
}

function deliveryUser(
    Tenant $tenant,
    string $roleCode,
    string $email
): User {
    $user =
        User::factory()->create([
            'email' => $email,
            'password' => Hash::make(
                'SenhaTeste123!'
            ),
            'ativo' => true,
        ]);

    TenantUser::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'status' => 'ativo',
        'principal' => true,
    ]);

    $role = Role::query()
        ->where(
            'codigo',
            $roleCode
        )
        ->firstOrFail();

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'tenant_id' => $tenant->id,
    ]);

    return $user;
}

function deliveryLogin(
    $test,
    User $user
): void {
    $test
        ->postJson(
            '/login',
            [
                'email' => $user->email,
                'password' => 'SenhaTeste123!',
            ]
        )
        ->assertOk();
}

function deliveryAdvertiser(
    string $type,
    string $name,
    ?string $tenantId = null
): AdAdvertiser {
    return AdAdvertiser::create([
        'tenant_id' => $tenantId,
        'type' => $type,
        'name' => $name,
        'status' => 'active',
    ]);
}

function deliveryCampaign(
    AdAdvertiser $advertiser,
    array $overrides = []
): AdCampaign {
    $campaign =
        AdCampaign::create([
            'advertiser_id' => $advertiser->id,

            'tenant_id' => $overrides[
                    'tenant_id'
                ] ?? null,

            'source' => $overrides[
                    'source'
                ] ?? 'saas',

            'kind' => $overrides[
                    'kind'
                ] ?? 'house',

            'name' => $overrides[
                    'name'
                ] ?? 'Campanha teste',

            'title' => $overrides[
                    'title'
                ] ?? 'Anúncio de teste',

            'status' => $overrides[
                    'status'
                ] ?? 'active',

            'pricing_model' => 'fixed_period',

            'quoted_price' => $overrides[
                    'quoted_price'
                ] ?? 0,

            'currency' => 'EUR',

            'payment_required' => $overrides[
                    'payment_required'
                ] ?? false,

            'payment_status' => $overrides[
                    'payment_status'
                ] ?? 'not_required',

            'priority' => $overrides[
                    'priority'
                ] ?? 50,

            'weight' => $overrides[
                    'weight'
                ] ?? 1,

            'frequency_cap_daily' => 3,

            'start_at' => $overrides[
                    'start_at'
                ] ?? now()->subHour(),

            'end_at' => $overrides[
                    'end_at'
                ] ?? now()->addDays(30),
        ]);

    DB::table(
        'ad_campaign_channels'
    )->insert([
        'campaign_id' => $campaign->id,

        'channel' => $overrides[
                'channel'
            ] ?? 'driver_portal',
    ]);

    if (
        isset(
            $overrides[
                'audience'
            ]
        )
    ) {
        DB::table(
            'ad_campaign_audiences'
        )->insert([
            'campaign_id' => $campaign->id,

            'audience' => $overrides[
                    'audience'
                ],
        ]);
    }

    AdCreative::create([
        'campaign_id' => $campaign->id,

        'type' => 'native_card',

        'media_type' => 'none',

        'name' => 'Criativo principal',

        'headline' => $overrides[
                'headline'
            ] ?? $campaign->title,

        'body' => 'Conteúdo do anúncio.',

        'cta_label' => 'Saber mais',

        'destination_type' => 'website',

        'target_url' => 'https://frotapro.pt',

        'active' => true,

        'sort_order' => 10,
    ]);

    return $campaign;
}

test(
    'gestor só recebe publicidade criada pelo saas',
    function () {
        $tenant =
            deliveryTenant(
                'Frota Lisboa'
            );

        $manager =
            deliveryUser(
                $tenant,
                'admin_empresa',
                'gestor@teste.pt'
            );

        $saasAdvertiser =
            deliveryAdvertiser(
                'saas',
                'FrotaPro'
            );

        $externalAdvertiser =
            deliveryAdvertiser(
                'external',
                'Parceiro Externo'
            );

        $saas =
            deliveryCampaign(
                $saasAdvertiser,
                [
                    'source' => 'saas',
                    'kind' => 'house',
                    'name' => 'Mensagem FrotaPro',
                    'channel' => 'manager_panel',
                    'audience' => 'manager',
                ]
            );

        deliveryCampaign(
            $externalAdvertiser,
            [
                'source' => 'external',
                'kind' => 'commercial',
                'name' => 'Publicidade externa',
                'channel' => 'manager_panel',
                'audience' => 'manager',
                'payment_required' => true,
                'payment_status' => 'paid',
                'quoted_price' => 100,
                'priority' => 100,
            ]
        );

        deliveryLogin(
            $this,
            $manager
        );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve?surface=manager_panel'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.campaign_id',
                $saas->id
            )
            ->assertJsonPath(
                'data.source',
                'saas'
            );
    }
);

test(
    'motorista recebe campanha privada somente do próprio tenant',
    function () {
        $tenantA =
            deliveryTenant(
                'Frota Lisboa'
            );

        $tenantB =
            deliveryTenant(
                'Frota Porto'
            );

        $motorista =
            deliveryUser(
                $tenantA,
                'motorista',
                'motorista@teste.pt'
            );

        $link =
            new Motorista;

        $link->tenant_id =
            $tenantA->id;

        $link->user_id =
            $motorista->id;

        $link->nome_completo =
            'Motorista Teste';

        $link->email =
            $motorista->email;

        $link->ativo =
            true;

        $link->save();

        $advertiserA =
            deliveryAdvertiser(
                'tenant',
                'Frota Lisboa',
                $tenantA->id
            );

        $advertiserB =
            deliveryAdvertiser(
                'tenant',
                'Frota Porto',
                $tenantB->id
            );

        $ownCampaign =
            deliveryCampaign(
                $advertiserA,
                [
                    'tenant_id' => $tenantA->id,

                    'source' => 'tenant',

                    'kind' => 'tenant_internal',

                    'name' => 'Aviso privado Lisboa',

                    'channel' => 'driver_portal',

                    'audience' => 'driver',

                    'payment_required' => false,

                    'payment_status' => 'not_required',
                ]
            );

        deliveryCampaign(
            $advertiserB,
            [
                'tenant_id' => $tenantB->id,

                'source' => 'tenant',

                'kind' => 'tenant_internal',

                'name' => 'Aviso privado Porto',

                'channel' => 'driver_portal',

                'audience' => 'driver',

                'payment_required' => false,

                'payment_status' => 'not_required',

                'priority' => 100,
            ]
        );

        deliveryLogin(
            $this,
            $motorista
        );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve?surface=driver_portal'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.campaign_id',
                $ownCampaign->id
            )
            ->assertJsonPath(
                'data.kind',
                'tenant_internal'
            );
    }
);

test(
    'proprietario recebe campanha privada do próprio tenant',
    function () {
        $tenant =
            deliveryTenant(
                'Frota Proprietário'
            );

        $user =
            deliveryUser(
                $tenant,
                'proprietario',
                'proprietario@teste.pt'
            );

        $link =
            new Proprietario;

        $link->tenant_id =
            $tenant->id;

        $link->user_id =
            $user->id;

        $link->tipo =
            'pessoa_fisica';

        $link->nome_completo =
            'Proprietário Teste';

        $link->email =
            $user->email;

        $link->ativo =
            true;

        $link->save();

        $advertiser =
            deliveryAdvertiser(
                'tenant',
                'Frota Proprietário',
                $tenant->id
            );

        $campaign =
            deliveryCampaign(
                $advertiser,
                [
                    'tenant_id' => $tenant->id,

                    'source' => 'tenant',

                    'kind' => 'tenant_internal',

                    'channel' => 'owner_portal',

                    'audience' => 'owner',
                ]
            );

        deliveryLogin(
            $this,
            $user
        );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve?surface=owner_portal'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.campaign_id',
                $campaign->id
            );
    }
);

test(
    'utilizador sem vínculo de motorista não pode pedir publicidade do portal motorista',
    function () {
        $tenant =
            deliveryTenant(
                'Frota Sem Motorista'
            );

        $manager =
            deliveryUser(
                $tenant,
                'admin_empresa',
                'gestor2@teste.pt'
            );

        deliveryLogin(
            $this,
            $manager
        );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve?surface=driver_portal'
            )
            ->assertForbidden();
    }
);

test(
    'painel público entrega campanha comercial paga',
    function () {
        $advertiser =
            deliveryAdvertiser(
                'external',
                'Oficina TVDE'
            );

        $paid =
            deliveryCampaign(
                $advertiser,
                [
                    'source' => 'external',

                    'kind' => 'commercial',

                    'name' => 'Campanha paga',

                    'channel' => 'public_marketplace',

                    'payment_required' => true,

                    'payment_status' => 'paid',

                    'quoted_price' => 99.90,
                ]
            );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve/public'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.campaign_id',
                $paid->id
            )
            ->assertJsonPath(
                'data.kind',
                'commercial'
            );
    }
);

test(
    'painel público não entrega campanha comercial sem pagamento',
    function () {
        $advertiser =
            deliveryAdvertiser(
                'external',
                'Parceiro sem pagamento'
            );

        deliveryCampaign(
            $advertiser,
            [
                'source' => 'external',

                'kind' => 'commercial',

                'channel' => 'public_marketplace',

                'payment_required' => true,

                'payment_status' => 'pending',

                'quoted_price' => 100,
            ]
        );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve/public'
            )
            ->assertOk()
            ->assertJsonPath(
                'data',
                null
            );
    }
);

test(
    'painel público pode entregar campanha própria do frotapro sem pagamento',
    function () {
        $advertiser =
            deliveryAdvertiser(
                'saas',
                'FrotaPro'
            );

        $campaign =
            deliveryCampaign(
                $advertiser,
                [
                    'source' => 'saas',

                    'kind' => 'house',

                    'channel' => 'public_marketplace',

                    'payment_required' => false,

                    'payment_status' => 'not_required',
                ]
            );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve/public'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.campaign_id',
                $campaign->id
            );
    }
);

test(
    'campanha fora do período não é entregue',
    function () {
        $advertiser =
            deliveryAdvertiser(
                'saas',
                'FrotaPro'
            );

        deliveryCampaign(
            $advertiser,
            [
                'source' => 'saas',

                'kind' => 'house',

                'channel' => 'public_marketplace',

                'start_at' => now()->addDay(),

                'end_at' => now()->addDays(30),
            ]
        );

        $this
            ->withHeaders(
                deliveryHeaders()
            )
            ->getJson(
                '/api/ads/serve/public'
            )
            ->assertOk()
            ->assertJsonPath(
                'data',
                null
            );
    }
);
