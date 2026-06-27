"use client";

import { Sidebar, MobileNav } from "./sidebar";
import { Header } from "./header";
import { motion } from "framer-motion";

interface MainLayoutProps {
  title?: string;
  subtitle?: string;
  showNewTask?: boolean;
  children: React.ReactNode;
}

export function MainLayout({ title, subtitle, showNewTask, children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} showNewTask={showNewTask} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
