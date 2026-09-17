import { NavigateFunction } from "react-router-dom"



export function logout(navigate: NavigateFunction) {
    localStorage.clear()
    navigate("/auth/signin")
}

export function isAuthenticated() {
    const now = new Date();
    const expires_at = localStorage.getItem("expires_at");
    const token = localStorage.getItem("token");
    const isLogin = localStorage.getItem("isLogin");
    
    if (!expires_at || !token || isLogin !== 'true') return false; // Agar biri null bo‘lsa, false qaytariladi.
    if (token === 'undefined' || token === 'null') return false;
    
    const targetDate = new Date(expires_at);
    if (isNaN(targetDate.getTime())) return false; // Agar noto‘g‘ri sana bo‘lsa, false
    
    return now < targetDate;
}


// export function isAuthenticated() {
//     const now = new Date()
//     const expires_at = localStorage.getItem("expires_at")
//     const token = localStorage.getItem("token")


//     if (expires_at == null || token ==  null) return false
//     // if (token == null) return false

//     const targetDate = new Date(expires_at as string)
//     return localStorage.getItem("token") && now < targetDate
//     // return true
// }

export function checktToken() {
    // const clinicId = localStorage.getItem("clinicId")
    // return clinicId && parseInt(clinicId) != 0
    return true
}
