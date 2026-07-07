// ==================== TIPOS DEL DOMINIO ====================
// Basado en el documento AGENTES.DEL.SISTEMA.md

// ====== Los 7 Agentes del sistema ======
export type AgentType =
  | "analyzer"     // Agente 1: Analizador
  | "planner"      // Agente 2: Planificador
  | "executor"     // Agente 3: Ejecutor
  | "verifier"     // Agente 4: Verificador
  | "optimizer"    // Agente 5: Optimizador
  | "reporter"     // Agente 6: Reportero
  | "monitor";     // Agente 7: Monitor

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  responsibilities: string[];
  modelId: string;        // Modelo OpenCode Go ideal
  alternativeModelId: string;  // Alternativa
  speed: number;          // 1-5
  cost: number;           // 1-5
  quality: number;        // 1-5
  systemPrompt: string;
}

// ====== Modelos OpenCode Go (13 modelos) ======
export interface AIModel {
  id: string;
  name: string;
  context: string;
  costInput: number;
  costOutput: number;
  specialty: string;
  badge?: "recommended" | "fast" | "cheap" | "premium";
}

// ====== Herramientas (56 herramientas en 16 categorías) ======
export interface Tool {
  id: number;
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParam[];
  returns: string;
}

export interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export type ToolCategory =
  | "Navegación Web"
  | "Ejecución de Código"
  | "Operaciones de Archivos"
  | "Generación de Contenido"
  | "Procesamiento de Medios"
  | "Integración de APIs"
  | "Base de Datos"
  | "Sistema"
  | "Automatización"
  | "Análisis y Visualización"
  | "Comunicación"
  | "Autenticación"
  | "Búsqueda"
  | "Procesamiento de Documentos"
  | "Versionamiento"
  | "Adicionales";

// ====== Usuario y Auth ======
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface APIConfig {
  apiKey: string;
  selectedModel: string;  // Modelo por defecto del usuario (override)
  isActive: boolean;
  lastTestedAt: string | null;
  testResult: "success" | "failed" | null;
}

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
}

export interface UserPreferences {
  theme: "dark" | "light";
  notifications: boolean;
  autoSaveTasks: boolean;
}

// ====== Sistema de Memoria Persistente ======
// 3 tipos de memoria según el .md:
// - Working: contexto actual de ejecución (volátil)
// - Episodic: historial de tareas ejecutadas (permanente)
// - Semantic: patrones aprendidos y mejores prácticas (permanente)

export type MemoryType = "working" | "episodic" | "semantic";

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  conversationId?: string;  // Para episodic (asociado a una conversación)
  timestamp: string;
  // Para semantic: cómo de confiable es este patrón (0-1)
  confidence?: number;
  // Para episodic: resultado de la tarea
  success?: boolean;
  // Etiquetas para búsqueda
  tags?: string[];
}

export interface MemorySystem {
  working: MemoryEntry[];     // Volátil, se limpia entre conversaciones
  episodic: MemoryEntry[];    // Persistente, historial de tareas
  semantic: MemoryEntry[];    // Persistente, patrones aprendidos
}

// ====== Tareas y Ejecución ======
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "paused" | "cancelled";

export interface Task {
  id: string;
  userId: string;
  name: string;
  description: string;
  objective: string;
  constraints?: string[];
  selectedTools?: string[];
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  modelUsed: string;
  tags?: string[];
  category?: TaskCategory;
}

export type TaskCategory = "research" | "code" | "data" | "automation" | "content" | "general";

// ====== Análisis (salida del Analizador) ======
export interface Analysis {
  entities: { type: string; value: string }[];
  constraints: { type: string; description: string }[];
  context: string;
  complexity: "low" | "medium" | "high";
}

// ====== Plan (salida del Planificador) ======
export interface ExecutionStep {
  id: string;
  stepNumber: number;
  description: string;
  toolName: string;
  toolCategory: ToolCategory;
  toolParams: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  logs: LogEntry[];
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  dependencies?: number[];
  // Qué tipo de output produce (para el workspace)
  produces?: WorkspaceTabType;
  // Output enriquecido generado por el paso (si aplica)
  output?: MessageOutput;
  // Qué agente ejecuta este paso (invisible al usuario)
  agent?: AgentType;
  // Modelo usado en este paso (invisible al usuario, pero visible en stats)
  modelUsed?: string;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  totalEstimatedTime: number;
  riskFactors: string[];
}

// ====== Ejecución completa ======
export type ExecutionStatus = "running" | "paused" | "completed" | "failed" | "cancelled";

export interface Execution {
  id: string;
  taskId: string;
  userId: string;
  plan: ExecutionPlan;
  currentStepIndex: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  tokensUsed: number;
  estimatedCost: number;
  actualCost: number;
  variables: Record<string, string>;
  errors: string[];
  finalOutput?: MessageOutput;
}

// ====== Logs ======
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  stepId?: string;
  agent?: AgentType;  // Qué agente generó este log
  context?: Record<string, unknown>;
}

// ====== Conversación con memoria persistente ======
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  status: "active" | "completed" | "failed" | "archived";
  modelUsed: string;
  tokensUsed: number;
  cost: number;
  category?: TaskCategory;
  preview: string;
  executionId?: string;
  // Resumen generado para memoria episódica
  summary?: string;
  // Patrones aprendidos (memoria semántica)
  learnedPatterns?: string[];
}

export interface Attachment {
  /** URL pública accesible desde el navegador (ej: /api/uploads/1234_foo.png) */
  url: string;
  /** Nombre original del archivo */
  name: string;
  /** MIME type (image/png, image/jpeg, ...) */
  type: string;
  /** Tamaño en bytes (opcional) */
  size?: number;
  /** Thumbnail URL si está disponible */
  thumbnailUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  agentStatus?: AgentStatus;
  steps?: ExecutionStep[];
  output?: MessageOutput;
  // Archivos (imágenes, etc.) adjuntados a este mensaje
  attachments?: Attachment[];
  // Referencias a memoria usada en esta respuesta
  memoryReferences?: { type: MemoryType; key: string }[];
}

// Estado del agente (invisible al usuario - solo ve "Trabajando...")
export type AgentStatus =
  | "thinking"
  | "planning"
  | "browsing"
  | "coding"
  | "writing"
  | "analyzing"
  | "executing"
  | "verifying"
  | "optimizing"
  | "reporting"
  | "monitoring"
  | "completed"
  | "failed";

export interface MessageOutput {
  type: "text" | "code" | "file" | "image" | "link" | "data" | "html";
  title?: string;
  content: string;
  language?: string;
  filename?: string;
  url?: string;
  loading?: boolean;
}

// ====== Workspace ======
export type WorkspaceTabType = "browser" | "terminal" | "files" | "output" | "data" | "memory";

export interface WorkspaceState {
  activeTab: WorkspaceTabType;
  browser?: { url: string; title: string; loading: boolean; screenshot?: string };
  terminal?: { lines: { type: "input" | "output" | "error"; text: string }[]; cwd?: string };
  files?: { name: string; path: string; type: "file" | "dir"; size?: number; modified?: string }[];
  activeFile?: { name: string; content: string; language: string };
  output?: { type: "text" | "code" | "image" | "data" | "html"; content: string; title?: string; language?: string };
}

// ====== Stats y Reportes ======
export interface DashboardStats {
  totalTasks: number;
  successRate: number;
  totalTime: number;
  totalTokens: number;
  totalCost: number;
  activeTasks: number;
  failedTasks: number;
}

export interface ActivityData {
  date: string;
  tasks: number;
  tokens: number;
  cost: number;
}

export interface ToolUsage {
  tool: string;
  category: string;
  count: number;
  successRate: number;
}

export interface ModelUsage {
  name: string;
  value: number;
  color: string;
}

// ====== Routing ======
export type Route =
  | "landing"
  | "login"
  | "register"
  | "onboarding"
  | "app"
  | "dashboard"
  | "history"
  | "reports"
  | "settings"
  | "documentation"
  | "not-found";
