import axios from "axios";
import {
    LoaderCircle,
    Save,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";
import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";

import type {
    BackofficeCrmAssigneeListResponse,
    BackofficeCrmLeadDetail,
    BackofficeCrmLeadMutationResponse,
    BackofficeCrmTagListResponse,
} from "../types/backofficeCrmCommercial";

interface Props {
    lead: BackofficeCrmLeadDetail;
    onSaved: () => Promise<void>;
}

export default function CrmLeadEditPanel({
    lead,
    onSaved,
}: Props) {
    const [
        companyName,
        setCompanyName,
    ] = useState("");

    const [
        contactName,
        setContactName,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        phone,
        setPhone,
    ] = useState("");

    const [
        website,
        setWebsite,
    ] = useState("");

    const [
        district,
        setDistrict,
    ] = useState("");

    const [
        municipality,
        setMunicipality,
    ] = useState("");

    const [
        priority,
        setPriority,
    ] = useState<
        BackofficeCrmLeadDetail["priority"]
    >("normal");

    const [
        assignedTo,
        setAssignedTo,
    ] = useState("");

    const [
        nextFollowUp,
        setNextFollowUp,
    ] = useState("");

    const [
        notes,
        setNotes,
    ] = useState("");

    const [
        tagIds,
        setTagIds,
    ] = useState<string[]>(
        [],
    );

    const tagsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "tags",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/tags",
                    );

                return response
                    .data as BackofficeCrmTagListResponse;
            },
        });

    const assigneesQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "assignees",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/assignees",
                    );

                return response
                    .data as BackofficeCrmAssigneeListResponse;
            },
        });

    useEffect(() => {
        setCompanyName(
            lead.company_name,
        );

        setContactName(
            lead.contact_name ??
                "",
        );

        setEmail(
            lead.email ??
                "",
        );

        setPhone(
            lead.phone ??
                "",
        );

        setWebsite(
            lead.website ??
                "",
        );

        setDistrict(
            lead.district ??
                "",
        );

        setMunicipality(
            lead.municipality ??
                "",
        );

        setPriority(
            lead.priority,
        );

        setAssignedTo(
            lead.assigned_to
                ?.id ?? "",
        );

        setNextFollowUp(
            toDateTimeLocal(
                lead.next_follow_up_at,
            ),
        );

        setNotes(
            lead.notes ??
                "",
        );

        setTagIds(
            lead.tags.map(
                (tag) =>
                    tag.id,
            ),
        );
    }, [
        lead,
    ]);

    const mutation =
        useMutation({
            mutationFn:
                async () => {
                    const response =
                        await api.patch(
                            `/api/backoffice/crm/leads/${lead.id}`,
                            {
                                company_name:
                                    companyName.trim(),

                                contact_name:
                                    nullable(
                                        contactName,
                                    ),

                                email:
                                    nullable(
                                        email,
                                    ),

                                phone:
                                    nullable(
                                        phone,
                                    ),

                                website:
                                    nullable(
                                        website,
                                    ),

                                district:
                                    nullable(
                                        district,
                                    ),

                                municipality:
                                    nullable(
                                        municipality,
                                    ),

                                priority,

                                assigned_to_user_id:
                                    assignedTo ||
                                    null,

                                next_follow_up_at:
                                    nextFollowUp ||
                                    null,

                                notes:
                                    nullable(
                                        notes,
                                    ),

                                tag_ids:
                                    tagIds,
                            },
                        );

                    return response
                        .data as BackofficeCrmLeadMutationResponse;
                },

            onSuccess:
                async () => {
                    await onSaved();
                },
        });

    const tags =
        tagsQuery.data
            ?.data.filter(
                (tag) =>
                    tag.is_active !==
                        false ||
                    tagIds.includes(
                        tag.id,
                    ),
            ) ?? [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div>
                <h2 className="font-semibold text-slate-900">
                    Editar dados comerciais
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Contactos, responsável, prioridade, tags e próximo acompanhamento.
                </p>
            </div>

            <form
                onSubmit={(
                    event,
                ) => {
                    event.preventDefault();

                    mutation.mutate();
                }}
                className="mt-5 space-y-5"
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <Field
                        label="Empresa"
                        value={
                            companyName
                        }
                        onChange={
                            setCompanyName
                        }
                    />

                    <Field
                        label="Contacto"
                        value={
                            contactName
                        }
                        onChange={
                            setContactName
                        }
                    />

                    <Field
                        label="Email"
                        type="email"
                        value={
                            email
                        }
                        onChange={
                            setEmail
                        }
                    />

                    <Field
                        label="Telefone"
                        value={
                            phone
                        }
                        onChange={
                            setPhone
                        }
                    />

                    <Field
                        label="Website"
                        value={
                            website
                        }
                        onChange={
                            setWebsite
                        }
                    />

                    <div>
                        <label className={labelClass}>
                            Prioridade
                        </label>

                        <select
                            value={
                                priority
                            }
                            onChange={(
                                event,
                            ) =>
                                setPriority(
                                    event
                                        .target
                                        .value as BackofficeCrmLeadDetail["priority"],
                                )
                            }
                            className={inputClass}
                        >
                            <option value="low">
                                Baixa
                            </option>

                            <option value="normal">
                                Normal
                            </option>

                            <option value="high">
                                Alta
                            </option>

                            <option value="urgent">
                                Urgente
                            </option>
                        </select>
                    </div>

                    <Field
                        label="Distrito"
                        value={
                            district
                        }
                        onChange={
                            setDistrict
                        }
                    />

                    <Field
                        label="Concelho"
                        value={
                            municipality
                        }
                        onChange={
                            setMunicipality
                        }
                    />

                    <div>
                        <label className={labelClass}>
                            Responsável
                        </label>

                        <select
                            value={
                                assignedTo
                            }
                            onChange={(
                                event,
                            ) =>
                                setAssignedTo(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">
                                Sem responsável
                            </option>

                            {assigneesQuery.data?.data.map(
                                (
                                    user,
                                ) => (
                                    <option
                                        key={
                                            user.id
                                        }
                                        value={
                                            user.id
                                        }
                                    >
                                        {
                                            user.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>
                            Próximo follow-up
                        </label>

                        <input
                            type="datetime-local"
                            value={
                                nextFollowUp
                            }
                            onChange={(
                                event,
                            ) =>
                                setNextFollowUp(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className={inputClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>
                        Tags
                    </label>

                    <select
                        multiple
                        value={
                            tagIds
                        }
                        onChange={(
                            event,
                        ) =>
                            setTagIds(
                                Array.from(
                                    event
                                        .currentTarget
                                        .selectedOptions,
                                    (
                                        option,
                                    ) =>
                                        option.value,
                                ),
                            )
                        }
                        className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                        {tags.map(
                            (
                                tag,
                            ) => (
                                <option
                                    key={
                                        tag.id
                                    }
                                    value={
                                        tag.id
                                    }
                                >
                                    {
                                        tag.name
                                    }
                                </option>
                            ),
                        )}
                    </select>

                    <div className="mt-1 text-xs text-slate-400">
                        Ctrl/Cmd + clique para selecionar várias tags.
                    </div>
                </div>

                <div>
                    <label className={labelClass}>
                        Notas
                    </label>

                    <textarea
                        value={
                            notes
                        }
                        onChange={(
                            event,
                        ) =>
                            setNotes(
                                event
                                    .target
                                    .value,
                            )
                        }
                        className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={
                        mutation.isPending ||
                        !companyName.trim()
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {mutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}

                    Guardar alterações
                </button>

                {mutation.isSuccess && (
                    <div className="text-sm font-medium text-emerald-600">
                        Lead atualizado com sucesso.
                    </div>
                )}

                {mutation.isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage(
                            mutation.error,
                        )}
                    </div>
                )}
            </form>
        </section>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (
        value: string,
    ) => void;
    type?: string;
}) {
    return (
        <div>
            <label className={labelClass}>
                {label}
            </label>

            <input
                type={
                    type
                }
                value={
                    value
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                className={inputClass}
            />
        </div>
    );
}

function nullable(
    value: string,
): string | null {
    const cleaned =
        value.trim();

    return cleaned !== ""
        ? cleaned
        : null;
}

function toDateTimeLocal(
    value: string | null,
): string {
    if (!value) {
        return "";
    }

    const date =
        new Date(
            value,
        );

    const offset =
        date.getTimezoneOffset();

    return new Date(
        date.getTime() -
            offset *
                60_000,
    )
        .toISOString()
        .slice(
            0,
            16,
        );
}

function errorMessage(
    error: unknown,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const message =
            error.response?.data
                ?.message;

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }

        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const first =
                Object.values(
                    errors,
                )[0];

            if (
                Array.isArray(
                    first,
                )
            ) {
                return String(
                    first[0],
                );
            }
        }
    }

    return "Não foi possível atualizar o lead.";
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";
