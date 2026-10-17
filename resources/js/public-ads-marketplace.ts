type SearchSuggestion={
    type:string;
    label:string;
    meta:string;
    url:string;
};

const basePath=
    document
        .querySelector<HTMLMetaElement>(
            'meta[name="app-base-path"]'
        )
        ?.content.replace(/\/+$/,"")??"";

const ads=[
    ...document.querySelectorAll<HTMLElement>(
        "[data-public-ad]"
    ),
];

for(const ad of ads){
    observeAd(ad);
}

setupSearch();

function setupSearch():void{
    const input=
        document.querySelector<HTMLInputElement>(
            "[data-ad-search]"
        );

    const container=
        document.querySelector<HTMLElement>(
            "[data-ad-suggestions]"
        );

    const json=
        document.getElementById(
            "ad-search-suggestions"
        );

    if(
        !input||
        !container||
        !json
    ){
        return;
    }

    let suggestions:SearchSuggestion[]=[];

    try{
        suggestions=
            JSON.parse(
                json.textContent??"[]"
            ) as SearchSuggestion[];
    }catch{
        suggestions=[];
    }

    const close=()=>{
        container.classList.add(
            "hidden"
        );

        container.innerHTML="";
    };

    const render=()=>{
        const term=
            normalize(
                input.value
            );

        container.innerHTML="";

        if(
            term.length<2
        ){
            close();
            return;
        }

        const matches=
            suggestions
                .filter(
                    item=>
                        normalize(
                            item.label
                        ).includes(
                            term
                        )||
                        normalize(
                            item.meta
                        ).includes(
                            term
                        )
                )
                .slice(
                    0,
                    8
                );

        if(
            matches.length===0
        ){
            close();
            return;
        }

        for(
            const suggestion
            of matches
        ){
            const link=
                document.createElement(
                    "a"
                );

            link.href=
                suggestion.url;

            link.className=
                "flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-indigo-50";

            const text=
                document.createElement(
                    "div"
                );

            text.className=
                "min-w-0";

            const label=
                document.createElement(
                    "div"
                );

            label.className=
                "truncate text-sm font-semibold text-slate-900";

            label.textContent=
                suggestion.label;

            const meta=
                document.createElement(
                    "div"
                );

            meta.className=
                "mt-0.5 text-xs text-slate-400";

            meta.textContent=
                suggestion.meta;

            text.append(
                label,
                meta
            );

            const arrow=
                document.createElement(
                    "span"
                );

            arrow.className=
                "text-indigo-500";

            arrow.textContent=
                "→";

            link.append(
                text,
                arrow
            );

            container.appendChild(
                link
            );
        }

        container.classList.remove(
            "hidden"
        );
    };

    input.addEventListener(
        "input",
        render
    );

    input.addEventListener(
        "focus",
        render
    );

    input.addEventListener(
        "keydown",
        event=>{
            if(
                event.key==="Escape"
            ){
                close();
                input.blur();
            }
        }
    );

    document.addEventListener(
        "click",
        event=>{
            const target=
                event.target as Node;

            if(
                !container.contains(
                    target
                )&&
                target!==input
            ){
                close();
            }
        }
    );
}

function normalize(
    value:string
):string{
    return value
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}

function observeAd(
    element:HTMLElement
):void{
    const token=
        element.dataset.deliveryToken;

    if(!token){
        return;
    }

    let timer:number|null=null;
    let tracked=false;
    let tracking=false;

    const clearTimer=()=>{
        if(timer!==null){
            window.clearTimeout(
                timer
            );

            timer=null;
        }
    };

    const observer=
        new IntersectionObserver(
            entries=>{
                const entry=
                    entries[0];

                const visible=
                    entry.isIntersecting&&
                    entry.intersectionRatio>=0.5;

                if(!visible){
                    clearTimer();
                    return;
                }

                if(
                    tracked||
                    tracking||
                    timer!==null
                ){
                    return;
                }

                timer=
                    window.setTimeout(
                        ()=>{
                            timer=null;
                            tracking=true;

                            void trackView(
                                token
                            )
                                .then(
                                    success=>{
                                        if(
                                            success
                                        ){
                                            tracked=true;
                                            observer.disconnect();
                                        }
                                    }
                                )
                                .finally(
                                    ()=>{
                                        tracking=false;
                                    }
                                );
                        },
                        1000
                    );
            },
            {
                threshold:[
                    0,
                    0.5,
                    1,
                ],
            }
        );

    observer.observe(
        element
    );
}

async function trackView(
    deliveryToken:string
):Promise<boolean>{
    const csrf=
        document.querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]'
        )?.content;

    if(!csrf){
        return false;
    }

    try{
        const response=
            await fetch(
                `${basePath}/api/ads/view`,
                {
                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    headers:{
                        Accept:
                            "application/json",

                        "Content-Type":
                            "application/json",

                        "X-Requested-With":
                            "XMLHttpRequest",

                        "X-CSRF-TOKEN":
                            csrf,
                    },

                    body:
                        JSON.stringify({
                            delivery_token:
                                deliveryToken,
                        }),
                }
            );

        return response.ok;
    }catch{
        return false;
    }
}