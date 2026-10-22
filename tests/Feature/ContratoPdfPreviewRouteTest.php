<?php

use Illuminate\Support\Facades\Route;

test('preview pdf possui rota POST protegida',function(){
    expect(Route::has('contratos.preview-pdf'))
        ->toBeTrue();

    $route=Route::getRoutes()
        ->getByName('contratos.preview-pdf');

    expect($route)->not->toBeNull();

    expect($route->uri())
        ->toBe('api/contratos/preview-pdf');

    expect($route->methods())
        ->toContain('POST')
        ->not->toContain('GET');

    expect($route->gatherMiddleware())
        ->toContain('auth:sanctum')
        ->toContain('permission:contratos,configurar')
        ->toContain('throttle:12,1');
});

test('preview pdf exige autenticacao no POST',function(){
    $this->postJson(
        '/api/contratos/preview-pdf',
        []
    )->assertUnauthorized();
});

test('GET anonimo nao permite acesso ao contrato',function(){
    /*
     * GET /api/contratos/preview-pdf tambem corresponde
     * a GET /api/contratos/{id}.
     *
     * A rota generica exige autenticacao.
     * Por isso o resultado correto e 401, nao 405.
     *
     * O metodo GET nao pertence a nova rota PDF,
     * conforme comprovado no primeiro teste.
     */
    $this->getJson(
        '/api/contratos/preview-pdf'
    )->assertUnauthorized();
});

// FROTAPRO_4L2_TENANT_ROUTE

test('preview pdf resolve tenant antes de verificar permissoes',function(){
    $route=\Illuminate\Support\Facades\Route::getRoutes()
        ->getByName('contratos.preview-pdf');

    expect($route)->not->toBeNull();

    $middlewares=$route->gatherMiddleware();

    $auth=array_search('auth:sanctum',$middlewares,true);
    $tenant=array_search('tenant',$middlewares,true);
    $permission=array_search(
        'permission:contratos,configurar',
        $middlewares,
        true
    );

    expect($auth)->not->toBeFalse();
    expect($tenant)->not->toBeFalse();
    expect($permission)->not->toBeFalse();

    expect($auth)->toBeLessThan($tenant);
    expect($tenant)->toBeLessThan($permission);
});
