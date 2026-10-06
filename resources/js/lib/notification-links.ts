export function resolveNotificationUrl(
    url:string|null|undefined,
    pathname:string,
    fallback:string
):string{
    if(!url){
        return fallback;
    }

    if(
        url.startsWith("/ajuda")
    ){
        if(
            pathname.startsWith(
                "/portal/motorista"
            )
        ){
            return `/portal/motorista${url}`;
        }

        if(
            pathname.startsWith(
                "/portal/proprietario"
            )
        ){
            return `/portal/proprietario${url}`;
        }
    }

    if(
        url==="/alertas"
    ){
        if(
            pathname.startsWith(
                "/portal/motorista"
            )
        ){
            return "/portal/motorista/alertas";
        }

        if(
            pathname.startsWith(
                "/portal/proprietario"
            )
        ){
            return "/portal/proprietario/alertas";
        }
    }

    return url;
}
