import axios, {
    AxiosError,
    InternalAxiosRequestConfig,
} from "axios";
import {
    appBaseUrl,
    appUrl,
} from "./runtime";

export const AUTH_EXPIRED_EVENT=
    "frotapro:auth-expired";

interface RetryableRequestConfig
    extends InternalAxiosRequestConfig {
    _csrfRetried?:boolean;
}

const api=axios.create({
    baseURL:appBaseUrl,
    withCredentials:true,
    withXSRFToken:true,
    headers:{
        Accept:"application/json",
        "X-Requested-With":"XMLHttpRequest",
    },
});

api.interceptors.response.use(
    response=>response,
    async(error:AxiosError)=>{
        const status=
            error.response?.status;

        const config=
            error.config as
                RetryableRequestConfig|
                undefined;

        if(
            status===419 &&
            config &&
            !config._csrfRetried
        ){
            config._csrfRetried=true;

            try{
                await axios.get(
                    appUrl(
                        "sanctum/csrf-cookie",
                    ),
                    {
                        withCredentials:true,
                        withXSRFToken:true,
                        headers:{
                            Accept:
                                "application/json",
                            "X-Requested-With":
                                "XMLHttpRequest",
                        },
                    },
                );

                return api.request(
                    config,
                );
            }catch{
                // Tratamento normal abaixo.
            }
        }

        if(status===401){
            window.dispatchEvent(
                new CustomEvent(
                    AUTH_EXPIRED_EVENT,
                ),
            );
        }

        return Promise.reject(
            error,
        );
    },
);

export default api;