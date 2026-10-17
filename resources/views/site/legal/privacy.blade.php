@extends('site.layouts.site')

@section('title','Política de Privacidade — FrotaPRO')
@section('description','Informação sobre o tratamento de dados pessoais realizado no âmbito do FrotaPRO.')

@section('content')
<div class="min-h-screen bg-slate-50">
@include('site.partials.public-header',['active'=>'legal'])

<main class="mx-auto max-w-4xl px-5 py-14 sm:px-6 lg:px-8">
    <p class="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Proteção de dados</p>
    <h1 class="mt-3 text-4xl font-bold tracking-tight text-slate-950">Política de Privacidade</h1>
    <p class="mt-4 text-sm text-slate-500">Última atualização: {{ config('legal.last_updated') }}</p>

    <div class="mt-10 space-y-10 text-[15px] leading-7 text-slate-600">

        <section>
            <h2 class="text-xl font-bold text-slate-900">1. Quem trata os dados</h2>
            <p class="mt-3">
                Para os dados relativos à criação e administração de contas, contratação, faturação, suporte, segurança e utilização institucional do serviço, a entidade responsável pelo FrotaPRO atua como responsável pelo tratamento.
            </p>

            <div class="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
                <p><strong class="text-slate-800">Responsável:</strong> {{ config('legal.entity_name') }}</p>

                @if(config('legal.nif'))
                    <p><strong class="text-slate-800">NIF:</strong> {{ config('legal.nif') }}</p>
                @endif

                @if(config('legal.address'))
                    <p><strong class="text-slate-800">Morada:</strong> {{ config('legal.address') }}</p>
                @endif

                @if(config('legal.privacy_email'))
                    <p><strong class="text-slate-800">Privacidade:</strong> {{ config('legal.privacy_email') }}</p>
                @endif
            </div>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">2. Dados tratados por conta dos clientes</h2>
            <p class="mt-3">
                Quando uma empresa cliente utiliza o FrotaPRO para gerir dados relativos aos seus motoristas, proprietários, funcionários, veículos, contratos, documentos, expediente, ocorrências ou outros processos operacionais, essa empresa determina as finalidades desse tratamento.
            </p>
            <p class="mt-3">
                Nessas situações, o cliente atua normalmente como responsável pelo tratamento e o FrotaPRO atua enquanto subcontratante, tratando os dados para prestar o serviço contratado e de acordo com as instruções legítimas do cliente.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">3. Categorias de dados</h2>
            <p class="mt-3">
                Dependendo da utilização do serviço, poderão ser tratados dados de identificação e contacto, dados profissionais e empresariais, credenciais e dados de autenticação, informação relativa a veículos e operação TVDE, documentos enviados pelo utilizador, registos de atividade, dados técnicos de acesso, informação de suporte e dados necessários à faturação e pagamento.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">4. Finalidades e fundamentos</h2>
            <p class="mt-3">
                Os dados podem ser tratados para criação e gestão de contas, prestação das funcionalidades contratadas, segurança, prevenção de abuso, suporte, comunicações relacionadas com o serviço, faturação, cumprimento de obrigações legais e melhoria da plataforma.
            </p>
            <p class="mt-3">
                Consoante o tratamento, os fundamentos jurídicos podem incluir a execução de contrato, cumprimento de obrigação jurídica, interesse legítimo ou consentimento quando este seja efetivamente o fundamento adequado.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">5. Pagamentos</h2>
            <p class="mt-3">
                Os pagamentos poderão ser processados por prestadores especializados. Os dados necessários ao processamento financeiro são comunicados ao respetivo prestador na medida necessária à execução do pagamento, faturação, prevenção de fraude e gestão da subscrição.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">6. Destinatários e prestadores</h2>
            <p class="mt-3">
                Poderão ser utilizados prestadores de alojamento, infraestrutura, correio eletrónico, comunicações, pagamentos, armazenamento, suporte técnico, monitorização e outros serviços necessários à operação do FrotaPRO.
                Esses prestadores apenas devem receber os dados necessários à respetiva função e ficam sujeitos às obrigações aplicáveis.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">7. Transferências internacionais</h2>
            <p class="mt-3">
                Quando um prestador implicar tratamento de dados fora do Espaço Económico Europeu, serão utilizados os mecanismos e garantias legalmente exigidos para a transferência internacional de dados.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">8. Conservação</h2>
            <p class="mt-3">
                Os dados são conservados durante o período necessário às finalidades para as quais foram recolhidos, à vigência da relação contratual e, posteriormente, pelos períodos necessários ao cumprimento de obrigações legais, resolução de litígios, segurança e exercício ou defesa de direitos.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">9. Segurança</h2>
            <p class="mt-3">
                São adotadas medidas técnicas e organizativas destinadas a proteger os dados contra acesso não autorizado, perda, alteração, divulgação ou destruição indevida, tendo em conta a natureza dos dados e os riscos envolvidos.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">10. Direitos dos titulares</h2>
            <p class="mt-3">
                Nos termos aplicáveis, os titulares podem exercer direitos de acesso, retificação, apagamento, limitação, oposição e portabilidade, bem como retirar consentimento quando o tratamento tenha esse fundamento.
            </p>

            @if(config('legal.privacy_email'))
                <p class="mt-3">
                    Os pedidos podem ser enviados para
                    <a href="mailto:{{ config('legal.privacy_email') }}" class="font-semibold text-indigo-600">{{ config('legal.privacy_email') }}</a>.
                </p>
            @endif
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">11. Reclamações</h2>
            <p class="mt-3">
                O titular dos dados tem ainda o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD), sem prejuízo de outros meios administrativos ou judiciais disponíveis.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">12. Cookies</h2>
            <p class="mt-3">
                A utilização de cookies e tecnologias semelhantes encontra-se descrita na
                <a href="{{ route('site.legal.cookies') }}" class="font-semibold text-indigo-600">Política de Cookies</a>.
            </p>
        </section>
    </div>
</main>

@include('site.partials.public-footer')
</div>
@endsection