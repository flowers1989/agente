"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Rocket,
  KeyRound,
  Cpu,
  Wrench,
  Code2,
  Brain,
  Shield,
  Terminal,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { OPENCODE_MODELS, TOOLS } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "intro",
    title: "Introducción",
    icon: BookOpen,
    description: "¿Qué es Agente IA y cómo funciona?",
    content: `Agente IA Autónomo es una plataforma que ejecuta tareas complejas por ti. A diferencia de un chatbot tradicional, este agente puede navegar webs, ejecutar código, generar contenido y más.

Los 3 agentes especializados trabajan en conjunto:

1. Planificador: Analiza tu objetivo y genera un plan paso a paso
2. Ejecutor: Ejecuta cada paso usando las herramientas apropiadas
3. Verificador: Valida los resultados y maneja errores

Solo necesitas describir qué quieres lograr. El agente se encarga del resto.`,
  },
  {
    id: "quickstart",
    title: "Inicio rápido",
    icon: Rocket,
    description: "Ejecuta tu primera tarea en 5 minutos",
    content: `1. Crea tu cuenta gratis
2. Configura tu API key de OpenCode Go (cuesta $10/mes)
3. Prueba la conexión
4. Elige tu modelo inicial (recomendado: Kimi K2.7 Code)
5. Crea tu primera tarea desde el Dashboard
6. Observa la ejecución en tiempo real
7. Descarga o repite la tarea cuando termine

¡Así de simple! El agente hará el resto automáticamente.`,
  },
  {
    id: "api-key",
    title: "API Key de OpenCode Go",
    icon: KeyRound,
    description: "Cómo obtener y configurar tu API key",
    content: `OpenCode Go es el proveedor LLM unificado que da acceso a 13 modelos especializados en coding.

Límites del plan ($10/mes):
- 5 horas: $12 de uso
- Semanal: $30 de uso
- Mensual: $60 de uso

Endpoints disponibles:
- Chat Completions: https://opencode.ai/zen/go/v1/chat/completions
- Messages: https://opencode.ai/zen/go/v1/messages
- Models List: https://opencode.ai/zen/go/v1/models

Tu API key se encripta con AES-256 en tu navegador y nunca se envía a terceros.`,
  },
  {
    id: "models",
    title: "Modelos disponibles",
    icon: Cpu,
    description: `13 modelos especializados (${OPENCODE_MODELS.length} activos)`,
    content: `OpenCode Go te da acceso unificado a 13 modelos IA. Cada uno tiene fortalezas diferentes:

- Modelos de razonamiento avanzado (GLM-5.2, DeepSeek V4 Pro): Para tareas complejas que requieren análisis profundo
- Especializados en coding (Kimi K2.7 Code, Qwen3.7 Max): Para generar y refactorizar código
- Económicos (MiMo-V2.5, MiniMax M3): Para tareas simples con bajo costo
- Balanceados (Kimi K2.6, MiniMax M2.7): Para uso general

Puedes cambiar de modelo en cualquier momento desde Configuración > API.`,
  },
  {
    id: "tools",
    title: "Herramientas integradas",
    icon: Wrench,
    description: `${TOOLS.length} herramientas en 16 categorías`,
    content: `El agente selecciona automáticamente la herramienta correcta para cada paso del plan. Las categorías son:

- Navegación Web: Browser, Screenshot, PDF, Scraping
- Ejecución de Código: Python, Node.js, Bash, SQL, Docker
- Operaciones de Archivos: Read, Write, Compress, Hash
- Generación de Contenido: Imagen, Video, Audio, Documentos, Código
- Procesamiento de Medios: Imagen, Video, Audio
- Integración de APIs: HTTP, GraphQL, REST, Webhooks
- Base de Datos: SQL, MongoDB, Redis
- Sistema: Info, Env vars, Procesos
- Automatización: Scheduler, Workflows, Notifications
- Análisis y Visualización: Data Analysis, Charts, Reports
- Comunicación: Email, Chat (Slack, Discord, Telegram, WhatsApp)
- Autenticación, Búsqueda, Documentos, Git y más

Puedes sugerir herramientas específicas al crear una tarea, o dejar que el agente elija.`,
  },
  {
    id: "agents",
    title: "Agentes especializados",
    icon: Brain,
    description: "Planificador, Ejecutor y Verificador",
    content: `El sistema está compuesto por 3 agentes que colaboran:

1. PLANIFICADOR (PlannerAgent)
- Analiza tu objetivo
- Lo descompone en pasos ejecutables
- Identifica dependencias entre pasos
- Selecciona herramientas apropiadas
- Estima tiempo y recursos
- Genera un JSON estructurado con el plan

2. EJECUTOR (ExecutorAgent)
- Obtiene contexto actual
- Ejecuta la herramienta de cada paso
- Valida el resultado
- Actualiza la memoria
- Emite logs en tiempo real
- Pasa al siguiente paso

3. VERIFICADOR (VerifierAgent)
- Valida resultados de cada paso
- Si hay error: analiza y decide si reintentar
- Si hay éxito: continúa al siguiente paso
- Si hay error crítico: detiene la ejecución`,
  },
  {
    id: "memory",
    title: "Sistema de memoria",
    icon: Code2,
    description: "Working, Episodic y Semantic memory",
    content: `El agente usa 3 tipos de memoria:

WORKING MEMORY (volátil)
- Información actual de ejecución
- Variables locales del paso actual
- Duración: mientras se ejecuta la tarea

EPISODIC MEMORY (permanente en DB)
- Historial de tareas ejecutadas
- Resultados de pasos anteriores
- Errores y soluciones aplicadas
- Patrones aprendidos por experiencia

SEMANTIC MEMORY (permanente en DB)
- Mejores prácticas descubiertas
- Relaciones entre conceptos
- Conocimiento general del dominio
- Estrategias que funcionaron

Esta arquitectura permite que el agente aprenda y mejore con cada ejecución.`,
  },
  {
    id: "security",
    title: "Seguridad",
    icon: Shield,
    description: "Encriptación, auth y privacidad",
    content: `Tu seguridad es prioridad:

ENCRYPTACIÓN
- API key encriptada con AES-256 en el navegador
- Comunicación HTTPS en todas las requests
- JWT tokens para autenticación

AUTENTICACIÓN
- JWT + Refresh tokens
- 2FA opcional
- Session management con expiración

VALIDACIÓN
- Validación de entrada con Zod
- Sanitización de comandos
- Rate limiting en endpoints
- CORS configurado

PRIVACIDAD
- Tu data nunca se vende
- Tu API key nunca se envía a terceros
- Puedes exportar y eliminar tu data cuando quieras`,
  },
  {
    id: "examples",
    title: "Ejemplos de tareas",
    icon: Terminal,
    description: "Casos de uso reales",
    content: `Ejemplos de tareas que el agente puede ejecutar:

ANÁLISIS E INVESTIGACIÓN
- "Investiga los 5 principales competidores en el mercado de tools AI y genera un reporte comparativo"
- "Extrae 1500 productos de una tienda e-commerce y guarda en CSV"
- "Analiza 50,000 tweets sobre mi marca y genera dashboard de sentimientos"

DESARROLLO DE SOFTWARE
- "Refactoriza este proyecto PHP 5 legacy a TypeScript con NestJS, preservando comportamiento"
- "Genera 10 artículos SEO de 1500 palabras sobre tendencias IA 2026"
- "Crea un dashboard de ventas Q1 desde este CSV de 8000 filas"

AUTOMATIZACIÓN
- "Recopila noticias de IA de 10 fuentes RSS y envía newsletter semanal"
- "Monitorea cambios en pricing de 5 competidores cada hora"
- "Genera reportes mensuales automáticos de KPIs

El límite es tu imaginación. Si la tarea puede descomponerse en pasos, el agente puede ejecutarla.`,
  },
];

export function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("intro");
  const [search, setSearch] = useState("");

  const filteredSections = SECTIONS.filter((s) =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const currentSection = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <MainLayout title="Documentación" subtitle="Aprende a sacar el máximo provecho del agente">
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en docs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <nav className="space-y-1">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                  activeSection === section.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <section.icon className={cn(
                  "size-4 mt-0.5 shrink-0",
                  activeSection === section.id ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="min-w-0">
                  <div className={cn(
                    "text-sm font-medium",
                    activeSection === section.id && "text-primary"
                  )}>
                    {section.title}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {section.description}
                  </div>
                </div>
                {activeSection === section.id && (
                  <ChevronRight className="size-4 ml-auto text-primary shrink-0" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <Card className="p-6 lg:p-8">
          <motion.div
            key={currentSection.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <currentSection.icon className="size-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{currentSection.title}</h1>
                <p className="text-sm text-muted-foreground">{currentSection.description}</p>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              {currentSection.content.split("\n\n").map((paragraph, i) => {
                // Detect headers (lines that are ALL CAPS or start with number.)
                const isHeader = /^[A-ZÁÉÍÓÚÑ0-9]/.test(paragraph) &&
                  (paragraph.includes("\n") === false) &&
                  paragraph.length < 80 &&
                  paragraph.split(" ").length < 8 &&
                  /^[A-ZÁÉÍÓÚÑ0-9\s]+$/.test(paragraph);

                if (isHeader) {
                  return (
                    <h3 key={i} className="text-base font-semibold mt-5 mb-2 first:mt-0 text-primary">
                      {paragraph}
                    </h3>
                  );
                }
                return (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground mb-3 whitespace-pre-line">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Special content for models section */}
            {currentSection.id === "models" && (
              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {OPENCODE_MODELS.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg border border-border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{m.name}</span>
                      {m.badge && <Badge variant="outline" className="text-[9px] py-0">{m.badge}</Badge>}
                    </div>
                    <div className="text-muted-foreground mb-1">{m.specialty}</div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-primary">${m.costInput}/M</span>
                      <span className="text-muted-foreground">{m.context}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Special content for tools section */}
            {currentSection.id === "tools" && (
              <div className="mt-6 grid sm:grid-cols-2 gap-2">
                {TOOLS.slice(0, 12).map((tool) => (
                  <div key={tool.id} className="p-3 rounded-lg border border-border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{tool.name}</span>
                      <Badge variant="outline" className="text-[9px] py-0">{tool.category}</Badge>
                    </div>
                    <div className="text-muted-foreground">{tool.description}</div>
                  </div>
                ))}
                <div className="p-3 rounded-lg border border-dashed border-border text-xs text-center text-muted-foreground">
                  +{TOOLS.length - 12} herramientas más...
                </div>
              </div>
            )}
          </motion.div>
        </Card>
      </div>
    </MainLayout>
  );
}
