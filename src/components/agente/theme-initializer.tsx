"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function ThemeInitializer() {
  const theme = useAppStore((s) => s.theme);
  const onboarded = useAppStore((s) => s.onboarded);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const user = useAppStore((s) => s.user);
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);

  // Apply theme
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // On first mount, if the user is already onboarded/authenticated, send them to dashboard
  // instead of landing. Only do this once on initial mount when route is "landing".
  useEffect(() => {
    const isAuth = isAuthenticated || !!user || onboarded;
    if (isAuth && route === "landing") {
      navigate("dashboard");
    }
  }, []);

  return null;
}
