import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  withCredentials: true,  // cookies (JWT)
  headers: { "Content-Type": "application/json" },
});

// Авто-обновление access token через refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        return api(error.config);
      } catch {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (email: string) => api.post("/auth/otp/send", { email }),
  verifyOtp: (email: string, code: string) => api.post("/auth/otp/verify", { email, code }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// ─── KPI ──────────────────────────────────────────────────────────────────────
export const kpiApi = {
  getDashboard: (date?: string) => api.get("/kpi/dashboard", { params: { user_date: date } }),
  getHistory: (indicator_id: number, days?: number) =>
    api.get("/kpi/history", { params: { indicator_id, days } }),
  adjust: (data: { user_id: number; indicator_id: number; date: string; value: number }) =>
    api.post("/kpi/adjust", data),
};

// ─── Links ────────────────────────────────────────────────────────────────────
export const linksApi = {
  getLinks: () => api.get("/links/"),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  listUsers: () => api.get("/admin/users"),
  setUserRole: (userId: number, role: string) =>
    api.patch(`/admin/users/${userId}/role`, null, { params: { role } }),
  setDelegation: (userId: number, data: object) =>
    api.patch(`/admin/users/${userId}/delegation`, data),
  listRoles: () => api.get("/admin/roles"),
  createRole: (data: object) => api.post("/admin/roles", data),
  listIndicators: () => api.get("/admin/indicators"),
  createIndicator: (data: object) => api.post("/admin/indicators", data),
  createSection: (data: object) => api.post("/admin/sections", data),
  createLink: (data: object) => api.post("/admin/links", data),
};
