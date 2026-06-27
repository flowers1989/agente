import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeInitializer } from "@/components/agente/theme-initializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agente IA Autónomo · OpenCode Go",
  description: "Agente de IA autónomo configurable con OpenCode Go. 13 modelos, 56 herramientas, ejecución paso a paso.",
  keywords: ["IA", "Agente", "OpenCode Go", "Autónomo", "Coding", "Manus AI"],
  authors: [{ name: "Agente IA" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeInitializer />
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
