import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface Props {
    id: string;
    label?: string;
}

export default function ResourceId({
    id,
    label = "ID",
}: Props) {
    const [copied, setCopied] = useState(false);

    async function copyId(): Promise<void> {
        try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <span
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"
            title={id}
        >
            <span className="font-mono tabular-nums">
                {label}: {id.slice(0, 8)}…
            </span>

            <button
                type="button"
                onClick={() => void copyId()}
                aria-label={`Copiar ${label} completo`}
                title="Copiar identificador completo"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </button>
        </span>
    );
}