// ====== OpenCode Go Models ======
export interface AIModel {
  id: string;
  name: string;
  context: string;
  costInput: number;
  costOutput: number;
  specialty: string;
  badge?: "recommended" | "fast" | "cheap" | "premium";
}

// ====== Tools ======
export interface Tool {
  id: number;
  name: string;
  description: string;
  category: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  returns: string;
  icon: string;
}

export const TOOL_CATEGORIES = [
  "Navegación Web",
  "Ejecución de Código",
  "Operaciones de Archivos",
  "Generación de Contenido",
  "Procesamiento de Medios",
  "Integración de APIs",
  "Base de Datos",
  "Sistema",
  "Automatización",
  "Análisis y Visualización",
  "Comunicación",
  "Autenticación",
  "Búsqueda",
  "Procesamiento de Documentos",
  "Versionamiento",
  "Adicionales",
] as const;

// ====== User & Auth ======
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface APIConfig {
  apiKey: string;
  selectedModel: string;
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
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  notifications: boolean;
  autoSaveTasks: boolean;
  defaultModel: string;
}

// ====== Tasks & Execution ======
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
}

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  description: string;
  toolName: string;
  toolCategory: string;
  toolParams: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  logs: LogEntry[];
  startedAt?: string;
  completedAt?: string;
  duration?: number; // seconds
  dependencies?: number[];
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
  plan: ExecutionPlan;
  currentStepIndex: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  tokensUsed: number;
  estimatedCost: number;
  actualCost: number;
  variables: Record<string, string>;
  memory: { type: "working" | "episodic" | "semantic"; key: string; value: string }[];
  errors: string[];
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

// ====== Stats & Reports ======
export interface DashboardStats {
  totalTasks: number;
  successRate: number;
  totalTime: number; // seconds
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

// ====== Routing ======
export type Route =
  | "landing"
  | "login"
  | "register"
  | "onboarding"
  | "dashboard"
  | "tasks"
  | "task-execution"
  | "task-result"
  | "history"
  | "reports"
  | "settings"
  | "documentation"
  | "tools"
  | "not-found";

export interface RouteState {
  name: Route;
  params?: Record<string, string>;
}
