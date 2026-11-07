<?php

use App\Models\ModeloDocumentoSaas;
use App\Models\ModeloDocumentoSaasCategoria;
use App\Models\ModeloDocumentoSaasVersao;
use App\Models\TemplateContrato;
use App\Models\User;
use App\Services\ModeloDocumentoSaasService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

test('4r62 dry run rgpd nao altera a base',function(){
    $this
        ->artisan('frotapro:rgpd-draft')
        ->assertExitCode(0);

    expect(
        ModeloDocumentoSaas::count()
    )->toBe(0);

    expect(
        ModeloDocumentoSaasCategoria::count()
    )->toBe(0);
});

test('4r62 rgpd aparece no backoffice sem publicacao',function(){
    $this
        ->artisan(
            'frotapro:rgpd-draft',
            ['--apply'=>true]
        )
        ->assertExitCode(0);

    $model=ModeloDocumentoSaas::query()
        ->where(
            'slug',
            'informacao-tratamento-dados-rgpd'
        )
        ->with('categoria')
        ->firstOrFail();

    expect($model->status)->toBe('rascunho');
    expect($model->ativo)->toBeTrue();
    expect($model->versao)->toBe('1.0');

    expect($model->versao_publicada)->toBeNull();
    expect($model->publicado_em)->toBeNull();

    expect(
        $model->tecnicamente_validado
    )->toBeFalse();

    expect(
        $model->juridicamente_revisto
    )->toBeFalse();

    expect($model->conteudo)
        ->toContain(
            'INFORMAÇÃO SOBRE O TRATAMENTO'
        );

    expect($model->categoria)->not->toBeNull();

    $service=app(
        ModeloDocumentoSaasService::class
    );

    $backoffice=$service->backofficeIndex();

    expect(
        collect($backoffice['data'])
            ->contains(
                fn($item)=>$item->id===$model->id
            )
    )->toBeTrue();

    $tenantCatalog=$service->catalog();

    expect(
        collect($tenantCatalog['data'])
            ->contains(
                fn($item)=>
                    $item['slug']===
                    'informacao-tratamento-dados-rgpd'
            )
    )->toBeFalse();

    expect(
        ModeloDocumentoSaasVersao::count()
    )->toBe(0);

    expect(
        TemplateContrato::count()
    )->toBe(0);
});

test('4r62 registo rgpd e idempotente',function(){
    $this
        ->artisan(
            'frotapro:rgpd-draft',
            ['--apply'=>true]
        )
        ->assertExitCode(0);

    $this
        ->artisan(
            'frotapro:rgpd-draft',
            ['--apply'=>true]
        )
        ->assertExitCode(0);

    expect(
        ModeloDocumentoSaas::query()
            ->where(
                'slug',
                'informacao-tratamento-dados-rgpd'
            )
            ->count()
    )->toBe(1);

    expect(
        ModeloDocumentoSaasCategoria::query()
            ->count()
    )->toBe(1);
});

test('4r62 rgpd nao permite publicacao ou copia tenant',function(){
    $this
        ->artisan(
            'frotapro:rgpd-draft',
            ['--apply'=>true]
        )
        ->assertExitCode(0);

    $model=ModeloDocumentoSaas::query()
        ->where(
            'slug',
            'informacao-tratamento-dados-rgpd'
        )
        ->firstOrFail();

    /*
     * Simular validacao tecnica marcada
     * por engano no backoffice.
     *
     * A guarda RGPD deve impedir a
     * publicacao mesmo nesse caso.
     */
    $model->tecnicamente_validado=true;
    $model->save();

    $service=app(
        ModeloDocumentoSaasService::class
    );

    $user=User::factory()->create();

    expect(
        fn()=>$service->publish(
            $user,
            $model->id
        )
    )->toThrow(
        ValidationException::class
    );

    expect(
        fn()=>$service->copyToTenant(
            (string)Str::uuid(),
            $model->id
        )
    )->toThrow(
        ModelNotFoundException::class
    );

    expect(
        ModeloDocumentoSaasVersao::count()
    )->toBe(0);
});