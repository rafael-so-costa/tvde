declare global {
    interface Window {
        __FROTAPRO__?: {
            basePath?: string;
        };
    }
}

function normalizeBasePath(
    value?:string|null,
):string{
    const path=
        (
            value ??
            ""
        ).trim();

    if(
        !path ||
        path==="/"
    ){
        return "";
    }

    return `/${path.replace(
        /^\/+|\/+$/g,
        "",
    )}`;
}

function detectBasePath():string{
    const configured=
        normalizeBasePath(
            window
                .__FROTAPRO__
                ?.basePath,
        );

    if(configured){
        return configured;
    }

    const pathname=
        window
            .location
            .pathname;

    /*
     * Produção atual do FrotaPRO:
     * /sistemas/frotapro
     *
     * Esta deteção funciona como fallback caso
     * WEB_BASE_PATH/config cache não seja injetado
     * corretamente no HTML.
     */
    const productionMarker=
        "/sistemas/frotapro";

    if(
        pathname===
            productionMarker ||
        pathname.startsWith(
            `${productionMarker}/`,
        )
    ){
        return productionMarker;
    }

    return "";
}

export const appBasePath=
    detectBasePath();

export const appBaseUrl=
    appBasePath
        ?`${appBasePath}/`
        :"/";

export function appUrl(
    path="",
):string{
    const clean=
        path.replace(
            /^\/+/,
            "",
        );

    if(!clean){
        return appBaseUrl;
    }

    return `${appBaseUrl}${clean}`;
}