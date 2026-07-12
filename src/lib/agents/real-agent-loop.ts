// ==================== AGENT LOOP REAL — ESTILO MANUS IA ====================
// Loop autónomo inspirado en la arquitectura de Manus IA:
//
// 1. todo.md dinámico — el agente crea y actualiza un archivo todo.md
//    paso a paso. Es un mecanismo deliberado para empujar el plan global
//    al rango de atención reciente del LLM (evita "lost in the middle").
//
// 2. Mantener errores en el contexto — los errores NO se ocultan.
//    Se dejan en el contexto para que el LLM aprenda y no repita errores.
//    "Borrar el fracaso elimina evidencia."
//
// 3. Sistema de archivos como contexto externalizado — el filesystem del
//    sandbox es la memoria del agente. Ilimitado, persistente, operable.
//
// 4. Human-in-the-loop — el agente puede pedir input al usuario cuando
//    necesita credenciales, confirmación o resolver captchas.
//
// 5. KV-cache optimization — system prompt estable sin timestamps.
//    Append-only context. Nombres de herramientas con prefijos consistentes.

import { getAdapter } from "./opencode-adapter";
import { toolRegistry } from "./tool-registry";
import { useMemoryStore } from "../memory/memory-store";
import type { ToolExecutionResult } from "./tool-registry";
import type { ChatMessage as LLMChatMessage } from "./opencode-adapter";
import { clientGetOrCreateSandbox, clientExec } from "../sandbox/sandbox-client";

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
  // Human-in-the-loop: callback para pedir input al usuario
  onUserInputRequest?: (prompt: string) => Promise<string>;
  // Callback para actualizar el todo.md en la UI
  onTodoUpdate?: (todoMarkdown: string) => void;
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
  // Indica si esta iteración pidió input al usuario
  waitingForUserInput?: boolean;
}

export interface AgentLoopResult {
  success: boolean;
  iterations: LoopIteration[];
  finalOutput: string;
  totalDuration: number;
  toolsUsed: string[];
  errorMessage?: string;
  todoMarkdown?: string;
}

const DEFAULT_MAX_ITERATIONS = 50; // Manus usa ~50 tool calls por tarea

// ==================== TOOLS CON PREFIJOS CONSISTENTES (KV-CACHE FRIENDLY) ====================
// Nombres con prefijos para que el LLM los agrupe mentalmente:
//   browser_* → navegación
//   shell_*   → comandos
//   file_*    → archivos
//   web_*     → internet
//   ask_user  → human-in-the-loop

interface ToolDef {
  name: string;
  description: string;
  paramsSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

const AGENT_TOOLS: ToolDef[] = [
  // ===== SHELL =====
  {
    name: "shell_exec",
    description:
      "Ejecuta un comando bash en el sandbox Docker. Útil para: crear archivos, instalar dependencias (npm install, pip install), correr scripts, levantar servidores (npm run dev), ver contenido de archivos. El output real (stdout/stderr) se devuelve al agente. Los comandos largos (npm install) tienen timeout de 3 minutos.",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "El comando bash a ejecutar. Ej: 'npm install', 'echo hola > file.txt', 'PORT=3001 npm run dev &', 'ls -la'",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "shell_python",
    description: "Ejecuta código Python en el sandbox. Para análisis de datos, cálculos, scripts, generar archivos.",
    paramsSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "El código Python a ejecutar" },
      },
      required: ["code"],
    },
  },
  {
    name: "shell_node",
    description: "Ejecuta código Node.js en el sandbox. Para scripts JS, manipular JSON, Express servers.",
    paramsSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "El código Node.js a ejecutar" },
      },
      required: ["code"],
    },
  },
  // ===== FILE (sistema de archivos como contexto externalizado) =====
  {
    name: "file_write",
    description:
      "Escribe contenido a un archivo en el sandbox. El sistema de archivos es tu memoria externalizada — ilimitada y persistente. Úsalo para: crear código fuente, guardar resultados de investigación, escribir notas, almacenar datos grandes que no caben en el contexto. El path debe ser absoluto (/workspace/...).",
    paramsSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Ruta absoluta. Ej: '/workspace/src/App.tsx', '/workspace/notes.md'" },
        code: { type: "string", description: "El contenido del archivo (string completo)" },
      },
      required: ["path", "code"],
    },
  },
  {
    name: "file_read",
    description:
      "Lee el contenido de un archivo del sandbox. Úsalo para: recuperar notas previas, verificar lo que escribiste, leer logs, cargar datos guardados. El filesystem es tu memoria — úsalo cuando el contexto esté creciendo demasiado.",
    paramsSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Ruta absoluta del archivo a leer" },
      },
      required: ["path"],
    },
  },
  {
    name: "file_list",
    description: "Lista archivos de un directorio del sandbox. Úsalo para ver la estructura del proyecto.",
    paramsSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directorio a listar. Ej: '/workspace', '/workspace/src'" },
      },
      required: ["path"],
    },
  },
  // ===== WEB =====
  {
    name: "web_search",
    description: "Busca en internet (DuckDuckGo). Para investigar temas, encontrar documentación, obtener información actualizada.",
    paramsSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "La consulta de búsqueda" },
      },
      required: ["query"],
    },
  },
  {
    name: "web_extract",
    description:
      "Extrae el contenido de una URL. Para leer documentación, scrapear páginas, obtener datos de APIs. IMPORTANTE: el contenido puede ser muy grande — guárdalo en un archivo con file_write en vez de mantenerlo en el contexto.",
    paramsSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "La URL a extraer" },
      },
      required: ["url"],
    },
  },
  // ===== BROWSER (navegador real en el sandbox, visible vía VNC) =====
  {
    name: "browser_open",
    description:
      "Abre una URL en el navegador Chromium del sandbox (visible en el VNC). El usuario puede ver lo que haces en tiempo real. Úsalo para navegar a sitios, hacer búsquedas visibles, interactuar con webs que requieren JS.",
    paramsSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "La URL a abrir. Ej: 'https://google.com'" },
      },
      required: ["url"],
    },
  },
  // ===== CODE GENERATION =====
  {
    name: "code_generate",
    description: "Genera código usando un LLM especializado. Para generar funciones, componentes, scripts complejos. Devuelve el código generado — debes guardarlo con file_write después.",
    paramsSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Descripción detallada del código a generar" },
      },
      required: ["description"],
    },
  },
  // ===== TODO (manipulación de atención estilo Manus) =====
  {
    name: "todo_update",
    description:
      "Actualiza el archivo todo.md con la lista de tareas pendientes. Este es un mecanismo CRÍTICO para mantener el enfoque en el objetivo. REGLA: al inicio de una tarea compleja, crea el todo.md con todos los pasos. Después de cada herramienta exitosa, actualiza el todo.md marcando los items completados con [x]. Esto empuja el plan global al rango de atención reciente del LLM.",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "El contenido completo del todo.md en formato markdown. Usa '- [ ]' para pendientes y '- [x]' para completados.",
        },
      },
      required: ["code"],
    },
  },
  // ===== HUMAN-IN-THE-LOOP =====
  {
    name: "ask_user",
    description:
      "Pide input al usuario. Úsalo cuando necesites: credenciales (API keys, passwords), confirmación para proceder, resolver ambigüedades, o cuando encuentres un captcha. El agente se pausa hasta que el usuario responde.",
    paramsSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "La pregunta o solicitud al usuario. Sé específico sobre qué necesitas.",
        },
      },
      required: ["code"],
    },
  },
];

// ==================== PROMPT DEL SISTEMA (ESTABLE, SIN TIMESTAMPS — KV-CACHE FRIENDLY) ====================

const SYSTEM_PROMPT = `Eres un agente IA autónomo tipo Manus IA. Completas tareas ejecutando herramientas reales en un sandbox Docker con escritorio virtual visible.

## REGLA #1 — PROHIBIDO devolver código en el chat
NUNCA devuelvas bloques de código en el campo "thought". El código va en archivos del sandbox usando file_write.

## REGLA #2 — PROHIBIDO usar el puerto 3000
El puerto 3000 está ocupado. Para servir proyectos web usa 3001, 3002, 4000, 8080, etc.

## REGLA #3 — todo.md obligatorio (MANIPULACIÓN DE ATENCIÓN)
Al inicio de una tarea compleja, usa todo_update para crear /workspace/todo.md con todos los pasos.
Después de cada herramienta exitosa, actualiza todo.md marcando items completados con [x].
Esto mantiene el plan global en tu rango de atención reciente.

## REGLA #4 — Sistema de archivos como memoria externalizada
Cuando el contexto crezca demasiado, guarda información en archivos con file_write.
Lee archivos con file_read cuando necesites recuperar información.
El filesystem es ilimitado y persistente — úsalo como tu memoria.

## REGLA #5 — Mantener errores en el contexto
Si una herramienta falla, NO la ocultes. Observa el error, aprende de él, y ajusta tu enfoque.
Los errores son evidencia que te hace mejor.

## REGLA #6 — Human-in-the-loop
Si necesitas credenciales, confirmación, o encuentras un captcha, usa ask_user.
El agente se pausa hasta que el usuario responde.

## Tu ciclo de trabajo (pensar → actuar → observar → evaluar → repetir)
En CADA iteración devuelves un JSON:
{"thought":"razonamiento breve","tool":"nombre_herramienta","params":{...},"isComplete":false}

## Herramientas disponibles
${AGENT_TOOLS.map(
  (t) => `
### ${t.name}
${t.description}
Params: ${JSON.stringify(t.paramsSchema)}`
).join("\n")}

## Ejemplo de flujo para "crea un dashboard con Next.js":

Iter 1: {"thought":"Crear todo.md con el plan","tool":"todo_update","params":{"code":"# Dashboard\\n- [ ] Crear package.json\\n- [ ] Crear layout.tsx\\n- [ ] Crear page.tsx\\n- [ ] npm install\\n- [ ] Levantar servidor en 3001\\n- [ ] Verificar"},"isComplete":false}

Iter 2: {"thought":"Crear package.json","tool":"file_write","params":{"path":"/workspace/package.json","code":"{...}"},"isComplete":false}

Iter 3: {"thought":"Actualizar todo.md","tool":"todo_update","params":{"code":"# Dashboard\\n- [x] Crear package.json\\n- [ ] Crear layout.tsx\\n..."},"isComplete":false}

... y así hasta completar.

## Formato de respuesta
Devuelve SOLO el JSON, sin markdown, sin texto extra. Válido y parseable.`;

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
    onUserInputRequest,
    onTodoUpdate,
  } = options;

  const adapter = getAdapter();
  const iterations: LoopIteration[] = [];
  const toolsUsed: string[] = [];
  const startTime = Date.now();
  let currentTodoMd = "";

  // Historial de mensajes — APPEND-ONLY para optimizar KV-cache
  const messages: LLMChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `OBJETIVO: ${objective}\n\nComienza. Devuelve el JSON de tu primera iteración. Recuerda empezar creando un todo.md.`,
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
      // Si no se puede parsear, pedir reformulación (append-only)
      messages.push({ role: "assistant", content: llmResponse });
      messages.push({
        role: "user",
        content:
          "Tu respuesta no es un JSON válido. Devuelve SOLO un JSON: {thought, tool, params, isComplete}.",
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

    // Manejo especial para ask_user (human-in-the-loop)
    if (parsed.tool === "ask_user" && onUserInputRequest) {
      const question = String(parsed.params.code || parsed.params.message || "Input requerido");
      const userResponse = await onUserInputRequest(question);

      const iteration: LoopIteration = {
        iterationNumber: i,
        thought: parsed.thought,
        toolName: "ask_user",
        toolParams: parsed.params,
        observation: `Usuario respondió: ${userResponse}`,
        evaluation: {
          isComplete: false,
          isSuccessful: true,
          nextAction: "continue",
          confidence: 1,
        },
        duration: Date.now() - iterStartTime,
        waitingForUserInput: true,
      };
      iterations.push(iteration);
      onIteration?.(iteration);

      // Append-only: añadir la respuesta del usuario al contexto
      messages.push({ role: "assistant", content: llmResponse });
      messages.push({
        role: "user",
        content: `RESPUESTA DEL USUARIO: ${userResponse}\n\nContinúa con la tarea.`,
      });
      continue;
    }

    // Manejo especial para todo_update (actualizar todo.md en la UI)
    if (parsed.tool === "todo_update") {
      currentTodoMd = String(parsed.params.code || "");
      onTodoUpdate?.(currentTodoMd);

      // También escribirlo al sandbox
      const toolResult = await executeToolSafely("file_write", {
        path: "/workspace/todo.md",
        code: currentTodoMd,
      }, { conversationId, userId });

      const iteration: LoopIteration = {
        iterationNumber: i,
        thought: parsed.thought,
        toolName: "todo_update",
        toolParams: parsed.params,
        observation: `todo.md actualizado (${currentTodoMd.length} chars)`,
        evaluation: {
          isComplete: false,
          isSuccessful: true,
          nextAction: "continue",
          confidence: 1,
        },
        duration: Date.now() - iterStartTime,
      };
      iterations.push(iteration);
      onIteration?.(iteration);
      toolsUsed.push("todo_update");

      messages.push({ role: "assistant", content: llmResponse });
      messages.push({
        role: "user",
        content: `todo.md actualizado. Continúa con la siguiente herramienta.`,
      });
      continue;
    }

    // Ejecutar herramienta normal
    const toolResult = await executeToolSafely(parsed.tool, parsed.params, {
      conversationId,
      userId,
    });

    onToolEnd?.(parsed.tool, toolResult);
    toolsUsed.push(parsed.tool);

    // ===== FASE 3: OBSERVAR (mantener errores en el contexto) =====
    let observation: string;
    if (toolResult.success) {
      const resultText = toolResult.result || "";
      const outputText = toolResult.output?.content || "";
      // Truncar output grande pero indicar que se guardó (restaurable)
      const maxLen = 2000;
      const truncated = resultText.length > maxLen;
      observation = `✓ ${parsed.tool} ejecutada exitosamente.\nOutput: ${resultText.slice(0, maxLen)}${truncated ? `\n... (truncado, ${resultText.length} chars total. Usa file_read si necesitas el contenido completo)` : ""}${outputText ? `\n\nContenido:\n${outputText.slice(0, 3000)}` : ""}`;
    } else {
      // MANTENER EL ERROR EN EL CONTEXTO — no ocultarlo
      observation = `✗ ${parsed.tool} FALLÓ.\nError: ${toolResult.error}\n\nEsto es EVIDENCIA. Analiza el error y ajusta tu enfoque. NO repitas el mismo comando. Considera: ¿parámetros diferentes? ¿otra herramienta? ¿buscar documentación?`;
    }

    // ===== FASE 4: EVALUAR =====
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

    // Append-only: alimentar la observación al LLM
    messages.push({ role: "assistant", content: llmResponse });
    messages.push({
      role: "user",
      content: `OBSERVACIÓN iteración ${i}:\n${observation}\n\nRecuerda: si completaste un paso del todo.md, actualízalo con todo_update. Si terminaste todo, devuelve isComplete=true.`,
    });

    // Guardar en memoria de trabajo
    useMemoryStore.getState().store(
      "working",
      `iteration:${conversationId}:${i}`,
      JSON.stringify({
        thought: parsed.thought,
        tool: parsed.tool,
        success: toolResult.success,
        observation: observation.slice(0, 1000),
      }),
      { conversationId, tags: ["iteration", conversationId] }
    );
  }

  // Si terminó por maxIterations sin isComplete
  if (iterations.length > 0 && !iterations[iterations.length - 1].evaluation.isComplete) {
    errorMessage = `Se alcanzó el máximo de ${maxIterations} iteraciones sin completar el objetivo.`;
    onError?.(errorMessage);
  }

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
    todoMarkdown: currentTodoMd,
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

  // Intento 3: buscar primer { y último }
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
    // Mapear nombres con prefijos a los nombres del toolRegistry
    const toolMap: Record<string, string> = {
      shell_exec: "Bash/Shell Execution",
      shell_python: "Python Execution",
      shell_node: "Node.js Execution",
      file_write: "File Write",
      file_read: "File Read",
      file_list: "Bash/Shell Execution", // file_list se implementa via ls
      web_search: "Web Search",
      web_extract: "Web Extraction",
      browser_open: "Bash/Shell Execution", // browser_open se implementa via chromium
      code_generate: "Code Generation",
      todo_update: "File Write", // todo_update se maneja especial arriba
    };

    // Para file_list, ejecutar ls via bash
    if (toolName === "file_list") {
      const dirPath = String(params.path || "/workspace");
      return executeToolSafely("shell_exec", { code: `ls -la ${dirPath}` }, context);
    }

    // Para browser_open, abrir chromium en el sandbox
    if (toolName === "browser_open") {
      const url = String(params.url || "https://google.com");
      return executeToolSafely("shell_exec", {
        code: `chromium --no-sandbox --disable-gpu --start-maximized --app=${JSON.stringify(url)} &`,
      }, context);
    }

    const registryName = toolMap[toolName] || toolName;
    const result = await toolRegistry.execute(registryName, params, {
      conversationId: context.conversationId,
      userId: context.userId,
    });
    return result;
  } catch (err) {
    return {
      success: false,
      error: `Error ejecutando ${toolName}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
