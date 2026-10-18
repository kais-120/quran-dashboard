import axios from "axios"

const baseURL = "http://localhost:5000/api/v1"
export const Axios = axios.create({baseURL})

export const AxiosToken = axios.create({
    baseURL,
});

AxiosToken.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("qa-auth");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Server origin (http://localhost:5000), used for /uploads/... files
const API_ORIGIN = new URL(baseURL).origin;

export const assetUrl = (p) =>
    !p ? '' : /^(https?:|data:|blob:)/.test(p) ? p : `${API_ORIGIN}${p}`;
