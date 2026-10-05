const ads=[
    ...document.querySelectorAll<HTMLElement>(
        "[data-public-ad]"
    ),
];

for(const ad of ads){
    observeAd(ad);
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
            window.clearTimeout(timer);
            timer=null;
        }
    };

    const observer=
        new IntersectionObserver(
            entries=>{
                const entry=entries[0];

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

                            void trackView(token)
                                .then(success=>{
                                    if(success){
                                        tracked=true;
                                        observer.disconnect();
                                    }
                                })
                                .finally(()=>{
                                    tracking=false;
                                });
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

    observer.observe(element);
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
                "/api/ads/view",
                {
                    method:"POST",

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

                    body:JSON.stringify({
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
