import axios from "axios";
import {appBaseUrl} from "./runtime";

const api=axios.create({
    baseURL:appBaseUrl,
    withCredentials:true,
    withXSRFToken:true,
    headers:{
        Accept:"application/json",
        "X-Requested-With":"XMLHttpRequest",
    },
});

export default api;
