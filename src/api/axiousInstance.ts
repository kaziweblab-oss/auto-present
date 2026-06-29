import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
const axiosInstance = axios.create({
  baseURL: "https://sheets.googleapis.com/v4/spreadsheets",
  headers: {
    "Content-Type": "application/json",
  },
});

// ১. রিকোয়েস্ট ইন্টারসেপ্টর: প্রতিবার লেটেস্ট টোকেনটি হেডারে বসাবে
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ২. রেসপন্স ইন্টারসেপ্টর: ৪MDE (Unauthorized) এরর হ্যান্ডেল করবে
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 🔄 কাস্টম ইভেন্টের মাধ্যমে App.tsx থেকে নতুন টোকেন সংগ্রহ করা হচ্ছে
        const newToken = await new Promise<string>((resolve, reject) => {
          const event = new CustomEvent("google-token-expired", {
            detail: { resolve, reject },
          });
          window.dispatchEvent(event);
        });

        // নতুন টোকেনটি লোকাল স্টোরেজে সেভ করা হলো
        localStorage.setItem("token", newToken);

        // আটকে যাওয়া রিকোয়েস্টটিতে নতুন টোকেন বসিয়ে আবার রান করানো হচ্ছে
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // যদি ব্যাকগ্রাউন্ডেও নতুন টোকেন না পাওয়া যায়, তবে সেশন ক্লিয়ার করে লগইন পেজে রিডাইরেক্ট হবে
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(err);
  },
);

export default axiosInstance;
