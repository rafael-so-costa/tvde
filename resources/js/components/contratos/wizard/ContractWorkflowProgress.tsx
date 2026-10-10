import {
    Check,
} from "lucide-react";

interface Props {
    current: number;
    steps: string[];
}

export default function ContractWorkflowProgress({
    current,
    steps,
}: Props) {
    return (
        <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((step, index) => {
                const completed =
                    index < current;

                const active =
                    index === current;

                return (
                    <div
                        key={step}
                        className={[
                            "flex items-center gap-3 rounded-xl border px-3 py-3 transition",
                            active
                                ? "border-indigo-300 bg-indigo-50"
                                : completed
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-slate-200 bg-white",
                        ].join(" ")}
                    >
                        <div
                            className={[
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                active
                                    ? "bg-indigo-600 text-white"
                                    : completed
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                        >
                            {completed ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                index + 1
                            )}
                        </div>

                        <span
                            className={[
                                "text-sm font-medium",
                                active
                                    ? "text-indigo-900"
                                    : completed
                                      ? "text-emerald-800"
                                      : "text-slate-500",
                            ].join(" ")}
                        >
                            {step}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
