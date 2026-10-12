<?php

use App\Models\HelpCategory;
use App\Models\HelpContent;
use App\Models\HelpContentView;
use App\Models\NotificationPreference;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SaasPlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function(){
    $this->seed([
        RoleSeeder::class,
        SaasPlanSeeder::class,
    ]);
});

function onboardingProgressHeaders(): array
{
    return [
        'Origin'=>'http://localhost:8000',
        'Referer'=>'http://localhost:8000/',
        'Accept'=>'application/json',
    ];
}

function onboardingProgressCreate($test): array
{
    $test
        ->post('/registar',[
            'name'=>'Gestor Onboarding',
            'email'=>'onboarding.progress@test.pt',
            'phone'=>'+351 910 100 100',
            'password'=>'SenhaTeste123',
            'password_confirmation'=>'SenhaTeste123',
            'company_name'=>'Frota Onboarding Lda',
            'company_nif'=>'500987654',
            'company_email'=>'geral@onboarding.pt',
            'company_phone'=>'+351 210 100 100',
            'terms'=>true,
        ])
        ->assertRedirect('/onboarding');

    $test
        ->withHeaders(
            onboardingProgressHeaders()
        )
        ->patchJson(
            '/api/onboarding',
            [
                'company_name'=>'Frota Onboarding Lda',
                'company_email'=>'geral@onboarding.pt',
                'company_phone'=>'+351 210 100 100',
                'manager_name'=>'Gestor Onboarding',
                'address_street'=>'Avenida Teste',
                'address_number'=>'10',
                'address_complement'=>null,
                'address_postal_code'=>'1000-100',
                'address_city'=>'Lisboa',
                'certificate_tvde'=>null,
                'certificate_tvde_valid_until'=>null,
            ]
        )
        ->assertOk();

    $tenant=
        Tenant::query()
            ->where(
                'nif',
                '500987654'
            )
            ->firstOrFail();

    $user=
        User::query()
            ->where(
                'email',
                'onboarding.progress@test.pt'
            )
            ->firstOrFail();

    return [
        $tenant,
        $user,
    ];
}

test(
    'progresso do onboarding exige autenticacao',
    function(){
        $this
            ->withHeaders(
                onboardingProgressHeaders()
            )
            ->getJson(
                '/api/onboarding/progresso'
            )
            ->assertUnauthorized();
    }
);

test(
    'empresa concluida aparece automaticamente no progresso',
    function(){
        onboardingProgressCreate(
            $this
        );

        $this
            ->withHeaders(
                onboardingProgressHeaders()
            )
            ->getJson(
                '/api/onboarding/progresso'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.total',
                8
            )
            ->assertJsonPath(
                'data.completed',
                1
            )
            ->assertJsonPath(
                'data.steps.0.key',
                'company'
            )
            ->assertJsonPath(
                'data.steps.0.completed',
                true
            )
            ->assertJsonPath(
                'data.steps.1.completed',
                false
            );
    }
);

test(
    'dados de outro tenant nao concluem etapas',
    function(){
        onboardingProgressCreate(
            $this
        );

        $other=
            Tenant::create([
                'nome'=>'Outra Frota',
                'slug'=>'outra-frota-onboarding',
                'ativo'=>true,
            ]);

        DB::table(
            'proprietarios'
        )->insert([
            'id'=>
                (string)Str::uuid(),

            'tenant_id'=>
                $other->id,

            'tipo'=>'individual',

            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        $this
            ->withHeaders(
                onboardingProgressHeaders()
            )
            ->getJson(
                '/api/onboarding/progresso'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.steps.1.completed',
                false
            );
    }
);

test(
    'cadastros operacionais concluem automaticamente a base',
    function(){
        [
            $tenant,
        ]=
            onboardingProgressCreate(
                $this
            );

        DB::table(
            'proprietarios'
        )->insert([
            'id'=>
                (string)Str::uuid(),

            'tenant_id'=>
                $tenant->id,

            'tipo'=>'individual',

            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        DB::table(
            'veiculos'
        )->insert([
            'id'=>
                (string)Str::uuid(),

            'tenant_id'=>
                $tenant->id,

            'matricula'=>'AA-11-BB',

            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        DB::table(
            'motoristas'
        )->insert([
            'id'=>
                (string)Str::uuid(),

            'tenant_id'=>
                $tenant->id,

            'nome_completo'=>
                'Motorista Teste',

            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        $this
            ->withHeaders(
                onboardingProgressHeaders()
            )
            ->getJson(
                '/api/onboarding/progresso'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.core_completed',
                4
            )
            ->assertJsonPath(
                'data.core_total',
                4
            )
            ->assertJsonPath(
                'data.core_progress',
                100
            )
            ->assertJsonPath(
                'data.base_ready',
                true
            );
    }
);

test(
    'etapas recomendadas tambem sao detectadas automaticamente',
    function(){
        [
            $tenant,
            $user,
        ]=
            onboardingProgressCreate(
                $this
            );

        DB::table(
            'proprietarios'
        )->insert([
            'id'=>
                (string)Str::uuid(),
            'tenant_id'=>$tenant->id,
            'tipo'=>'individual',
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        DB::table(
            'veiculos'
        )->insert([
            'id'=>
                (string)Str::uuid(),
            'tenant_id'=>$tenant->id,
            'matricula'=>'CC-22-DD',
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        DB::table(
            'motoristas'
        )->insert([
            'id'=>
                (string)Str::uuid(),
            'tenant_id'=>$tenant->id,
            'nome_completo'=>'Motorista Completo',
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        DB::table(
            'contratos'
        )->insert([
            'id'=>
                (string)Str::uuid(),
            'tenant_id'=>$tenant->id,
            'tipo'=>'aluguer',
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        DB::table(
            'funcionarios'
        )->insert([
            'id'=>
                (string)Str::uuid(),
            'tenant_id'=>$tenant->id,
            'nome'=>'Funcionário Teste',
            'data_admissao'=>today(),
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);

        $preference=
            new NotificationPreference();

        $preference->tenant_id=
            $tenant->id;

        $preference->user_id=
            $user->id;

        $preference->category='*';
        $preference->channel='email';
        $preference->enabled=true;
        $preference->minimum_severity='low';
        $preference->delivery_mode='immediate';
        $preference->save();

        $category=
            HelpCategory::create([
                'name'=>'Primeiros passos',
                'slug'=>'onboarding-progress-test',
                'position'=>1,
                'active'=>true,
            ]);

        $content=
            HelpContent::create([
                'category_id'=>$category->id,
                'type'=>'article',
                'title'=>'Conheça o FrotaPro',
                'slug'=>'conheca-o-frotapro-progress-test',
                'body'=>'Conteúdo.',
                'feature_key'=>'onboarding',
                'position'=>1,
                'featured'=>true,
                'active'=>true,
                'published_at'=>now()->subMinute(),
            ]);

        $content
            ->audiences()
            ->create([
                'audience'=>'admin_empresa',
            ]);

        HelpContentView::create([
            'content_id'=>$content->id,
            'user_id'=>$user->id,
            'tenant_id'=>$tenant->id,
            'audiences'=>[
                'admin_empresa',
            ],
            'views'=>1,
            'first_viewed_at'=>now(),
            'last_viewed_at'=>now(),
        ]);

        $this
            ->withHeaders(
                onboardingProgressHeaders()
            )
            ->getJson(
                '/api/onboarding/progresso'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.completed',
                8
            )
            ->assertJsonPath(
                'data.total',
                8
            )
            ->assertJsonPath(
                'data.progress',
                100
            )
            ->assertJsonPath(
                'data.fully_complete',
                true
            );
    }
);

test(
    'onboarding sugere conteudo da central de ajuda pela funcionalidade',
    function(){
        [
            $tenant,
        ]=
            onboardingProgressCreate(
                $this
            );

        $category=
            HelpCategory::create([
                'name'=>'Veículos',
                'slug'=>'veiculos-onboarding-test',
                'position'=>1,
                'active'=>true,
            ]);

        $content=
            HelpContent::create([
                'category_id'=>$category->id,
                'type'=>'video',
                'title'=>'Como cadastrar um veículo',
                'slug'=>'como-cadastrar-veiculo-onboarding-test',
                'youtube_url'=>'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'youtube_video_id'=>'dQw4w9WgXcQ',
                'feature_key'=>'veiculos',
                'position'=>1,
                'featured'=>true,
                'active'=>true,
                'published_at'=>now()->subMinute(),
            ]);

        $content
            ->audiences()
            ->create([
                'audience'=>'admin_empresa',
            ]);

        $response=
            $this
                ->withHeaders(
                    onboardingProgressHeaders()
                )
                ->getJson(
                    '/api/onboarding/progresso'
                )
                ->assertOk();

        $steps=
            collect(
                $response->json(
                    'data.steps'
                )
            );

        $vehicle=
            $steps->firstWhere(
                'key',
                'vehicle'
            );

        expect(
            $vehicle
                ['help'][0]
                ['title']
        )->toBe(
            'Como cadastrar um veículo'
        );

        expect(
            $vehicle
                ['help'][0]
                ['url']
        )->toBe(
            '/ajuda/'.
            $content->slug
        );

        expect(
            $vehicle[
                'completed'
            ]
        )->toBeFalse();
    }
);
