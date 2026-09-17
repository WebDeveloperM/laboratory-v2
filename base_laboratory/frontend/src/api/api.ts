import axios from "axios";
import { BASE_URL } from "../utils/urls";


export const login = async (username: string, password: string) => {
    const response = await axios.post(`${BASE_URL}/users/login/`, { username, password });
    return response.data;
};


export const getUserInfo = async (token: string) => {
    const response = await axios.get(`${BASE_URL}/users/user`, {
        headers: { Authorization: `Token ${token}` },
    });
    return response.data;
};
