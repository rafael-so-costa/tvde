<?php

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Models\Tenant;
use App\Models\TipoContrato;
use App\Models\User;
use App\Services\ContratoService;
use App\Services\ContratoTipoResolverService;
use App\Services\FrotaProContractBillingIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function b4n5Fixtures():array
{
    $tenant=Tenant::create([
        'nome'=>'Tenant Financeiro 4N5',
        'slug'=>'tenant-financeiro-4n5',
        'ativo'=>true,
    ]);

    $template=new TemplateContrato([
        'nome'=>'Modelo financeiro de teste',
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>
            'Condições: {{CONDICOES_COBRANCA}}. '.
            'Periodicidade: {{PERIODICIDADE_PAGAMENTO_TEXTO}}.',
        'campos_detectados'=>[],
        'campos_mapeados'=>[],
    ]);

    $template->tenant_id=$tenant->id;
    $template->ativo=true;
    $template->save();

    $type=new TipoContrato([
        'nome'=>'Prestação de Serviços 4N5',
        'slug'=>'prestacao-servicos-4n5',
        'codigo'=>'prestacao_servico',
        'template_id'=>$template->id,
        'entidades'=>[],
        'campos_configuracao'=>[],
        'assinaturas_configuracao'=>[],
        'configuracao'=>[],
        'ativo'=>true,
        'mostrar_menu'=>true,
        'ordem'=>1,
    ]);

    $type->tenant_id=$tenant->id;
    $type->save();

    return [$tenant,$template,$type];
}

function b4n5Fields(string $value='25'):array
{
    return [
        'TIPO_COBRANCA'=>'mista',
        'VALOR_FIXO_COBRANCA'=>$value,
        'PERCENTAGEM_COBRANCA'=>'5',
        'BASE_CALCULO_COBRANCA'=>'faturação bruta',
        'PERIODICIDADE_PAGAMENTO'=>'quinzenal',
    ];
}

test('4n5 bloqueia modelo financeiro sem tipo configurado',function(){
    [$tenant,$template]=b4n5Fixtures();

    expect(fn()=>app(ContratoTipoResolverService::class)
        ->resolve(
            ['template_id'=>$template->id],
            $tenant->id
        )
    )->toThrow(ValidationException::class);

    expect(Contrato::count())->toBe(0);
});

test('4n5 permite modelo legado sem tipo configurado',function(){
    [$tenant]=b4n5Fixtures();

    $legacy=new TemplateContrato([
        'nome'=>'Modelo legado',
        'tipo_arquivo'=>'txt',
        'conteudo_original'=>'Contrato legado {{PERCENTAGEM_CONTRATO}}',
        'campos_detectados'=>[],
        'campos_mapeados'=>[],
    ]);

    $legacy->tenant_id=$tenant->id;
    $legacy->ativo=true;
    $legacy->save();

    $result=app(ContratoTipoResolverService::class)
        ->resolve(
            ['template_id'=>$legacy->id],
            $tenant->id
        );

    expect($result['tipo_contrato'])->toBeNull();
});

test('4n5 atualiza condicoes de rascunho sem alterar o template',function(){
    [$tenant,$template,$type]=b4n5Fixtures();

    $actor=User::factory()->create();

    $data=app(FrotaProContractBillingIntegration::class)
        ->forRequest(
            ['campos_preenchidos'=>b4n5Fields()],
            $type,
            $template
        );

    $contract=new Contrato([
        'template_id'=>$template->id,
        'tipo_contrato_id'=>$type->id,
        'tipo'=>'prestacao_servico',
        'campos_preenchidos'=>$data['campos_preenchidos'],
    ]);

    $contract->tenant_id=$tenant->id;
    $contract->status='rascunho';
    $contract->bloqueado=false;
    $contract->save();

    $updated=app(ContratoService::class)
        ->updateDraft(
            $contract->id,
            $tenant->id,
            ['campos_preenchidos'=>b4n5Fields('50')],
            $actor
        );

    expect($updated->campos_preenchidos['CONDICOES_COBRANCA'])
        ->toContain('50,00 €');

    expect($updated->template_id)->toBe($template->id);
    expect($updated->versao_atual)->toBe(2);

    app(FrotaProContractBillingIntegration::class)
        ->assertSnapshot($updated);
});

test('4n5 rejeita edicao de rascunho financeiro incompleta',function(){
    [$tenant,$template,$type]=b4n5Fixtures();

    $actor=User::factory()->create();

    $data=app(FrotaProContractBillingIntegration::class)
        ->forRequest(
            ['campos_preenchidos'=>b4n5Fields()],
            $type,
            $template
        );

    $contract=new Contrato([
        'template_id'=>$template->id,
        'tipo_contrato_id'=>$type->id,
        'tipo'=>'prestacao_servico',
        'campos_preenchidos'=>$data['campos_preenchidos'],
    ]);

    $contract->tenant_id=$tenant->id;
    $contract->status='rascunho';
    $contract->save();

    $invalid=b4n5Fields();
    unset($invalid['BASE_CALCULO_COBRANCA']);

    expect(fn()=>app(ContratoService::class)
        ->updateDraft(
            $contract->id,
            $tenant->id,
            ['campos_preenchidos'=>$invalid],
            $actor
        )
    )->toThrow(ValidationException::class);

    expect($contract->fresh()->versao_atual)->toBe(1);
});
