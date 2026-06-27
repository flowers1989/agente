"use client";

import { useAppStore } from "@/lib/store-app";
import { toast } from "sonner";

// Hook de autenticación
export function useAuth() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const register = useAppStore((s) => s.register);

  const handleLogin = async (email: string, name?: string) => {
    await new Promise((r) => setTimeout(r, 500));
    login(email, name || email.split("@")[0]);
    toast.success("Bienvenido");
  };

  const handleRegister = async (email: string, name: string, password: string) => {
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    await new Promise((r) => setTimeout(r, 600));
    register(email, name);
    toast.success("Cuenta creada");
    return true;
  };

  const handleLogout = () => {
    logout();
    toast.success("Sesión cerrada");
  };

  return {
    user,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}
