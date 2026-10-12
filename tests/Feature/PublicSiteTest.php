<?php

test('home comercial é pública', function () {
    $this
        ->get('/')
        ->assertOk()
        ->assertSee('Antecipe problemas na sua operação TVDE.')
        ->assertSee('Controle tudo num único lugar.')
        ->assertSee('Tudo o que precisa para gerir uma operação TVDE.')
        ->assertSee('Portal do Motorista')
        ->assertSee('Portal do Proprietário')
        ->assertSee('Perguntas frequentes')
        ->assertSee('Quero conhecer o FrotaPRO')
        ->assertSee('FrotaPRO');
});

test('registo público carrega entrada do onboarding', function () {
    $this
        ->get('/registar')
        ->assertOk()
        ->assertSee('Comece a organizar a sua operação TVDE.')
        ->assertSee('Passo 1 de 3')
        ->assertSee('Criar conta');
});

test('painel continua a carregar a aplicação', function () {
    $this
        ->get('/painel')
        ->assertOk()
        ->assertSee('id="app"', false);
});

test('login continua a carregar a aplicação', function () {
    $this
        ->get('/login')
        ->assertOk()
        ->assertSee('id="app"', false);
});