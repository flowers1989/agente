"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store-app";

export function ThemeInitializer() {
  const theme = useAppStore((s) => s.theme);
  const onboarded = useAppStore((s) => s.onboarded);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const user = useAppStore((s) => s.user);
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
    }
  }, [theme]);

  useEffect(() => {
    const isAuth = isAuthenticated || !!user || onboarded;
    if (isAuth && route === "landing") {
      navigate("app");
    }
  }, [isAuthenticated, user, onboarded, route, navigate]);
  return null;
}
