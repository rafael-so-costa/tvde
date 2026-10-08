type AnalyticsPayload = {
    evento: string;
    page_url?: string;
    content_post_id?: string;
    active_seconds?: number;
    scroll_percent?: number;
    screen_width?: number;
    screen_height?: number;
    language?: string;
    metadados?: Record<string, unknown>;
};

const basePath =
    document
        .querySelector<HTMLMetaElement>(
            'meta[name="app-base-path"]',
        )
        ?.content.replace(/\/+$/, "") ?? "";

const csrfToken =
    document
        .querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]',
        )
        ?.content ?? "";

let startedAt = Date.now();
let activeStartedAt = Date.now();
let activeMs = 0;
let maxScroll = 0;
let readSent = false;

const contentId =
    document.body.dataset.analyticsContentId ||
    undefined;

function endpoint() {
    return `${basePath}/api/analytics/event`;
}

function activeSeconds() {
    const current =
        document.visibilityState === "visible"
            ? Date.now() - activeStartedAt
            : 0;

    return Math.floor(
        (activeMs + current) / 1000,
    );
}

async function track(
    payload: AnalyticsPayload,
) {
    try {
        await fetch(endpoint(), {
            method: "POST",
            credentials: "same-origin",
            keepalive: true,

            headers: {
                "Content-Type":
                    "application/json",

                Accept:
                    "application/json",

                ...(csrfToken
                    ? {
                          "X-CSRF-TOKEN":
                              csrfToken,
                      }
                    : {}),
            },

            body: JSON.stringify({
                ...payload,

                page_url:
                    window.location.href,

                content_post_id:
                    payload.content_post_id ??
                    contentId,

                screen_width:
                    window.screen.width,

                screen_height:
                    window.screen.height,

                language:
                    navigator.language,
            }),
        });
    } catch {
        //
    }
}

function updateScroll() {
    const total =
        document.documentElement
            .scrollHeight -
        window.innerHeight;

    if (total <= 0) {
        maxScroll = 100;
        return;
    }

    maxScroll = Math.max(
        maxScroll,
        Math.min(
            100,
            Math.round(
                (window.scrollY / total) *
                    100,
            ),
        ),
    );

    if (
        contentId &&
        maxScroll >= 90 &&
        activeSeconds() >= 30 &&
        !readSent
    ) {
        readSent = true;

        void track({
            evento: "article_read",
            scroll_percent: maxScroll,
            active_seconds:
                activeSeconds(),
        });
    }
}

document.addEventListener(
    "visibilitychange",
    () => {
        if (
            document.visibilityState ===
            "hidden"
        ) {
            activeMs +=
                Date.now() -
                activeStartedAt;
        } else {
            activeStartedAt =
                Date.now();
        }
    },
);

window.addEventListener(
    "scroll",
    updateScroll,
    {
        passive: true,
    },
);

window.addEventListener(
    "pagehide",
    () => {
        void track({
            evento: "page_exit",

            scroll_percent:
                maxScroll,

            active_seconds:
                activeSeconds(),

            metadados: {
                elapsed_seconds:
                    Math.floor(
                        (
                            Date.now() -
                            startedAt
                        ) / 1000,
                    ),
            },
        });
    },
);

void track({
    evento: "page_view",
});

if (contentId) {
    void track({
        evento: "article_view",
        content_post_id:
            contentId,
    });
}
