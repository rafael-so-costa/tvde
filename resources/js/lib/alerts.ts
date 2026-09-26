import api from "./api";

import type {
    AlertFilters,
    AlertListResponse,
    AlertSummary,
    NotificationPreferenceResponse,
    SaveEmailPreferencePayload,
} from "../types/alerts";

export const alertKeys = {
    root: ["alerts"] as const,

    summary: (
        tenantId?: string | null,
    ) => [
        "alerts",
        "summary",
        tenantId ?? null,
    ] as const,

    list: (
        tenantId: string | null | undefined,
        filters: AlertFilters,
    ) => [
        "alerts",
        "list",
        tenantId ?? null,
        filters,
    ] as const,

    preferences: (
        tenantId?: string | null,
    ) => [
        "alerts",
        "preferences",
        tenantId ?? null,
    ] as const,
};

export async function fetchAlertSummary(): Promise<AlertSummary> {
    const response = await api.get(
        "/api/alertas/resumo",
    );

    return response.data.data as AlertSummary;
}

export async function fetchAlerts(
    filters: AlertFilters,
): Promise<AlertListResponse> {
    const params = new URLSearchParams();

    if (filters.status) {
        params.set(
            "status",
            filters.status,
        );
    }

    if (filters.severity) {
        params.set(
            "severity",
            filters.severity,
        );
    }

    if (filters.category) {
        params.set(
            "category",
            filters.category,
        );
    }

    if (filters.unread !== undefined &&
        filters.unread !== "") {
        params.set(
            "unread",
            filters.unread,
        );
    }

    if (
        filters.acknowledged !== undefined &&
        filters.acknowledged !== ""
    ) {
        params.set(
            "acknowledged",
            filters.acknowledged,
        );
    }

    if (filters.include_snoozed) {
        params.set(
            "include_snoozed",
            "1",
        );
    }

    if (filters.search?.trim()) {
        params.set(
            "search",
            filters.search.trim(),
        );
    }

    params.set(
        "page",
        String(filters.page ?? 1),
    );

    params.set(
        "per_page",
        String(filters.per_page ?? 30),
    );

    const response = await api.get(
        `/api/alertas?${params.toString()}`,
    );

    return response.data as AlertListResponse;
}

export async function markAlertRead(
    id: string,
): Promise<void> {
    await api.post(
        `/api/alertas/${id}/lido`,
    );
}

export async function markAllAlertsRead(): Promise<void> {
    await api.post(
        "/api/alertas/marcar-todos-lidos",
    );
}

export async function acknowledgeAlert(
    id: string,
): Promise<void> {
    await api.post(
        `/api/alertas/${id}/reconhecer`,
    );
}

export async function snoozeAlert(
    id: string,
    until: string,
): Promise<void> {
    await api.post(
        `/api/alertas/${id}/adiar`,
        {
            snoozed_until: until,
        },
    );
}

export async function resolveAlert(
    id: string,
): Promise<void> {
    await api.post(
        `/api/alertas/${id}/resolver`,
        {
            note:
                "Resolvido manualmente na interface.",
        },
    );
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferenceResponse> {
    const response = await api.get(
        "/api/alertas/preferencias",
    );

    return response.data as NotificationPreferenceResponse;
}

export async function saveEmailPreference(
    payload: SaveEmailPreferencePayload,
): Promise<void> {
    await api.put(
        "/api/alertas/preferencias/email",
        payload,
    );
}

export async function deleteEmailPreference(
    category: string,
): Promise<void> {
    await api.delete(
        "/api/alertas/preferencias/email",
        {
            data: {
                category,
            },
        },
    );
}
