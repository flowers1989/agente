// ==================== AGENT LOOP REAL ====================
// Loop autónomo: pensar → actuar → observar → evaluar → repetir
//
// A diferencia del AgentLoop anterior (que estaba muerto), este:
// 1. Se conecta al orquestador y reemplaza el for lineal
// 2. Usa function-calling real del LLM (no keyword matching)
// 3. Ejecuta herramientas reales en el sandbox
// 4. Observa el output real y lo alimenta al LLM
// 5. Re-planea si algo falla
// 6. Termina cuando el objetivo se cumple o se acaba el budget

import { getAdapter } from "./opencode-adapter";
import { toolRegistry } from "./tool-registry";
import { useMemoryStore } from "../memory/memory-store";
import type { ToolExecutionResult } from "./tool-registry";
import type { ChatMessage as LLMChatMessage } from "./opencode-adapter";

export interface AgentLoopOptions {
  conversationId: string;
  userId: string;
  objective: string;
  maxIterations?: number;
  mode?: "economy" | "quality";
  onIteration?: (iteration: LoopIteration) => void;
  onToolStart?: (toolName: string, params: Record<string, unknown>) => void;
  onToolEnd?: (toolName: string, result: ToolExecutionResult) => void;
  onThought?: (thought: string) => void;
  onError?: (error: string) => void;
}

export interface LoopIteration {
  iterationNumber: number;
  thought: string;
  toolName: string | null;
  toolParams: Record<string, unknown>;
  observation: string;
  evaluation: {
    isComplete: boolean;
    isSuccessful: boolean;
    nextAction: string;
    confidence: number;
  };
  duration: number;
  error?: string;
}

export interface AgentLoopResult {
  success: boolean;
  iterations: LoopIteration[];
  finalOutput: string;
  totalDuration: number;
  toolsUsed: string[];
  errorMessage?: string;
}

const DEFAULT_MAX_ITERATIONS = 15;

// ==================== TOOLS DISPONIBLES PARA EL LLM ====================
// El LLM elige entre estas herramientas vía function-calling.
// Cada tool tiene un schema JSON que el LLM debe respetar.

interface ToolDef {
  name: string;
  description: string;
  // Schema de parámetros que el LLM debe devolver
  paramsSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

const AGENT_TOOLS: ToolDef[] = [
  {
    name: "Bash/Shell Execution",
    description:
      "Ejecuta un comando bash en el sandbox Docker. Útil para: crear archivos, instalar dependencias (npm install, pip install), correr scripts, levantar servidores (npm run dev), ver contenido de archivos (cat, ls). El output real (stdout/stderr) se devuelve al agente.",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "El comando bash a ejecutar. Ej: 'npm install', 'echo hola > file.txt', 'npm run dev &', 'ls -la'",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "Python Execution",
    description:
      "Ejecuta código Python en el sandbox. Útil para: análisis de datos, cálculos, scripts, generar archivos. Requiere que el sandbox esté activo.",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "El código Python a ejecutar",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "Node.js Execution",
    description:
      "Ejecuta código Node.js en el sandbox. Útil para: scripts JS, manipular JSON, Express servers, etc.",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "El código Node.js a ejecutar",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "File Write",
    description:
      "Escribe contenido a un archivo en el sandbox. Útil para: crear código fuente, configuraciones, HTML, etc. El path debe ser absoluto (/workspace/...).",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "El contenido del archivo (string completo)",
        },
        path: {
          type: "string",
          description: "Ruta absoluta del archivo. Ej: '/workspace/src/App.tsx', '/workspace/index.html'",
        },
      },
      required: ["path", "code"],
    },
  },
  {
    name: "File Read",
    description:
      "Lee el contenido de un archivo del sandbox. Útil para: verificar lo que se escribió, leer logs, etc.",
    paramsSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Ruta absoluta del archivo a leer",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "Web Search",
    description:
      "Busca en internet (DuckDuckGo). Útil para: investigar temas, encontrar documentación, obtener información actualizada.",
    paramsSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "La consulta de búsqueda",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "Web Extraction",
    description:
      "Extrae el contenido de una URL. Útil para: leer documentación, scrapear páginas, obtener datos de APIs.",
    paramsSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "La URL a extraer",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "Code Generation",
    description:
      "Genera código usando el LLM especializado. Útil para: generar funciones, componentes, scripts complejos. Devuelve el código generado.",
    paramsSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Descripción detallada del código a generar",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "HTTP Client",
    description:
      "Hace una petición HTTP a una URL. Útil para: llamar APIs, descargar archivos, testear endpoints.",
    paramsSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "La URL a la que hacer la petición",
        },
        method: {
          type: "string",
          description: "Método HTTP",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        },
      },
      required: ["url"],
    },
  },
];

// ==================== PROMPT DEL SISTEMA ====================

const SYSTEM_PROMPT = `Eres un agente IA autónomo tipo Manus IA. Tu objetivo es completar la tarea del usuario ejecutando herramientas reales en un sandbox Docker.

## REGLA #1 — PROHIBIDO devolver código en el chat
NUNCA devuelvas bloques de código en el campo "thought". El código va en archivos del sandbox usando File Write. Si devuelves código en el thought, estás fallando.

## REGLA #2 — PROHIBIDO usar el puerto 3000
El puerto 3000 ya está ocupado por la app principal. Para servir cualquier proyecto web, usa SIEMPRE el puerto 3001 o superior (3001, 3002, 3003, 4000, 8080, etc.).

## REGLA #3 — Estructura obligatoria para proyectos web
Cuando el usuario pida un sitio web, dashboard, app, landing, etc. DEBES seguir este flujo exacto:

### Paso 1: Crear la estructura del proyecto
Usa File Write para crear CADA archivo por separado. Ejemplo de estructura para Next.js:
- /workspace/package.json
- /workspace/next.config.ts
- /workspace/tsconfig.json
- /workspace/src/app/layout.tsx
- /workspace/src/app/page.tsx
- /workspace/src/app/globals.css
- /workspace/tailwind.config.ts
- /workspace/postcss.config.mjs

### Paso 2: Instalar dependencias
Usa Bash/Shell Execution con: cd /workspace && npm install
Espera el output. Si hay errores, arréglalos.

### Paso 3: Levantar el servidor de desarrollo
Usa Bash/Shell Execution con: cd /workspace && PORT=3001 npm run dev &
Esto levanta el servidor en background en el puerto 3001.

### Paso 4: Verificar que el servidor está corriendo
Usa Bash/Shell Execution con: curl -s http://localhost:3001 | head -20
Verifica que responde HTML.

### Paso 5: Devolver la URL al usuario
Cuando el servidor esté corriendo, devuelve:
{"isComplete": true, "tool": null, "thought": "Proyecto creado y sirviéndose en http://localhost:3001"}

## Tu ciclo de trabajo
En CADA iteración devuelves un JSON con esta estructura EXACTA:
{"thought": "razonamiento breve", "tool": "nombre de la herramienta", "params": {...}, "isComplete": false}

## Herramientas disponibles
${AGENT_TOOLS.map(
  (t) => `
### ${t.name}
${t.description}
Parámetros: ${JSON.stringify(t.paramsSchema)}`
).join("\n")}

## Ejemplo de flujo para "crea un dashboard con Next.js":

Iteración 1:
{"thought":"Voy a crear el package.json del proyecto Next.js en el sandbox","tool":"File Write","params":{"path":"/workspace/package.json","code":"{\\"name\\":\\"dashboard\\",\\"scripts\\":{\\"dev\\":\\"next dev\\"},\\"dependencies\\":{\\"next\\":\\"^16.0.0\\",\\"react\\":\\"^19.0.0\\",\\"react-dom\\":\\"^19.0.0\\"}}"},"isComplete":false}

Iteración 2:
{"thought":"Voy a crear el layout.tsx","tool":"File Write","params":{"path":"/workspace/src/app/layout.tsx","code":"export default function RootLayout({children}){return <html><body>{children}</body></html>}"},"isComplete":false}

Iteración 3:
{"thought":"Voy a crear el page.tsx con el dashboard","tool":"File Write","params":{"path":"/workspace/src/app/page.tsx","code":"export default function Home(){return <div>Dashboard</div>}"},"isComplete":false}

Iteración 4:
{"thought":"Voy a instalar dependencias","tool":"Bash/Shell Execution","params":{"code":"cd /workspace && npm install"},"isComplete":false}

Iteración 5:
{"thought":"Voy a levantar el servidor en el puerto 3001","tool":"Bash/Shell Execution","params":{"code":"cd /workspace && PORT=3001 npm run dev &"},"isComplete":false}

Iteración 6:
{"thought":"Voy a verificar que el servidor responde","tool":"Bash/Shell Execution","params":{"code":"sleep 3 && curl -s http://localhost:3001 | head -20"},"isComplete":false}

Iteración 7:
{"thought":"Dashboard creado y sirviéndose en http://localhost:3001","tool":null,"params":{},"isComplete":true}

## Reglas adicionales
1. UNA herramienta por iteración.
2. OBSERVA el output de cada herramienta antes del siguiente paso.
3. Si hay errores, arréglalos en la siguiente iteración.
4. NUNCA pongas código en "thought". El código va en "params.code" de File Write.
5. Devuelve SOLO el JSON, sin markdown, sin texto extra.`;

// ==================== LOOP PRINCIPAL ====================

export async function executeAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const {
    conversationId,
    userId,
    objective,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    mode = "economy",
    onIteration,
    onToolStart,
    onToolEnd,
    onThought,
    onError,
  } = options;

  const adapter = getAdapter();
  const iterations: LoopIteration[] = [];
  const toolsUsed: string[] = [];
  const startTime = Date.now();

  // Historial de mensajes para mantener contexto del loop
  const messages: LLMChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `OBJETIVO: ${objective}\n\nComienza. Devuelve el JSON de tu primera iteración.`,
    },
  ];

  // Guardar objetivo en working memory
  useMemoryStore.getState().store("working", `objective:${conversationId}`, objective, {
    conversationId,
    tags: ["objective", conversationId],
  });

  let finalOutput = "";
  let errorMessage = "";

  for (let i = 1; i <= maxIterations; i++) {
    const iterStartTime = Date.now();

    // ===== FASE 1: PENSAR (LLM decide qué hacer) =====
    let llmResponse: string;
    try {
      const response = await adapter.chat(messages, {
        model: mode === "quality" ? "kimi-k2.7-code" : "deepseek-v4-flash",
        temperature: 0.3,
        maxTokens: 2048,
      });
      llmResponse = response.content;
    } catch (err) {
      errorMessage = `Error llamando al LLM en iteración ${i}: ${err instanceof Error ? err.message : String(err)}`;
      onError?.(errorMessage);
      break;
    }

    // Parsear la respuesta del LLM
    const parsed = parseLLMResponse(llmResponse);

    if (!parsed) {
      // Si no se puede parsear, pedir al LLM que reformule
      messages.push({ role: "assistant", content: llmResponse });
      messages.push({
        role: "user",
        content:
          "Tu respuesta no es un JSON válido. Devuelve SOLO un JSON con la estructura: {thought, tool, params, isComplete}. Sin markdown, sin texto extra.",
      });
      continue;
    }

    onThought?.(parsed.thought);

    // ===== CHECK: ¿terminó? =====
    if (parsed.isComplete || !parsed.tool) {
      const iteration: LoopIteration = {
        iterationNumber: i,
        thought: parsed.thought,
        toolName: null,
        toolParams: {},
        observation: "",
        evaluation: {
          isComplete: true,
          isSuccessful: true,
          nextAction: "done",
          confidence: parsed.confidence || 0.9,
        },
        duration: Date.now() - iterStartTime,
      };
      iterations.push(iteration);
      onIteration?.(iteration);
      finalOutput = parsed.thought;
      break;
    }

    // ===== FASE 2: ACTUAR (ejecutar la herramienta) =====
    onToolStart?.(parsed.tool, parsed.params);

    const toolResult = await executeToolSafely(parsed.tool, parsed.params, {
      conversationId,
      userId,
    });

    onToolEnd?.(parsed.tool, toolResult);
    toolsUsed.push(parsed.tool);

    // ===== FASE 3: OBSERVAR (construir observación para el LLM) =====
    let observation: string;
    if (toolResult.success) {
      const resultText = toolResult.result || "";
      const outputText = toolResult.output?.content || "";
      observation = `Herramienta '${parsed.tool}' ejecutada exitosamente.\nOutput: ${resultText.slice(0, 2000)}\n${outputText ? `Contenido:\n${outputText.slice(0, 3000)}` : ""}`;
    } else {
      observation = `Herramienta '${parsed.tool}' FALLÓ.\nError: ${toolResult.error}\n\nDebes decidir: ¿reintentar con otros parámetros, usar otra herramienta, o ajustar el enfoque?`;
    }

    // ===== FASE 4: EVALUAR (el LLM lo hará en la siguiente iteración) =====
    const iteration: LoopIteration = {
      iterationNumber: i,
      thought: parsed.thought,
      toolName: parsed.tool,
      toolParams: parsed.params,
      observation: observation.slice(0, 4000),
      evaluation: {
        isComplete: false,
        isSuccessful: toolResult.success,
        nextAction: "continue",
        confidence: 0,
      },
      duration: Date.now() - iterStartTime,
      error: toolResult.error,
    };
    iterations.push(iteration);
    onIteration?.(iteration);

    // Alimentar la observación al LLM para la siguiente iteración
    messages.push({ role: "assistant", content: llmResponse });
    messages.push({
      role: "user",
      content: `OBSERVACIÓN de la iteración ${i}:\n${observation}\n\nDevuelve el JSON de tu próxima iteración. Recuerda: una sola herramienta por iteración. Si ya completaste el objetivo, devuelve isComplete=true.`,
    });

    // Guardar en memoria de trabajo para contexto futuro
    useMemoryStore.getState().store(
      "working",
      `iteration:${conversationId}:${i}`,
      JSON.stringify({ thought: parsed.thought, tool: parsed.tool, observation: observation.slice(0, 1000) }),
      { conversationId, tags: ["iteration", conversationId] }
    );
  }

  // Si terminó por maxIterations sin isComplete
  if (iterations.length > 0 && !iterations[iterations.length - 1].evaluation.isComplete) {
    errorMessage = `Se alcanzó el máximo de ${maxIterations} iteraciones sin completar el objetivo.`;
    onError?.(errorMessage);
  }

  // Si no hay finalOutput, generar uno del último thought
  if (!finalOutput && iterations.length > 0) {
    finalOutput = iterations[iterations.length - 1].thought;
  }

  // Aprender de la conversación
  useMemoryStore.getState().learnFromConversation(
    conversationId,
    `${objective.slice(0, 100)} → ${iterations.length} iteraciones, tools: ${toolsUsed.join(", ")}`,
    [`loop-pattern: ${toolsUsed.join(" → ")}`],
    iterations.some((it) => it.evaluation.isSuccessful)
  );

  return {
    success: errorMessage === "",
    iterations,
    finalOutput,
    totalDuration: Date.now() - startTime,
    toolsUsed,
    errorMessage,
  };
}

// ==================== PARSER DE RESPUESTA LLM ====================

interface ParsedLLMResponse {
  thought: string;
  tool: string | null;
  params: Record<string, unknown>;
  isComplete: boolean;
  confidence?: number;
}

function parseLLMResponse(response: string): ParsedLLMResponse | null {
  // Intentar extraer JSON de la respuesta
  // El LLM puede devolverlo con markdown ```json ... ``` o plano

  // Intento 1: JSON directo
  try {
    const parsed = JSON.parse(response);
    return normalizeParsed(parsed);
  } catch {}

  // Intento 2: extraer de ```json ... ```
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return normalizeParsed(parsed);
    } catch {}
  }

  // Intento 3: buscar el primer { y el último }
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(response.slice(firstBrace, lastBrace + 1));
      return normalizeParsed(parsed);
    } catch {}
  }

  return null;
}

function normalizeParsed(parsed: any): ParsedLLMResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  return {
    thought: String(parsed.thought || parsed.reasoning || ""),
    tool: parsed.tool ? String(parsed.tool) : parsed.toolName ? String(parsed.toolName) : null,
    params: (parsed.params || parsed.parameters || {}) as Record<string, unknown>,
    isComplete: Boolean(parsed.isComplete || parsed.complete || parsed.done),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
  };
}

// ==================== EJECUCIÓN SEGURA DE HERRAMIENTAS ====================

async function executeToolSafely(
  toolName: string,
  params: Record<string, unknown>,
  context: { conversationId: string; userId: string }
): Promise<ToolExecutionResult> {
  try {
    // Validar que la herramienta existe
    const toolDef = AGENT_TOOLS.find((t) => t.name === toolName);
    if (!toolDef) {
      return {
        success: false,
        error: `Herramienta desconocida: ${toolName}. Herramientas disponibles: ${AGENT_TOOLS.map((t) => t.name).join(", ")}`,
      };
    }

    // Mapear params: el LLM puede usar 'code' o 'path' o 'query' o 'url'
    // El toolRegistry espera ciertos nombres según la tool
    const toolContext = {
      conversationId: context.conversationId,
      userId: context.userId,
    };

    // El toolRegistry ya maneja diferentes nombres de params internamente
    // Solo pasamos lo que el LLM devolvió
    const result = await toolRegistry.execute(toolName, params, toolContext);
    return result;
  } catch (err) {
    return {
      success: false,
      error: `Error ejecutando ${toolName}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
