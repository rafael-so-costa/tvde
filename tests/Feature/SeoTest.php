<?php

use App\Models\Role;
use App\Models\SeoConfiguracao;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function seoHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function seoAdmin(): User
{
    $user=User::factory()->create([
        'email'=>'seo.admin@frotapro.test',
        'password'=>Hash::make('SenhaTeste123!'),
        'ativo'=>true,
    ]);

    $role=Role::query()
        ->where('codigo','super_admin')
        ->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>null,
    ]);

    return $user;
}

function seoLogin($test,User $user): void
{
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

test('seo backoffice exige autenticação',function(){
    $this
        ->withHeaders(seoHeaders())
        ->getJson('/api/backoffice/seo')
        ->assertUnauthorized();
});

test('super admin configura seo das páginas públicas',function(){
    $admin=seoAdmin();

    seoLogin($this,$admin);

    $this
        ->withHeaders(seoHeaders())
        ->patchJson('/api/backoffice/seo/anuncios',[
            'titulo'=>'Marketplace TVDE | FrotaPRO',
            'descricao'=>'Soluções para empresas e profissionais TVDE.',
            'robots'=>'index,follow',
            'og_title'=>'FrotaPRO Ads',
            'og_description'=>'Marketplace especializado no ecossistema TVDE.',
            'twitter_card'=>'summary_large_image',
            'schema_type'=>'CollectionPage',
        ])
        ->assertOk()
        ->assertJsonPath('data.chave','anuncios')
        ->assertJsonPath('data.titulo','Marketplace TVDE | FrotaPRO');

    $this->assertDatabaseHas('seo_configuracoes',[
        'chave'=>'anuncios',
        'titulo'=>'Marketplace TVDE | FrotaPRO',
        'updated_by'=>$admin->id,
    ]);

    $this
        ->withHeaders(seoHeaders())
        ->getJson('/api/backoffice/seo')
        ->assertOk()
        ->assertJsonFragment([
            'chave'=>'anuncios',
        ]);
});

test('home pública utiliza configuração seo',function(){
    SeoConfiguracao::create([
        'chave'=>'home',
        'titulo'=>'Gestão TVDE em Portugal | FrotaPRO',
        'descricao'=>'Gestão completa para operadores TVDE.',
        'robots'=>'index,follow',
    ]);

    $this
        ->get('/')
        ->assertOk()
        ->assertSee(
            '<title>Gestão TVDE em Portugal | FrotaPRO</title>',
            false
        )
        ->assertSee(
            'content="Gestão completa para operadores TVDE."',
            false
        );
});