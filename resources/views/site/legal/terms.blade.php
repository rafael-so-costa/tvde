@extends('site.layouts.site')

@section('title','Termos de Utilização — FrotaPRO')
@section('description','Termos e condições de utilização da plataforma FrotaPRO.')

@section('content')
<div class="min-h-screen bg-slate-50">
@include('site.partials.public-header',['active'=>'legal'])

<main class="mx-auto max-w-4xl px-5 py-14 sm:px-6 lg:px-8">
    <p class="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Informação legal</p>
    <h1 class="mt-3 text-4xl font-bold tracking-tight text-slate-950">Termos de Utilização</h1>
    <p class="mt-4 text-sm text-slate-500">Última atualização: {{ config('legal.last_updated') }}</p>

    <div class="mt-10 space-y-10 text-[15px] leading-7 text-slate-600">

        <section>
            <h2 class="text-xl font-bold text-slate-900">1. Identificação e âmbito</h2>
            <p class="mt-3">
                O FrotaPRO é uma plataforma tecnológica destinada à gestão operacional de empresas e frotas TVDE.
                Estes Termos regulam o acesso e utilização da plataforma, dos seus portais, funcionalidades e serviços associados.
            </p>

            <div class="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
                <p><strong class="text-slate-800">Entidade:</strong> {{ config('legal.entity_name') }}</p>

                @if(config('legal.nif'))
                    <p><strong class="text-slate-800">NIF:</strong> {{ config('legal.nif') }}</p>
                @endif

                @if(config('legal.address'))
                    <p><strong class="text-slate-800">Morada:</strong> {{ config('legal.address') }}</p>
                @endif

                @if(config('legal.email'))
                    <p><strong class="text-slate-800">E-mail:</strong> {{ config('legal.email') }}</p>
                @endif
            </div>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">2. Utilizadores e contas</h2>
            <p class="mt-3">
                A utilização do FrotaPRO destina-se a empresas, profissionais e pessoas autorizadas por essas organizações.
                O utilizador é responsável pela exatidão dos dados fornecidos, pela confidencialidade das suas credenciais e pelas atividades realizadas através da sua conta.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">3. Utilização da plataforma</h2>
            <p class="mt-3">
                O cliente compromete-se a utilizar o FrotaPRO de forma lícita e exclusivamente para finalidades relacionadas com a sua atividade.
                É proibida a utilização destinada a comprometer a segurança da plataforma, obter acesso não autorizado, introduzir código malicioso, contornar limites técnicos ou utilizar dados de terceiros sem fundamento legítimo.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">4. Dados introduzidos pelo cliente</h2>
            <p class="mt-3">
                O cliente mantém a responsabilidade pelos dados e documentos introduzidos na plataforma e deve assegurar que dispõe de fundamento jurídico adequado para a respetiva recolha, utilização e conservação.
                O FrotaPRO trata os dados necessários à prestação do serviço de acordo com a Política de Privacidade e com as obrigações aplicáveis em matéria de proteção de dados.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">5. Planos, preços e faturação</h2>
            <p class="mt-3">
                Algumas funcionalidades podem depender do plano contratado. Os preços, períodos de faturação, limites e funcionalidades aplicáveis são os indicados no momento da contratação ou posteriormente acordados com o cliente.
            </p>
            <p class="mt-3">
                Os pagamentos podem ser processados por prestadores externos de serviços de pagamento. O FrotaPRO não necessita de armazenar os dados completos dos cartões ou outros instrumentos de pagamento quando estes são tratados diretamente pelo respetivo prestador.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">6. Renovação, cancelamento e incumprimento</h2>
            <p class="mt-3">
                Quando aplicável, os planos pagos podem renovar-se pelo período contratado até ao respetivo cancelamento.
                O incumprimento de obrigações de pagamento poderá originar limitação ou suspensão das funcionalidades, sem prejuízo das obrigações legais e contratuais aplicáveis.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">7. Disponibilidade e manutenção</h2>
            <p class="mt-3">
                O FrotaPRO procura assegurar disponibilidade e continuidade adequadas do serviço, podendo ocorrer interrupções decorrentes de manutenção, atualizações, falhas de fornecedores, comunicações, segurança ou outras circunstâncias técnicas.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">8. Propriedade intelectual</h2>
            <p class="mt-3">
                O software, design, identidade visual, documentação e demais componentes próprios do FrotaPRO encontram-se protegidos pelos direitos aplicáveis.
                A contratação do serviço concede apenas um direito de utilização nos termos do plano contratado, não implicando qualquer transferência de propriedade intelectual.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">9. Responsabilidade</h2>
            <p class="mt-3">
                O FrotaPRO constitui uma ferramenta de gestão e não substitui obrigações legais, contabilísticas, fiscais, laborais, regulatórias ou profissionais do cliente.
                O cliente mantém a responsabilidade pelas decisões tomadas com base na informação introduzida ou obtida através da plataforma.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">10. Proteção de dados</h2>
            <p class="mt-3">
                O tratamento de dados pessoais relacionado com a plataforma encontra-se descrito na
                <a href="{{ route('site.legal.privacy') }}" class="font-semibold text-indigo-600 hover:text-indigo-700">Política de Privacidade</a>.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">11. Alterações</h2>
            <p class="mt-3">
                Estes Termos podem ser atualizados para refletir alterações legais, técnicas, comerciais ou funcionais.
                Alterações relevantes serão comunicadas pelos meios adequados quando necessário.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">12. Lei aplicável</h2>
            <p class="mt-3">
                Estes Termos são regidos pela lei portuguesa, sem prejuízo das normas imperativas aplicáveis.
            </p>
        </section>

        <section>
            <h2 class="text-xl font-bold text-slate-900">13. Contacto</h2>
            <p class="mt-3">
                Questões relativas a estes Termos podem ser dirigidas
                @if(config('legal.email'))
                    para <a href="mailto:{{ config('legal.email') }}" class="font-semibold text-indigo-600">{{ config('legal.email') }}</a>.
                @else
                    através dos canais de contacto disponibilizados pelo FrotaPRO.
                @endif
            </p>
        </section>
    </div>
</main>

@include('site.partials.public-footer')
</div>
@endsection