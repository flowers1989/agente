"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store-app";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/agente/logo";
import {
  ArrowLeft,
  Search,
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
} from "lucide-react";
import { AI_MODELS, TOOLS, TOOL_CATEGORIES } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "intro",
    title: "Introducción",
    icon: BookOpen,
    description: "¿Qué es Agente y cómo funciona?",
    content: `Agente es una plataforma que ejecuta tareas complejas por ti. A diferencia de un chatbot tradicional, este agente puede navegar webs, ejecutar código, generar contenido y más.

Tres agentes especializados trabajan en conjunto, pero tú no necesitas saber cuál está actuando en cada momento:

1. El primero analiza tu objetivo y genera un plan paso a paso
2. El segundo ejecuta cada paso usando las herramientas apropiadas
3. El tercero valida los resultados y maneja errores

Solo necesitas describir qué quieres lograr. El agente se encarga del resto.`,
  },
  {
    id: "quickstart",
    title: "Inicio rápido",
    icon: Rocket,
    description: "Ejecuta tu primera tarea en minutos",
    content: `1. Crea tu cuenta gratis
2. Configura tu API key
3. Prueba la conexión
4. Elige tu modelo inicial
5. Crea tu primera tarea desde el chat
6. Observa la ejecución en tiempo real en el workspace
7. Descarga o repite la tarea cuando termine

¡Así de simple! El agente hará el resto automáticamente.`,
  },
  {
    id: "api-key",
    title: "API Key",
    icon: KeyRound,
    description: "Cómo obtener y configurar tu API key",
    content: `Necesitas una API key para que el agente funcione.

Límites del plan estándar ($10/mes):
- 5 horas: $12 de uso
- Semanal: $30 de uso
- Mensual: $60 de uso

Endpoints disponibles:
- Chat Completions: /v1/chat/completions
- Messages: /v1/messages
- Models List: /v1/models

Tu API key se encripta con AES-256 en tu navegador y nunca se envía a terceros.`,
  },
  {
    id: "models",
    title: "Modelos disponibles",
    icon: Cpu,
    description: `${AI_MODELS.length} modelos especializados`,
    content: `Tienes acceso a ${AI_MODELS.length} modelos IA. Cada uno tiene fortalezas diferentes:

- Modelos de razonamiento avanzado (GLM-5.2, DeepSeek V4 Pro): Para tareas complejas que requieren análisis profundo
- Especializados en coding (Kimi K2.7 Code, Qwen3.7 Max): Para generar y refactorizar código
- Económicos (MiMo-V2.5, MiniMax M3): Para tareas simples con bajo costo
- Balanceados (Kimi K2.6, MiniMax M2.7): Para uso general

Puedes cambiar de modelo en cualquier momento desde Configuración > API.`,
  },
  {
    id: "tools",
    title: "Herramientas",
    icon: Wrench,
    description: `${TOOLS.length} herramientas en ${TOOL_CATEGORIES.length} categorías`,
    content: `El agente selecciona automáticamente la herramienta correcta para cada paso del plan. Las categorías son:

- Navegación Web: Browser, Screenshot, PDF, Scraping
- Ejecución de Código: Python, Node.js, Bash, SQL, Docker
- Operaciones de Archivos: Read, Write, Compress, Hash
- Generación de Contenido: Imagen, Video, Audio, Documentos, Código
- Procesamiento de Medios: Imagen, Video, Audio
- Integración de APIs: HTTP, GraphQL, REST, Webhooks
- Base de Datos: SQL, MongoDB, Redis
- Sistema, Automatización, Análisis, Comunicación, y más

Puedes sugerir herramientas específicas al crear una tarea, o dejar que el agente elija.`,
  },
  {
    id: "agents",
    title: "Agentes especializados",
    icon: Brain,
    description: "3 agentes que trabajan invisiblemente",
    content: `El sistema está compuesto por 3 agentes que colaboran:

1. PLANIFICADOR
- Analiza tu objetivo
- Lo descompone en pasos ejecutables
- Identifica dependencias entre pasos
- Selecciona herramientas apropiadas
- Estima tiempo y recursos

2. EJECUTOR
- Obtiene contexto actual
- Ejecuta la herramienta de cada paso
- Valida el resultado
- Actualiza la memoria
- Emite logs en tiempo real
- Pasa al siguiente paso

3. VERIFICADOR
- Valida resultados de cada paso
- Si hay error: analiza y decide si reintentar
- Si hay éxito: continúa al siguiente paso
- Si hay error crítico: detiene la ejecución

Importante: tú no necesitas saber qué agente está actuando. Solo ves "Trabajando..." y los pasos que se completan.`,
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

EPISODIC MEMORY (permanente)
- Historial de tareas ejecutadas
- Resultados de pasos anteriores
- Errores y soluciones aplicadas

SEMANTIC MEMORY (permanente)
- Mejores prácticas descubiertas
- Relaciones entre conceptos
- Conocimiento general del dominio

Esta arquitectura permite que el agente aprenda y mejore con cada ejecución.`,
  },
  {
    id: "security",
    title: "Seguridad",
    icon: Shield,
    description: "Encriptación, auth y privacidad",
    content: `Tu seguridad es prioridad:

ENCRIPTACIÓN
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
    title: "Ejemplos",
    icon: Terminal,
    description: "Casos de uso reales",
    content: `Ejemplos de tareas que el agente puede ejecutar:

ANÁLISIS E INVESTIGACIÓN
- "Investiga los 5 principales competidores en el mercado de tools AI"
- "Extrae 1500 productos de una tienda e-commerce"
- "Analiza 50,000 tweets sobre mi marca"

DESARROLLO DE SOFTWARE
- "Refactoriza este proyecto PHP 5 legacy a TypeScript con NestJS"
- "Genera 10 artículos SEO de 1500 palabras"
- "Crea un dashboard de ventas Q1 desde este CSV"

AUTOMATIZACIÓN
- "Recopila noticias de IA y envía newsletter semanal"
- "Monitorea cambios en pricing de competidores"
- "Genera reportes mensuales automáticos de KPIs"

El límite es tu imaginación. Si la tarea puede descomponerse en pasos, el agente puede ejecutarla.`,
  },
];

export function DocumentationPage() {
  const navigate = useAppStore((s) => s.navigate);
  const [activeSection, setActiveSection] = useState("intro");
  const [search, setSearch] = useState("");

  const filteredSections = SECTIONS.filter(
    (s) =>
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  const currentSection = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("app")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-sm font-medium">Agente</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en docs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <nav className="space-y-0.5">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-all",
                  activeSection === section.id
                    ? "bg-muted border border-border"
                    : "hover:bg-muted/50 border border-transparent"
                )}
              >
                <section.icon
                  className={cn(
                    "size-3.5 mt-0.5 shrink-0",
                    activeSection === section.id ? "text-foreground" : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0">
                  <div className={cn("text-xs font-medium", activeSection === section.id && "text-foreground")}>
                    {section.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {section.description}
                  </div>
                </div>
                {activeSection === section.id && <ChevronRight className="size-3 ml-auto text-foreground shrink-0" />}
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
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <currentSection.icon className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{currentSection.title}</h1>
                <p className="text-xs text-muted-foreground">{currentSection.description}</p>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              {currentSection.content.split("\n\n").map((paragraph, i) => {
                const isHeader =
                  /^[A-ZÁÉÍÓÚÑ0-9]/.test(paragraph) &&
                  paragraph.length < 80 &&
                  paragraph.split(" ").length < 8 &&
                  /^[A-ZÁÉÍÓÚÑ0-9\s]+$/.test(paragraph);

                if (isHeader) {
                  return (
                    <h3 key={i} className="text-sm font-semibold mt-5 mb-2 first:mt-0">
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

            {/* Models showcase */}
            {currentSection.id === "models" && (
              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {AI_MODELS.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg border border-border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{m.name}</span>
                      {m.badge && <Badge variant="outline" className="text-[9px] py-0">{m.badge}</Badge>}
                    </div>
                    <div className="text-muted-foreground mb-1">{m.specialty}</div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span>${m.costInput}/M</span>
                      <span className="text-muted-foreground">{m.context}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tools showcase */}
            {currentSection.id === "tools" && (
              <div className="mt-6 space-y-4">
                {TOOL_CATEGORIES.map((cat) => {
                  const toolsInCat = TOOLS.filter((t) => t.category === cat);
                  if (toolsInCat.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                        <span>{cat}</span>
                        <Badge variant="outline" className="text-[9px]">{toolsInCat.length}</Badge>
                      </h4>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {toolsInCat.map((tool) => (
                          <div key={tool.id} className="p-2.5 rounded-lg border border-border text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[9px] text-muted-foreground">#{tool.id}</span>
                              <span className="font-semibold">{tool.name}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{tool.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </Card>
      </div>
    </div>
  );
}
