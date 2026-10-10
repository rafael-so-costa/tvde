import axios from "axios";
import api from "./api";

export interface AuthenticatedFile {
    blob: Blob;
    url: string;
    filename: string | null;
}

function filenameFromDisposition(
    disposition?: string,
): string | null {
    if (!disposition) {
        return null;
    }

    const utfMatch =
        disposition.match(
            /filename\*=UTF-8''([^;]+)/i,
        );

    if (utfMatch?.[1]) {
        try {
            return decodeURIComponent(
                utfMatch[1],
            );
        } catch {
            return utfMatch[1];
        }
    }

    const normalMatch =
        disposition.match(
            /filename="?([^";]+)"?/i,
        );

    return normalMatch?.[1] ?? null;
}

async function normalizeError(
    error: unknown,
): Promise<never> {
    if (
        axios.isAxiosError(error)
    ) {
        const data =
            error.response?.data;

        if (data instanceof Blob) {
            try {
                const text =
                    await data.text();

                const parsed =
                    JSON.parse(text);

                if (
                    typeof parsed?.message ===
                    "string"
                ) {
                    throw new Error(
                        parsed.message,
                    );
                }
            } catch (
                parseError
            ) {
                if (
                    parseError instanceof
                        Error &&
                    parseError.message !==
                        "Unexpected end of JSON input"
                ) {
                    throw parseError;
                }
            }
        }

        if (
            typeof data?.message ===
            "string"
        ) {
            throw new Error(
                data.message,
            );
        }
    }

    if (error instanceof Error) {
        throw error;
    }

    throw new Error(
        "Não foi possível carregar o arquivo.",
    );
}

export async function fetchAuthenticatedFile(
    path: string,
): Promise<AuthenticatedFile> {
    try {
        const response =
            await api.get(
                path,
                {
                    responseType:
                        "blob",
                },
            );

        const blob =
            response.data as Blob;

        return {
            blob,
            url:
                URL.createObjectURL(
                    blob,
                ),
            filename:
                filenameFromDisposition(
                    response.headers[
                        "content-disposition"
                    ],
                ),
        };
    } catch (error) {
        return normalizeError(
            error,
        );
    }
}

export async function openAuthenticatedFile(
    path: string,
): Promise<void> {
    const popup =
        window.open(
            "",
            "_blank",
        );

    if (!popup) {
        throw new Error(
            "O navegador bloqueou a abertura do arquivo. Autorize pop-ups para o FrotaPro.",
        );
    }

    popup.opener = null;

    try {
        popup.document.title =
            "A carregar...";

        popup.document.body.innerHTML =
            '<div style="font-family:sans-serif;padding:24px">A carregar arquivo...</div>';

        const file =
            await fetchAuthenticatedFile(
                path,
            );

        popup.location.replace(
            file.url,
        );

        window.setTimeout(
            () =>
                URL.revokeObjectURL(
                    file.url,
                ),
            300000,
        );
    } catch (error) {
        popup.close();
        throw error;
    }
}

export async function downloadAuthenticatedFile(
    path: string,
    fallbackFilename =
        "arquivo",
): Promise<void> {
    const file =
        await fetchAuthenticatedFile(
            path,
        );

    const link =
        document.createElement(
            "a",
        );

    link.href =
        file.url;

    link.download =
        file.filename ||
        fallbackFilename;

    document.body.appendChild(
        link,
    );

    link.click();
    link.remove();

    window.setTimeout(
        () =>
            URL.revokeObjectURL(
                file.url,
            ),
        1000,
    );
}
