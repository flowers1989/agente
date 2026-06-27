// ==================== TIPOS DEL DOMINIO ====================
// Basado en el documento de especificación del Agente de IA Autónomo

// ====== Modelos (13 modelos OpenCode Go) ======
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
  avatar?: string;
}

export interface APIConfig {
  apiKey: string;        // Encriptado
  selectedModel: string;
  isActive: boolean;
  lastTestedAt: string | null;
  testResult: "success" | "failed" | null;
}

export interface ModelParameters {
  temperature: number;        // 0.0 - 2.0
  maxTokens: number;
  topP: number;               // 0.0 - 1.0
  frequencyPenalty: number;   // -2.0 - 2.0
  presencePenalty: number;    // -2.0 - 2.0
  stopSequences: string[];
}

export interface UserPreferences {
  theme: "dark" | "light";
  notifications: boolean;
  autoSaveTasks: boolean;
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
  // Agente interno que lo ejecuta (invisible al usuario)
  agent?: "planner" | "executor" | "verifier";
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  totalEstimatedTime: number;
  riskFactors: string[];
}

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
  // Sistema de memoria (interno)
  variables: Record<string, string>;
  memory: MemoryEntry[];
  errors: string[];
}

export interface MemoryEntry {
  type: "working" | "episodic" | "semantic";
  key: string;
  value: string;
}

// ====== Logs ======
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  stepId?: string;
  context?: Record<string, unknown>;
}

// ====== Conversación (estilo Manus) ======
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
  // Información de la ejecución asociada (si hay)
  executionId?: string;
  steps?: ExecutionStep[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  // Estado del agente (invisible al usuario - solo se muestra "Trabajando")
  agentStatus?: AgentStatus;
  // Pasos asociados (si es mensaje del assistant)
  steps?: ExecutionStep[];
  // Output final
  output?: MessageOutput;
}

// Estado interno del agente - NO se muestra directamente al usuario
// El usuario solo ve "Trabajando..." con dots animados
export type AgentStatus =
  | "thinking"
  | "planning"
  | "browsing"
  | "coding"
  | "writing"
  | "analyzing"
  | "executing"
  | "verifying"
  | "completed"
  | "failed";

export interface MessageOutput {
  type: "text" | "code" | "file" | "image" | "link" | "data" | "html";
  title?: string;
  content: string;
  language?: string;
  filename?: string;
  url?: string;
}

// ====== Workspace (panel derecho tipo Manus) ======
export type WorkspaceTabType = "browser" | "terminal" | "files" | "output" | "data";

export interface WorkspaceState {
  activeTab: WorkspaceTabType;
  browser?: {
    url: string;
    title: string;
    loading: boolean;
    screenshot?: string;
  };
  terminal?: {
    lines: { type: "input" | "output" | "error"; text: string }[];
    cwd?: string;
  };
  files?: { name: string; path: string; type: "file" | "dir"; size?: number; modified?: string }[];
  activeFile?: { name: string; content: string; language: string };
  output?: {
    type: "text" | "code" | "image" | "data" | "html";
    content: string;
    title?: string;
    language?: string;
  };
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
  | "app"             // Vista principal tipo Manus (chat + workspace)
  | "dashboard"
  | "history"
  | "reports"
  | "settings"
  | "documentation"
  | "not-found";

export interface RouteState {
  name: Route;
  params?: Record<string, string>;
}
