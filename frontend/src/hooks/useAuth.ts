"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { api } from "@/lib/api";
import { User } from "@/types";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get("sentinel_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<User>("/auth/me");
        setUser(res.data);
      } catch {
        Cookies.remove("sentinel_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      });
      Cookies.set("sentinel_token", res.data.access_token, { expires: 1 });
      const userRes = await api.get<User>("/auth/me");
      setUser(userRes.data);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    Cookies.remove("sentinel_token");
    setUser(null);
    router.push("/login");
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

