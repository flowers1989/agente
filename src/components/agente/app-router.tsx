"use client";

import { useAppStore } from "@/lib/store-app";
import { LandingPage } from "./pages/landing-page";
import { AuthPage } from "./pages/auth-page";
import { OnboardingPage } from "./pages/onboarding-page";
import { AppPage } from "./pages/app-page";
import { DashboardPage } from "./pages/dashboard-page";
import { HistoryPage } from "./pages/history-page";
import { ReportsPage } from "./pages/reports-page";
import { SettingsPage } from "./pages/settings-page";
import { DocumentationPage } from "./pages/documentation-page";
import { NotFoundPage } from "./pages/not-found-page";
import { AnimatePresence, motion } from "framer-motion";

export function AppRouter() {
  const route = useAppStore((s) => s.route);

  const renderPage = () => {
    switch (route) {
      case "landing":
        return <LandingPage />;
      case "login":
        return <AuthPage mode="login" />;
      case "register":
        return <AuthPage mode="register" />;
      case "onboarding":
        return <OnboardingPage />;
      case "app":
        return <AppPage />;
      case "dashboard":
        return <DashboardPage />;
      case "history":
        return <HistoryPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "documentation":
        return <DocumentationPage />;
      case "not-found":
      default:
        return <NotFoundPage />;
    }
  };

  // La app es full-screen sin transición
  if (route === "app") {
    return <AppPage />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}
