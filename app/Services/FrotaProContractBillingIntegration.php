<?php
declare(strict_types=1);

namespace App\Services;

use App\Models\Contrato;
use App\Models\TemplateContrato;
use App\Models\TipoContrato;
use Illuminate\Validation\ValidationException;

final class FrotaProContractBillingIntegration
{
    private const CODES=[
        'prestacao_servico',
        'prestacao_de_servicos',
        'prestacao_servicos_motorista',
        'aluguer_tvde_pessoa_singular',
        'aluguer_tvde_pessoa_coletiva',
        'aluguer_veiculo_pessoa_singular',
        'aluguer_veiculo_pessoa_coletiva',
    ];

    public function __construct(
        private FrotaProContractBillingTerms $terms
    ){}

    private function hasMarkers(?string $content):bool
    {
        return str_contains((string)$content,'{{CONDICOES_COBRANCA}}')
            && str_contains((string)$content,'{{PERIODICIDADE_PAGAMENTO_TEXTO}}');
    }

    public function supports(?string $code,?string $content):bool
    {
        return in_array(
            strtolower(trim((string)$code)),
            self::CODES,
            true
        ) && $this->hasMarkers($content);
    }

    public function forRequest(
        array $data,
        ?TipoContrato $type,
        ?TemplateContrato $template
    ):array{
        if(!$this->hasMarkers($template?->conteudo_original)){
            return $data;
        }

        if(!$this->supports($type?->codigo,$template?->conteudo_original)){
            throw ValidationException::withMessages([
                'tipo_contrato_id'=>
                    'O modelo financeiro exige um tipo de Prestação de Serviços ou Aluguer.',
            ]);
        }

        $fields=$this->terms->normalize(
            (array)($data['campos_preenchidos']??[])
        );

        unset($fields['PERCENTAGEM_CONTRATO']);

        $fields['CONDICOES_COBRANCA']=
            $this->terms->description($fields);

        $fields['PERIODICIDADE_PAGAMENTO_TEXTO']=
            $this->terms->periodicityLabel($fields);

        $data['campos_preenchidos']=$fields;

        return $data;
    }

    public function assertSnapshot(Contrato $contract):void
    {
        if(!$this->hasMarkers($contract->template?->conteudo_original)){
            return;
        }

        if(!$this->supports(
            $contract->tipoContrato?->codigo,
            $contract->template?->conteudo_original
        )){
            throw ValidationException::withMessages([
                'tipo_contrato_id'=>
                    'O modelo financeiro não está associado a um tipo válido.',
            ]);
        }

        $fields=(array)($contract->campos_preenchidos??[]);
        $normal=$this->terms->normalize($fields);

        $description=$this->terms->description($normal);
        $period=$this->terms->periodicityLabel($normal);

        if(
            ($fields['CONDICOES_COBRANCA']??null)!==$description ||
            ($fields['PERIODICIDADE_PAGAMENTO_TEXTO']??null)!==$period
        ){
            throw ValidationException::withMessages([
                'campos_preenchidos'=>
                    'As condições financeiras estão incompletas ou foram alteradas.',
            ]);
        }
    }
}
