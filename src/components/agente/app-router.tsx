"use client";

import { useAppStore } from "@/lib/store";
import { LandingPage } from "./pages/landing-page";
import { AuthPage } from "./pages/auth-page";
import { OnboardingPage } from "./pages/onboarding-page";
import { DashboardPage } from "./pages/dashboard-page";
import { TasksPage } from "./pages/tasks-page";
import { TaskExecutionPage } from "./pages/task-execution-page";
import { TaskResultPage } from "./pages/task-result-page";
import { HistoryPage } from "./pages/history-page";
import { ReportsPage } from "./pages/reports-page";
import { ToolsPage } from "./pages/tools-page";
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
      case "dashboard":
        return <DashboardPage />;
      case "tasks":
        return <TasksPage />;
      case "task-execution":
        return <TaskExecutionPage />;
      case "task-result":
        return <TaskResultPage />;
      case "history":
        return <HistoryPage />;
      case "reports":
        return <ReportsPage />;
      case "tools":
        return <ToolsPage />;
      case "settings":
        return <SettingsPage />;
      case "documentation":
        return <DocumentationPage />;
      case "not-found":
      default:
        return <NotFoundPage />;
    }
  };

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
