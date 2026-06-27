"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/agente/logo";
import {
  Sparkles,
  Zap,
  Shield,
  Bot,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Wrench,
  Code2,
  Database,
  Globe,
  Terminal,
  Workflow,
  Star,
  Play,
  Moon,
  Sun,
} from "lucide-react";
import { OPENCODE_MODELS } from "@/lib/mock-data";
import { useState } from "react";

const FEATURES = [
  {
    icon: Bot,
    title: "Totalmente Autónomo",
    description: "3 agentes especializados (Planificador, Ejecutor, Verificador) que descomponen, ejecutan y validan tus tareas complejas sin intervención humana.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Zap,
    title: "13 Modelos IA",
    description: "Acceso a los modelos de coding más avanzados del mercado vía OpenCode Go: GLM-5.2, Kimi K2.7 Code, DeepSeek V4 Pro, Qwen3.7 Max y más.",
    color: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Wrench,
    title: "56 Herramientas",
    description: "Catálogo completo de herramientas integradas: navegación web, ejecución de código, scraping, generación de contenido, bases de datos y más.",
    color: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: Shield,
    title: "Seguro y Privado",
    description: "Encriptación de extremo a extremo de tu API key, JWT auth, rate limiting y validación de entrada. Tu data nunca sale de tu control.",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
];

const FLOW_STEPS = [
  { icon: Sparkles, title: "1. Define tu objetivo", description: "Describe qué quieres lograr en lenguaje natural. Añade restricciones y selecciona herramientas opcionales." },
  { icon: Cpu, title: "2. Planificación IA", description: "El Agente Planificador analiza tu objetivo y genera un plan paso a paso con herramientas y dependencias." },
  { icon: Workflow, title: "3. Ejecución autónoma", description: "El Agente Ejecutor corre cada paso en paralelo cuando es posible, validando resultados en tiempo real." },
  { icon: CheckCircle2, title: "4. Verificación y entrega", description: "El Agente Verificador valida el resultado final. Descarga, comparte o repite la ejecución con un clic." },
];

const TOOL_PREVIEW = [
  { icon: Globe, name: "Navegación Web" },
  { icon: Terminal, name: "Ejecución de Código" },
  { icon: Code2, name: "Generación de Contenido" },
  { icon: Database, name: "Base de Datos" },
  { icon: Wrench, name: "Operaciones de Archivos" },
  { icon: Workflow, name: "Automatización" },
];

export function LandingPage() {
  const navigate = useAppStore((s) => s.navigate);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const [showAllModels, setShowAllModels] = useState(false);

  const visibleModels = showAllModels ? OPENCODE_MODELS : OPENCODE_MODELS.slice(0, 6);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 border-b border-border/50 bg-background/70 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} animated />
            <div>
              <div className="font-bold tracking-tight">Agente IA</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5">OpenCode Go</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="size-9">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" onClick={() => navigate("documentation")} className="hidden sm:flex">
              Documentación
            </Button>
            {isAuthenticated ? (
              <Button onClick={() => navigate("dashboard")}>
                Ir al Dashboard
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("login")} className="hidden sm:flex">
                  Iniciar sesión
                </Button>
                <Button onClick={() => navigate("register")}>
                  Comenzar
                  <ArrowRight className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 md:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <Badge variant="outline" className="mb-6 py-1.5 px-3 backdrop-blur-md bg-background/50">
            <Sparkles className="size-3 mr-1.5 text-primary" />
            Powered by OpenCode Go · 13 modelos especializados
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            El agente de IA
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-amber-500 bg-clip-text text-transparent gradient-animated">
              que ejecuta por ti
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Define un objetivo en lenguaje natural. Nuestros 3 agentes especializados lo descomponen,
            ejecutan con 56 herramientas integradas y entregan resultados verificables.
            Como Manus AI, pero con tu propia API key.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("register")}>
              <Sparkles className="size-4" />
              Crear cuenta gratis
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => navigate("documentation")}>
              <Play className="size-4" />
              Ver demo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              13 modelos IA
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              56 herramientas integradas
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Open source friendly
            </span>
          </div>
        </motion.div>

        {/* Hero preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-amber-500/20 blur-3xl opacity-50" />
            <Card className="relative overflow-hidden glass border-border/50">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-400/60" />
                  <div className="size-3 rounded-full bg-amber-400/60" />
                  <div className="size-3 rounded-full bg-emerald-400/60" />
                </div>
                <div className="flex-1 text-center text-xs text-muted-foreground font-mono">
                  agente-ia.app/dashboard
                </div>
              </div>
              <div className="p-4 md:p-6 grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Plan de ejecución</div>
                  {["Analizar objetivo", "Buscar datos", "Generar código", "Verificar"].map((s, i) => (
                    <div key={s} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                      <div className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 2 ? "bg-emerald-500/20 text-emerald-500" : i === 2 ? "bg-primary/20 text-primary pulse-glow" : "bg-muted text-muted-foreground"}`}>
                        {i < 2 ? "✓" : i + 1}
                      </div>
                      <span className="text-xs">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Logs en vivo</div>
                  {[
                    { t: "10:42:01", m: "▶ Iniciando paso 3: Generar código", c: "text-primary" },
                    { t: "10:42:03", m: "Analizando requerimientos...", c: "text-blue-500" },
                    { t: "10:42:05", m: "Generando código con kimi-k2.7-code...", c: "text-blue-500" },
                    { t: "10:42:08", m: "Aplicando patrones de diseño...", c: "text-blue-500" },
                    { t: "10:42:11", m: "Código generado: 247 LOC", c: "text-emerald-500" },
                  ].map((l, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className="flex items-start gap-2 p-1.5 rounded font-mono text-[11px]"
                    >
                      <span className="text-muted-foreground">{l.t}</span>
                      <span className={l.c}>{l.m}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "13", label: "Modelos IA" },
            { value: "56", label: "Herramientas" },
            { value: "3", label: "Agentes especializados" },
            { value: "$10/mes", label: "Costo OpenCode Go" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-emerald-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Diferenciadores clave
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No es un chatbot. Es un agente autónomo real con capacidad de ejecución.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg hover:border-primary/30 transition-all group">
                <div className={`size-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="size-6 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 bg-muted/20 border-y border-border/50 py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-3">Flujo de trabajo</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              De objetivo a resultado en 4 pasos
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {FLOW_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                {i < FLOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] right-[-30%] h-0.5 border-t-2 border-dashed border-border" />
                )}
                <div className="relative">
                  <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 relative z-10">
                    <step.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Models showcase */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-3">Modelos disponibles</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              13 modelos especializados en coding
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              OpenCode Go te da acceso unificado a los mejores modelos de IA para desarrollo.
              Cambia entre ellos con un clic según tu necesidad de costo, velocidad o calidad.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "Modelos de razonamiento avanzado (GLM-5.2, DeepSeek V4 Pro)",
                "Especializados en coding (Kimi K2.7 Code, Qwen3.7 Max)",
                "Económicos para tareas simples (MiMo-V2.5, MiniMax M3)",
                "Contexto de hasta 1M de tokens",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" onClick={() => setShowAllModels(!showAllModels)}>
              {showAllModels ? "Ver menos" : `Ver los 13 modelos`}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-3"
          >
            {visibleModels.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-3 hover:border-primary/30 transition-all h-full">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="font-semibold text-sm">{m.name}</div>
                    {m.badge && (
                      <Badge variant="outline" className="text-[9px] py-0 h-4">
                        {m.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight mb-2">{m.specialty}</div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-primary">${m.costInput}/M</span>
                    <span className="text-muted-foreground">{m.context}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tools showcase */}
      <section className="relative z-10 bg-muted/20 border-y border-border/50 py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-3">Herramientas integradas</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              56 herramientas listas para usar
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              El agente selecciona automáticamente la herramienta correcta para cada paso del plan.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
            {TOOL_PREVIEW.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4 text-center hover:border-primary/30 hover:shadow-md transition-all group">
                  <t.icon className="size-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-medium">{t.name}</div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => navigate(isAuthenticated ? "tools" : "register")}>
              Ver las 56 herramientas
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Diseñado para desarrolladores
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              quote: "Automatizamos el scraping de 1500 productos en 2 horas. Antes tardábamos 3 días.",
              author: "María González",
              role: "CTO, TiendaOnline",
            },
            {
              quote: "El flujo planificador-ejecutor-verificador es brillante. Detecta y reintenta errores solo.",
              author: "Carlos Ruiz",
              role: "Lead Dev, Fintech",
            },
            {
              quote: "Tener 13 modelos en una sola API y poder cambiar en caliente es un game-changer.",
              author: "Ana Torres",
              role: "AI Engineer, StartupX",
            },
          ].map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 h-full">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {t.author[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.author}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="relative overflow-hidden p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-amber-500/10" />
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                ¿Listo para automatizar?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Crea tu cuenta gratis, conecta tu API key de OpenCode Go y ejecuta tu primera tarea en menos de 5 minutos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("register")}>
                  <Sparkles className="size-4" />
                  Comenzar gratis
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => navigate("documentation")}>
                  Leer la documentación
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm font-medium">Agente IA</span>
            <span className="text-xs text-muted-foreground">· OpenCode Go</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <button className="hover:text-foreground transition-colors" onClick={() => navigate("documentation")}>
              Documentación
            </button>
            <button className="hover:text-foreground transition-colors">Privacidad</button>
            <button className="hover:text-foreground transition-colors">Términos</button>
            <span>© 2026 Agente IA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
