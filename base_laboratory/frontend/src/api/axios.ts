// src/api/axios.ts yoki axios.js
import axios from "axios";
import { BASE_URL, EMPLOYEE_SERVICE_URL } from "../utils/urls"; // Backend bazaviy URL manzili

const axioss = axios.create({
    baseURL: BASE_URL, // Barcha so'rovlar shu URL dan boshlanadi
    withCredentials: false, // Important for CORS requests
    headers: {
        'Accept': 'application/json',
    }
});

// Employee service uchun alohida axios instance
export const employeeServiceAxios = axios.create({
    baseURL: EMPLOYEE_SERVICE_URL,
    withCredentials: false,
    headers: {
        'Accept': 'application/json',
    }
});

// **Har bir so'rov oldidan tokenni qo'shish**
axioss.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem("token"); // Tokenni localStorage'dan olish
        if (token) {
            config.headers.Authorization = `Token ${token}`; // Headerga token qo'shish
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Employee service uchun token interceptor
employeeServiceAxios.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axioss.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            localStorage.clear();
            const currentPath = window.location.pathname;
            if (currentPath !== '/auth/signin') {
                window.location.replace('/auth/signin');
            }
        }
        return Promise.reject(error);
    }
);

export default axioss; // Instanceni eksport qilamiz
