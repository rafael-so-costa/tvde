<?php

use App\Models\ConteudoPost;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function conteudoHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function conteudoAdmin(): User
{
    $user=User::factory()->create([
        'email'=>'conteudo.admin@frotapro.test',
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

function conteudoLogin($test,User $user): void
{
    $test->postJson('/login',[
        'email'=>$user->email,
        'password'=>'SenhaTeste123!',
    ])->assertOk();
}

test('conteúdo do backoffice exige autenticação',function(){
    $this
        ->withHeaders(conteudoHeaders())
        ->getJson('/api/backoffice/conteudo')
        ->assertUnauthorized();
});

test('super admin cria publica e edita artigo do blog',function(){
    $admin=conteudoAdmin();

    conteudoLogin($this,$admin);

    $categoryResponse=
        $this
            ->withHeaders(conteudoHeaders())
            ->postJson(
                '/api/backoffice/conteudo/categorias',
                [
                    'nome'=>'Gestão TVDE',
                ]
            )
            ->assertCreated();

    $categoryId=
        $categoryResponse->json('data.id');

    $response=
        $this
            ->withHeaders(conteudoHeaders())
            ->postJson(
                '/api/backoffice/conteudo',
                [
                    'categoria_id'=>$categoryId,
                    'tipo'=>'artigo',
                    'titulo'=>'Como gerir uma frota TVDE',
                    'resumo'=>'Boas práticas para gestores de frota.',
                    'conteudo'=>'Conteúdo completo do artigo FrotaPRO.',
                    'seo_title'=>'Gestão de Frota TVDE | FrotaPRO',
                    'seo_description'=>'Guia para gestão de frota TVDE.',
                    'tags'=>[
                        'TVDE',
                        'Gestão',
                    ],
                ]
            )
            ->assertCreated()
            ->assertJsonPath(
                'data.status',
                'rascunho'
            );

    $id=
        $response->json('data.id');

    $this
        ->withHeaders(conteudoHeaders())
        ->postJson(
            "/api/backoffice/conteudo/{$id}/publicar"
        )
        ->assertOk()
        ->assertJsonPath(
            'data.status',
            'publicado'
        );

    $post=
        ConteudoPost::query()
            ->findOrFail($id);

    expect(
        $post->publicado_em
    )->not->toBeNull();

    $this
        ->get('/blog')
        ->assertOk()
        ->assertSee(
            'Como gerir uma frota TVDE'
        );

    $this
        ->get(
            "/blog/{$post->slug}"
        )
        ->assertOk()
        ->assertSee(
            'Conteúdo completo do artigo FrotaPRO.'
        );
});

test('rascunho não aparece no blog público',function(){
    $admin=conteudoAdmin();

    conteudoLogin($this,$admin);

    $this
        ->withHeaders(conteudoHeaders())
        ->postJson(
            '/api/backoffice/conteudo',
            [
                'tipo'=>'artigo',
                'titulo'=>'Artigo ainda privado',
                'conteudo'=>'Este conteúdo ainda é rascunho.',
            ]
        )
        ->assertCreated();

    $this
        ->get('/blog')
        ->assertOk()
        ->assertDontSee(
            'Artigo ainda privado'
        );
});