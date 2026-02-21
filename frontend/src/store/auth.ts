import { create } from "zustand";
import { authApi } from "@/lib/api";

interface User {
  id: number;
  display_name: string;
  email: string;
  role: "employee" | "manager" | "admin";
  continent?: string;
  country?: string;
  city?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchMe: async () => {
    try {
      const res = await authApi.me();
      set({ user: res.data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    await authApi.logout();
    set({ user: null });
    window.location.href = "/auth/login";
  },
}));
