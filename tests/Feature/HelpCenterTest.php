<?php

use App\Models\HelpCategory;
use App\Models\HelpContent;
use App\Models\HelpContentView;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed(RoleSeeder::class);
});

function hcHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function hcTenant(string $name,string $slug): Tenant
{
    return Tenant::create([
        'nome'=>$name,
        'slug'=>$slug,
        'ativo'=>true,
    ]);
}

function hcUser(Tenant $tenant,string $role,string $email): User
{
    $user=User::factory()->create([
        'email'=>$email,
        'ativo'=>true,
    ]);

    TenantUser::create([
        'tenant_id'=>$tenant->id,
        'user_id'=>$user->id,
        'status'=>'ativo',
        'principal'=>true,
    ]);

    $roleModel=Role::where('codigo',$role)->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$roleModel->id,
        'tenant_id'=>$tenant->id,
    ]);

    return $user;
}

function hcAdmin(): User
{
    $user=User::factory()->create([
        'email'=>'admin.help@example.test',
        'ativo'=>true,
    ]);

    $role=Role::where('codigo','super_admin')->firstOrFail();

    UserRole::create([
        'user_id'=>$user->id,
        'role_id'=>$role->id,
        'tenant_id'=>null,
    ]);

    return $user;
}

function hcActTenant($test,User $user,Tenant $tenant): void
{
    $test->flushSession();
    Auth::forgetGuards();

    $test
        ->withHeaders(hcHeaders())
        ->actingAs($user,'web')
        ->withSession([
            'tenant_id'=>$tenant->id,
        ]);
}

function hcActAdmin($test,User $user): void
{
    $test->flushSession();
    Auth::forgetGuards();

    $test
        ->withHeaders(hcHeaders())
        ->actingAs($user,'web');
}

function hcCategory(): HelpCategory
{
    return HelpCategory::create([
        'name'=>'Primeiros passos',
        'slug'=>'primeiros-passos',
        'position'=>10,
        'active'=>true,
    ]);
}

function hcCreateContent(
    User $admin,
    HelpCategory $category,
    array $audiences,
    array $extra=[]
): HelpContent {
    $content=HelpContent::create([
        'category_id'=>$category->id,
        'type'=>'article',
        'title'=>'Como começar',
        'slug'=>'como-comecar-'.strtolower(substr(str_replace('-','',$category->id),0,6)),
        'excerpt'=>'Introdução ao FrotaPro',
        'body'=>'Passo a passo.',
        'feature_key'=>'dashboard',
        'position'=>10,
        'featured'=>false,
        'active'=>true,
        'published_at'=>now()->subMinute(),
        'created_by_user_id'=>$admin->id,
        'updated_by_user_id'=>$admin->id,
        ...$extra,
    ]);

    foreach($audiences as $audience){
        $content->audiences()->create([
            'audience'=>$audience,
        ]);
    }

    return $content;
}

test('central de ajuda exige autenticacao',function(){
    $this
        ->withHeaders(hcHeaders())
        ->getJson('/api/ajuda')
        ->assertUnauthorized();
});

test('gestor ve apenas conteudo destinado ao gestor',function(){
    $tenant=hcTenant('Frota A','hc-a');
    $manager=hcUser($tenant,'admin_empresa','gestor.hc@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['admin_empresa'],[
        'title'=>'Gestão da frota',
        'slug'=>'gestao-da-frota',
    ]);

    hcCreateContent($admin,$category,['motorista'],[
        'title'=>'Área do motorista',
        'slug'=>'area-do-motorista',
    ]);

    hcActTenant($this,$manager,$tenant);

    $this
        ->getJson('/api/ajuda')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath('data.0.title','Gestão da frota');
});

test('motorista recebe apenas conteudos destinados ao motorista',function(){
    $tenant=hcTenant('Frota B','hc-b');
    $driver=hcUser($tenant,'motorista','motorista.hc@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['motorista'],[
        'title'=>'Recibo verde',
        'slug'=>'recibo-verde',
    ]);

    hcCreateContent($admin,$category,['admin_empresa'],[
        'title'=>'Cadastrar motorista',
        'slug'=>'cadastrar-motorista',
    ]);

    hcActTenant($this,$driver,$tenant);

    $this
        ->getJson('/api/ajuda')
        ->assertOk()
        ->assertJsonCount(1,'data')
        ->assertJsonPath('data.0.title','Recibo verde');
});

test('proprietario recebe apenas conteudos destinados ao proprietario',function(){
    $tenant=hcTenant('Frota C','hc-c');
    $owner=hcUser($tenant,'proprietario','proprietario.hc@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['proprietario'],[
        'title'=>'Meus veículos',
        'slug'=>'meus-veiculos',
    ]);

    hcActTenant($this,$owner,$tenant);

    $this
        ->getJson('/api/ajuda')
        ->assertOk()
        ->assertJsonPath('data.0.title','Meus veículos');
});

test('conteudo pode ser partilhado entre varios publicos',function(){
    $tenant=hcTenant('Frota Multi','hc-multi');
    $driver=hcUser($tenant,'motorista','multi.driver@example.test');
    $owner=hcUser($tenant,'proprietario','multi.owner@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent(
        $admin,
        $category,
        ['motorista','proprietario'],
        [
            'title'=>'Consultar multas',
            'slug'=>'consultar-multas',
        ]
    );

    hcActTenant($this,$driver,$tenant);

    $this
        ->getJson('/api/ajuda')
        ->assertOk()
        ->assertJsonCount(1,'data');

    hcActTenant($this,$owner,$tenant);

    $this
        ->getJson('/api/ajuda')
        ->assertOk()
        ->assertJsonCount(1,'data');
});

test('conteudo nao publicado ou agendado para futuro fica oculto',function(){
    $tenant=hcTenant('Frota Publicação','hc-publicacao');
    $manager=hcUser($tenant,'admin_empresa','publicacao@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['admin_empresa'],[
        'title'=>'Rascunho',
        'slug'=>'rascunho',
        'active'=>false,
    ]);

    hcCreateContent($admin,$category,['admin_empresa'],[
        'title'=>'Futuro',
        'slug'=>'futuro',
        'published_at'=>now()->addDay(),
    ]);

    hcActTenant($this,$manager,$tenant);

    $this
        ->getJson('/api/ajuda')
        ->assertOk()
        ->assertJsonCount(0,'data');
});

test('super admin cria artigo pela api',function(){
    $admin=hcAdmin();
    $category=hcCategory();

    hcActAdmin($this,$admin);

    $this
        ->postJson('/api/backoffice/ajuda/conteudos',[
            'category_id'=>$category->id,
            'type'=>'article',
            'title'=>'Criar motorista',
            'excerpt'=>'Passo a passo.',
            'body'=>'Abra Motoristas e clique em Novo motorista.',
            'feature_key'=>'motoristas',
            'audiences'=>['admin_empresa'],
            'position'=>10,
            'featured'=>true,
            'active'=>true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.type','article')
        ->assertJsonPath('data.audiences.0.value','admin_empresa');

    expect(HelpContent::count())->toBe(1);
});

test('super admin cria video youtube e id e extraido',function(){
    $admin=hcAdmin();
    $category=hcCategory();

    hcActAdmin($this,$admin);

    $this
        ->postJson('/api/backoffice/ajuda/conteudos',[
            'category_id'=>$category->id,
            'type'=>'video',
            'title'=>'Tutorial veículos',
            'youtube_url'=>'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'feature_key'=>'veiculos',
            'audiences'=>['admin_empresa','funcionario'],
            'position'=>10,
            'featured'=>false,
            'active'=>true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.youtube_video_id','dQw4w9WgXcQ');
});

test('url que nao seja youtube e rejeitado',function(){
    $admin=hcAdmin();
    $category=hcCategory();

    hcActAdmin($this,$admin);

    $this
        ->postJson('/api/backoffice/ajuda/conteudos',[
            'category_id'=>$category->id,
            'type'=>'video',
            'title'=>'Vídeo inválido',
            'youtube_url'=>'https://example.com/video',
            'audiences'=>['admin_empresa'],
            'position'=>0,
            'featured'=>false,
            'active'=>true,
        ])
        ->assertUnprocessable();
});

test('visualizacao e acumulada por utilizador e tenant',function(){
    $tenant=hcTenant('Frota Views','hc-views');
    $manager=hcUser($tenant,'admin_empresa','views@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    $content=hcCreateContent(
        $admin,
        $category,
        ['admin_empresa'],
        [
            'title'=>'Conteúdo visto',
            'slug'=>'conteudo-visto',
        ]
    );

    hcActTenant($this,$manager,$tenant);

    $this
        ->postJson("/api/ajuda/conteudos/{$content->id}/visualizacao")
        ->assertOk();

    $this
        ->postJson("/api/ajuda/conteudos/{$content->id}/visualizacao")
        ->assertOk();

    expect(
        HelpContentView::where('content_id',$content->id)
            ->where('user_id',$manager->id)
            ->value('views')
    )->toBe(2);

    expect(
        HelpContentView::where('content_id',$content->id)->count()
    )->toBe(1);
});

test('conteudo oculto nao pode ser aberto diretamente pelo slug',function(){
    $tenant=hcTenant('Frota Privada','hc-private');
    $driver=hcUser($tenant,'motorista','private.driver@example.test');
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['admin_empresa'],[
        'title'=>'Somente gestores',
        'slug'=>'somente-gestores',
    ]);

    hcActTenant($this,$driver,$tenant);

    $this
        ->getJson('/api/ajuda/conteudos/somente-gestores')
        ->assertNotFound();
});

test('categoria com conteudo nao pode ser eliminada',function(){
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['admin_empresa']);

    hcActAdmin($this,$admin);

    $this
        ->deleteJson("/api/backoffice/ajuda/categorias/{$category->id}")
        ->assertUnprocessable();
});

test('dashboard do backoffice apresenta metricas',function(){
    $admin=hcAdmin();
    $category=hcCategory();

    hcCreateContent($admin,$category,['admin_empresa']);

    hcActAdmin($this,$admin);

    $this
        ->getJson('/api/backoffice/ajuda/resumo')
        ->assertOk()
        ->assertJsonPath('data.contents',1)
        ->assertJsonPath('data.articles',1)
        ->assertJsonPath('data.categories',1);
});
