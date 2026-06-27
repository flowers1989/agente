"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/agente/logo";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Github,
  Chrome,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface AuthPageProps {
  mode: "login" | "register";
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useAppStore((s) => s.navigate);
  const login = useAppStore((s) => s.login);
  const register = useAppStore((s) => s.register);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    if (isRegister) {
      register(email, name, password);
      toast.success("Cuenta creada exitosamente");
    } else {
      login(email, name);
      toast.success("Bienvenido de vuelta");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - form */}
      <div className="flex-1 flex flex-col px-6 md:px-12 py-8">
        {/* Top bar */}
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio
        </button>

        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <div className="flex items-center gap-2.5 mb-8 justify-center">
              <Logo size={40} animated />
              <div>
                <div className="font-bold text-lg">Agente IA</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5">OpenCode Go</div>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-1 text-center">
              {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {isRegister
                ? "Empieza a automatizar tareas en minutos"
                : "Inicia sesión para continuar"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Tu nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => toast.info("Te enviaremos un email de recuperación")}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="size-4 border-2 border-current border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    {isRegister ? "Crear cuenta" : "Iniciar sesión"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">o continúa con</span>
              </div>
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => toast.info("OAuth Google próximamente")}>
                <Chrome className="size-4" />
                Google
              </Button>
              <Button variant="outline" onClick={() => toast.info("OAuth GitHub próximamente")}>
                <Github className="size-4" />
                GitHub
              </Button>
            </div>

            {/* Switch */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
              <button
                onClick={() => navigate(isRegister ? "login" : "register")}
                className="text-primary font-medium hover:underline"
              >
                {isRegister ? "Inicia sesión" : "Regístrate gratis"}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-amber-500/10 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Powered by OpenCode Go</span>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-6">
              Automatiza cualquier tarea con IA autónoma
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              13 modelos especializados, 56 herramientas integradas y 3 agentes que trabajan por ti.
              Solo describe el objetivo.
            </p>

            <div className="space-y-3">
              {[
                "Ejecución autónoma paso a paso",
                "Logs en tiempo real tipo terminal",
                "Cambiar de modelo en caliente",
                "Historial completo y reportes",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4 text-primary" />
                  </div>
                  <span className="text-sm">{item}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-border/50 grid grid-cols-3 gap-6">
              {[
                { v: "13", l: "Modelos IA" },
                { v: "56", l: "Herramientas" },
                { v: "3", l: "Agentes" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-bold bg-gradient-to-br from-primary to-emerald-500 bg-clip-text text-transparent">
                    {s.v}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
