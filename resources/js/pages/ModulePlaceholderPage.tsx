interface Props {
    title: string;
    description: string;
}

export default function ModulePlaceholderPage({
    title,
    description,
}: Props) {
    return (
        <div className="max-w-7xl mx-auto">
            <p className="text-sm font-medium text-indigo-600 mb-2">
                FrotaPRO
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {title}
            </h1>

            <p className="mt-2 text-slate-500">
                {description}
            </p>

            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="font-medium text-slate-800">
                    Interface em preparação
                </p>

                <p className="mt-2 text-sm text-slate-500">
                    O backend desta área será
                    conectado nesta tela.
                </p>
            </div>
        </div>
    );
}
