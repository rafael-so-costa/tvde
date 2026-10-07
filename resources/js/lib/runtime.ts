declare global {
    interface Window {
        __FROTAPRO__?: {
            basePath?: string;
        };
    }
}

function normalizeBasePath(value?: string | null): string {
    const path=(value ?? "").trim();

    if(!path || path==="/"){
        return "";
    }

    return `/${path.replace(/^\/+|\/+$/g,"")}`;
}

export const appBasePath=normalizeBasePath(
    window.__FROTAPRO__?.basePath,
);

export const appBaseUrl=appBasePath
    ? `${appBasePath}/`
    : "/";

export function appUrl(path=""): string {
    const clean=path.replace(/^\/+/,"");

    if(!clean){
        return appBaseUrl;
    }

    return `${appBaseUrl}${clean}`;
}
