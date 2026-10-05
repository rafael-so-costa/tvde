import {
    BadgeEuro,
    BookOpen,
    CalendarDays,
    Image as ImageIcon,
    Link2,
    Megaphone,
    MousePointerClick,
    Target,
    UsersRound,
} from "lucide-react";

const formats = [
    {
        name: "Card nativo",
        usage:
            "Dashboards, portais e listagens. Integra-se visualmente com o conteúdo da página.",
        desktop: "1200 × 675 px",
        mobile: "1080 × 1080 px",
        ratio: "16:9 desktop / 1:1 mobile",
    },
    {
        name: "Banner",
        usage:
            "Áreas horizontais no topo, entre blocos ou no final de páginas.",
        desktop: "1200 × 300 px",
        mobile: "1080 × 540 px",
        ratio: "4:1 desktop / 2:1 mobile",
    },
    {
        name: "Oferta",
        usage:
            "Promoções, descontos, serviços, campanhas comerciais e chamadas mais destacadas.",
        desktop: "1200 × 675 px",
        mobile: "1080 × 1080 px",
        ratio: "16:9 desktop / 1:1 mobile",
    },
    {
        name: "Patrocínio",
        usage:
            "Parceiros estratégicos, campanhas institucionais e ações de branding.",
        desktop: "1200 × 675 px",
        mobile: "1080 × 1080 px",
        ratio: "16:9 desktop / 1:1 mobile",
    },
];

export default function AdCampaignHelpGuide() {
    return (
        <section
            id="guia-preenchimento"
            className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white"
        >
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                        <BookOpen className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            Guia de preenchimento da campanha
                        </h2>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                            Consulte estas orientações sempre que tiver dúvidas
                            sobre um campo, formato, destino, público ou criativo.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3 sm:p-8">
                <GuideCard
                    icon={Megaphone}
                    title="Nome interno e título"
                    text="O nome interno serve para organizar a campanha no backoffice e não é mostrado ao público. O título é a mensagem principal que poderá ser apresentada no anúncio."
                />

                <GuideCard
                    icon={Target}
                    title="Anunciante e categoria"
                    text="Selecione quem está a promover o anúncio e a categoria mais próxima do serviço. A categoria será importante para filtros, segmentação contextual e marketplace público."
                />

                <GuideCard
                    icon={UsersRound}
                    title="Públicos, canais e zonas"
                    text="O público define quem pode receber a campanha. O canal identifica a área da plataforma e a zona determina a posição específica onde o anúncio poderá ser exibido."
                />

                <GuideCard
                    icon={CalendarDays}
                    title="Período da campanha"
                    text="Defina a data e hora de início e fim. Campanhas aprovadas e pagas ficam agendadas quando a data inicial ainda não chegou e terminam automaticamente no fim do período."
                />

                <GuideCard
                    icon={BadgeEuro}
                    title="Preço e pagamento"
                    text="Campanhas FrotaPro e comunicações internas podem ter valor zero. Campanhas comerciais pagas só ficam elegíveis depois da aprovação e confirmação do pagamento."
                />

                <GuideCard
                    icon={ImageIcon}
                    title="Criativos"
                    text="Uma campanha pode ter mais de um criativo. Cada criativo pode ter imagem, vídeo, título, texto, CTA e destino próprios, permitindo posteriormente rotação e testes A/B."
                />

                <GuideCard
                    icon={Link2}
                    title="Destino do anúncio"
                    text="O destino pode ser website, WhatsApp, telefone ou nenhum. Para WhatsApp, informe o número com indicativo internacional; o FrotaPro gera automaticamente a URL correta."
                />

                <GuideCard
                    icon={MousePointerClick}
                    title="CTA"
                    text="É o texto do botão ou ligação do anúncio, como Saber mais, Pedir orçamento, Contactar, Marcar, Ver oferta ou Enviar WhatsApp."
                />

                <GuideCard
                    icon={MousePointerClick}
                    title="Métricas"
                    text="Impressões indicam entregas; visualizações válidas representam anúncios realmente visíveis; alcance representa utilizadores únicos; CTR corresponde a cliques divididos pelas impressões."
                />
            </div>

            <div className="border-t border-slate-200 px-6 py-7 sm:px-8">
                <h3 className="text-base font-bold text-slate-900">
                    Dimensões recomendadas dos criativos
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    O FrotaPro adapta a apresentação à zona disponível, mas
                    estas dimensões fornecem melhor qualidade e consistência.
                </p>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Formato
                                </th>

                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Utilização
                                </th>

                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Desktop
                                </th>

                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Mobile
                                </th>

                                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Proporção
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {formats.map((format) => (
                                <tr key={format.name}>
                                    <td className="px-5 py-4 font-semibold text-slate-900">
                                        {format.name}
                                    </td>

                                    <td className="max-w-md px-5 py-4 text-sm leading-6 text-slate-600">
                                        {format.usage}
                                    </td>

                                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                                        {format.desktop}
                                    </td>

                                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                                        {format.mobile}
                                    </td>

                                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                                        {format.ratio}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

function GuideCard({
    icon: Icon,
    title,
    text,
}: {
    icon: typeof BookOpen;
    title: string;
    text: string;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                <Icon className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
                {text}
            </p>
        </article>
    );
}
