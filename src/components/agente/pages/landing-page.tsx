"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store-app";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/agente/logo";
import { ArrowRight, Moon, Sun, Check, Sparkles } from "lucide-react";
import { LANDING_STATS, LANDING_EXAMPLES } from "@/lib/mock-data";

const ICON_MAP: Record<string, typeof Sparkles> = {
  search: Search,
  code: Code,
  chart: ChartBar,
  zap: Zap,
  file: FileText,
  sparkles: Sparkles,
};

function Search(props: React.ComponentProps<typeof Sparkles>) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props as any}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>; }
function Code(props: React.ComponentProps<typeof Sparkles>) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props as any}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>; }
function ChartBar(props: React.ComponentProps<typeof Sparkles>) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props as any}><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>; }
function Zap(props: React.ComponentProps<typeof Sparkles>) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props as any}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>; }
function FileText(props: React.ComponentProps<typeof Sparkles>) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props as any}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>; }

export function LandingPage() {
  const navigate = useAppStore((s) => s.navigate);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-semibold tracking-tight text-sm">Agente</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="size-9">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("app")}>
                Abrir app
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("login")}>
                  Iniciar sesión
                </Button>
                <Button size="sm" onClick={() => navigate("register")}>
                  Registrarse
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero - estilo Manus */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex mb-8"
            >
              <LogoMark size={48} animated />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-4">
              ¿Qué puedo hacer por ti?
            </h1>

            <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
              Menos estructura, más inteligencia. Describe tu tarea y el agente se encarga del resto.
            </p>

            {/* Input gigante estilo Manus */}
            <div className="relative max-w-xl mx-auto">
              <button
                onClick={() => navigate(isAuthenticated ? "app" : "register")}
                className="w-full text-left px-4 py-4 rounded-xl border border-border bg-card hover:border-foreground/30 transition-colors group"
              >
                <span className="text-muted-foreground text-sm">
                  Pídele lo que necesites...
                </span>
                <div className="absolute right-2 bottom-2 size-8 rounded-lg bg-foreground text-background flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ArrowUp className="size-4" />
                </div>
              </button>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {[
                "Crea un sitio web",
                "Investiga un tema",
                "Analiza datos",
                "Automatiza algo",
                "Más",
              ].map((action) => (
                <button
                  key={action}
                  onClick={() => navigate(isAuthenticated ? "app" : "register")}
                  className="px-3 py-1.5 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mb-16">
            {LANDING_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-semibold tracking-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Examples */}
      <section className="border-t border-border/50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">Casos de uso</h2>
            <p className="text-muted-foreground">Algunas cosas que puedes pedirle</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LANDING_EXAMPLES.map((ex, i) => {
              const Icon = ICON_MAP[ex.icon] || Sparkles;
              return (
                <motion.div
                  key={ex.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors group cursor-pointer"
                  onClick={() => navigate(isAuthenticated ? "app" : "register")}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        {ex.category}
                      </div>
                      <h3 className="font-medium text-sm mb-1">{ex.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ex.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              Empieza en 30 segundos
            </h2>
            <p className="text-muted-foreground mb-8">Solo necesitas tu API key. Sin tarjeta de crédito.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              {["Sin instalación", "Sin código", "Sin configuración compleja"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="size-3.5 text-foreground" />
                  {item}
                </div>
              ))}
            </div>
            <Button size="lg" className="h-12 px-8" onClick={() => navigate("register")}>
              <Sparkles className="size-4" />
              Crear cuenta
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoMark size={16} />
            <span>Agente</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="hover:text-foreground transition-colors">Privacidad</button>
            <button className="hover:text-foreground transition-colors">Términos</button>
            <button className="hover:text-foreground transition-colors" onClick={() => navigate("settings")}>
              Configuración
            </button>
          </div>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}

function ArrowUp(props: React.ComponentProps<typeof Sparkles>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props as any}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}
