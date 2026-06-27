# PROMPT EXHAUSTIVO: AGENTE DE IA AUTÓNOMO CON OPENCODE GO + FRONTEND COMPLETO

## TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [OpenCode Go - Modelos Disponibles](#opencode-go---modelos-disponibles)
3. [Arquitectura Técnica Completa](#arquitectura-técnica-completa)
4. [Backend - Especificación Técnica](#backend---especificación-técnica)
5. [Frontend - Especificación Técnica](#frontend---especificación-técnica)
6. [Las 56 Herramientas Integradas](#las-56-herramientas-integradas)
7. [Flujos de Usuario](#flujos-de-usuario)
8. [Sistema de Configuración](#sistema-de-configuración)
9. [Agentes Especializados](#agentes-especializados)
10. [Sistema de Memoria](#sistema-de-memoria)
11. [Logging y Monitoreo](#logging-y-monitoreo)
12. [Seguridad](#seguridad)
13. [Roadmap de Desarrollo](#roadmap-de-desarrollo)
14. [Stack Tecnológico](#stack-tecnológico)

---

## VISIÓN GENERAL

### Objetivo
Construir un **agente de IA autónomo configurable** que:
- Permita a usuarios ingresar su clave API de OpenCode Go
- Acceda a 13 modelos de IA especializados en coding
- Ejecute tareas complejas de forma autónoma
- Proporcione interfaz web moderna y profesional
- Integre 56 herramientas de ejecución
- Ofrezca experiencia similar a Manus AI

### Diferenciadores Clave
✅ **OpenCode Go como único proveedor LLM**
✅ **13 modelos disponibles (no configurable)**
✅ **Interfaz moderna y profesional**
✅ **56 herramientas integradas**
✅ **Ejecución autónoma sin intervención**
✅ **Seguridad y privacidad garantizadas**

---

## OPENCODE GO - MODELOS DISPONIBLES

### Modelos Soportados (13 Total)

| # | Modelo | ID en API | Contexto | Costo Input | Costo Output | Especialidad |
|---|--------|-----------|----------|------------|-------------|-------------|
| 1 | GLM-5.2 | `glm-5.2` | 1.0M | $1.40 | $4.40 | Razonamiento avanzado |
| 2 | GLM-5.1 | `glm-5.1` | 203K | $1.40 | $4.40 | Razonamiento avanzado |
| 3 | Kimi K2.7 Code | `kimi-k2.7-code` | 262K | $0.95 | $4.00 | Coding especializado |
| 4 | Kimi K2.6 | `kimi-k2.6` | 262K | $0.95 | $4.00 | Coding general |
| 5 | DeepSeek V4 Pro | `deepseek-v4-pro` | 1.0M | $1.74 | $3.48 | Razonamiento complejo |
| 6 | DeepSeek V4 Flash | `deepseek-v4-flash` | 1.0M | $0.14 | $0.28 | Velocidad + costo bajo |
| 7 | MiMo-V2.5 | `mimo-v2.5` | 1.0M | $0.14 | $0.28 | Velocidad extrema |
| 8 | MiMo-V2.5-Pro | `mimo-v2.5-pro` | 1.0M | $1.74 | $3.48 | Calidad + velocidad |
| 9 | MiniMax M3 | `minimax-m3` | 1.0M | $0.10 | $0.40 | Mejor relación costo/calidad |
| 10 | MiniMax M2.7 | `minimax-m2.7` | 205K | $0.30 | $1.20 | Coding balanceado |
| 11 | Qwen3.7 Max | `qwen3.7-max` | 1.0M | $2.50 | $7.50 | Máxima calidad |
| 12 | Qwen3.7 Plus | `qwen3.7-plus` | 1.0M | $0.40 | $1.60 | Calidad media-alta |
| 13 | Qwen3.6 Plus | `qwen3.6-plus` | 1.0M | $0.50 | $3.00 | Calidad media |

### Límites de Uso OpenCode Go ($10/mes)

```
5-hour limit:   $12 de uso
Weekly limit:   $30 de uso
Monthly limit:  $60 de uso
```

### Endpoints OpenCode Go

```
Chat Completions: https://opencode.ai/zen/go/v1/chat/completions
Messages:         https://opencode.ai/zen/go/v1/messages
Models List:      https://opencode.ai/zen/go/v1/models
```

---

## ARQUITECTURA TÉCNICA COMPLETA

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ UI Components | Pages | Layouts | Animations        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ (WebSocket + HTTP)
┌─────────────────────────────────────────────────────────────┐
│                  API GATEWAY (Express)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Auth | Rate Limiting | Request Validation           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Agente Planificador | Agente Ejecutor | Verificador │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  TOOLS & INTEGRATIONS                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 56 Herramientas | OpenCode Go Adapter | Memoria     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PostgreSQL | Redis | File Storage | Logs            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos Completo

```
1. USUARIO INGRESA TAREA
   ├─ Frontend: Captura objetivo
   ├─ Validación: Verifica entrada
   └─ API: Envía a backend

2. BACKEND RECIBE TAREA
   ├─ Autenticación: Verifica JWT
   ├─ Validación: Valida datos
   ├─ Almacenamiento: Guarda en DB
   └─ Emit: Notifica inicio a frontend

3. AGENTE PLANIFICADOR
   ├─ Llama a OpenCode Go
   ├─ Recibe plan de pasos
   ├─ Descompone en subtareas
   └─ Calcula dependencias

4. AGENTE EJECUTOR
   ├─ Ejecuta paso 1
   ├─ Selecciona herramienta
   ├─ Ejecuta herramienta
   ├─ Almacena resultado
   ├─ Emite log a frontend
   └─ Repite para cada paso

5. VERIFICADOR
   ├─ Valida resultado
   ├─ Si error: Reintentar
   ├─ Si éxito: Siguiente paso
   └─ Si crítico: Detener

6. RESULTADO FINAL
   ├─ Agrega todos los resultados
   ├─ Formatea respuesta
   ├─ Almacena en DB
   └─ Emite a frontend

7. FRONTEND MUESTRA RESULTADO
   ├─ Detiene animación
   ├─ Muestra resultado formateado
   ├─ Ofrece opciones (descargar, repetir, etc.)
   └─ Actualiza historial
```

---

## BACKEND - ESPECIFICACIÓN TÉCNICA

### Estructura de Carpetas

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Configuración PostgreSQL
│   │   ├── redis.ts             # Configuración Redis
│   │   ├── opencode-go.ts       # Configuración OpenCode Go
│   │   └── env.ts               # Variables de entorno
│   ├── models/
│   │   ├── User.ts
│   │   ├── Task.ts
│   │   ├── Execution.ts
│   │   ├── APIConfig.ts
│   │   └── Log.ts
│   ├── routes/
│   │   ├── auth.ts              # Autenticación
│   │   ├── tasks.ts             # CRUD de tareas
│   │   ├── executions.ts        # Ejecución de tareas
│   │   ├── config.ts            # Configuración de usuario
│   │   ├── history.ts           # Historial
│   │   └── reports.ts           # Reportes
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── TaskService.ts
│   │   ├── ExecutionService.ts
│   │   ├── ConfigService.ts
│   │   └── ReportService.ts
│   ├── agents/
│   │   ├── PlannerAgent.ts      # Planificador
│   │   ├── ExecutorAgent.ts     # Ejecutor
│   │   └── VerifierAgent.ts     # Verificador
│   ├── tools/
│   │   ├── BrowserTools.ts      # Herramientas web
│   │   ├── CodeExecutionTools.ts # Ejecución de código
│   │   ├── FileTools.ts         # Operaciones de archivos
│   │   ├── APITools.ts          # Integración de APIs
│   │   ├── MediaTools.ts        # Procesamiento de medios
│   │   └── ... (más herramientas)
│   ├── adapters/
│   │   └── OpenCodeGoAdapter.ts # Adapter para OpenCode Go
│   ├── memory/
│   │   ├── WorkingMemory.ts
│   │   ├── EpisodicMemory.ts
│   │   └── SemanticMemory.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   ├── logger.ts
│   │   └── rateLimiter.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── helpers.ts
│   ├── websocket/
│   │   └── socketHandler.ts     # WebSocket para tiempo real
│   ├── app.ts                   # Configuración Express
│   └── server.ts                # Punto de entrada
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json
└── tsconfig.json
```

### Modelos de Base de Datos

```typescript
// User Model
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  apiConfig: APIConfig;
  preferences: UserPreferences;
}

// APIConfig Model
interface APIConfig {
  userId: string;
  apiKey: string; // Encriptado
  selectedModel: string; // Modelo actual
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt: Date;
  testResult: 'success' | 'failed' | null;
}

// Task Model
interface Task {
  id: string;
  userId: string;
  name: string;
  description: string;
  objective: string;
  constraints?: string[];
  selectedTools?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

// Execution Model
interface Execution {
  id: string;
  taskId: string;
  userId: string;
  plan: ExecutionPlan;
  steps: ExecutionStep[];
  currentStepIndex: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  tokensUsed: number;
  estimatedCost: number;
  actualCost: number;
}

// ExecutionStep Model
interface ExecutionStep {
  id: string;
  executionId: string;
  stepNumber: number;
  description: string;
  toolName: string;
  toolParams: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  logs: LogEntry[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

// Log Model
interface LogEntry {
  id: string;
  executionId?: string;
  stepId?: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}
```

### Endpoints API REST

```
# Autenticación
POST   /api/auth/register           # Registrar usuario
POST   /api/auth/login              # Login
POST   /api/auth/logout             # Logout
POST   /api/auth/refresh            # Refrescar token
GET    /api/auth/me                 # Obtener usuario actual

# Configuración
GET    /api/config                  # Obtener configuración
POST   /api/config/api-key          # Guardar API key
POST   /api/config/test-connection  # Probar conexión
GET    /api/config/models           # Listar modelos disponibles
PUT    /api/config/model            # Cambiar modelo
PUT    /api/config/parameters       # Cambiar parámetros

# Tareas
GET    /api/tasks                   # Listar tareas
POST   /api/tasks                   # Crear tarea
GET    /api/tasks/:id               # Obtener tarea
PUT    /api/tasks/:id               # Actualizar tarea
DELETE /api/tasks/:id               # Eliminar tarea

# Ejecución
POST   /api/tasks/:id/execute       # Ejecutar tarea
GET    /api/tasks/:id/execution     # Obtener ejecución
POST   /api/tasks/:id/pause         # Pausar ejecución
POST   /api/tasks/:id/cancel        # Cancelar ejecución
POST   /api/tasks/:id/retry         # Reintentar paso

# Historial
GET    /api/history                 # Obtener historial
GET    /api/history/stats           # Estadísticas
GET    /api/history/export          # Exportar historial

# Reportes
GET    /api/reports                 # Obtener reportes
GET    /api/reports/analytics       # Análisis
GET    /api/reports/export          # Exportar reporte
```

### Adapter OpenCode Go

```typescript
interface OpenCodeGoAdapter {
  // Configuración
  initialize(apiKey: string): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Modelos
  getAvailableModels(): Promise<Model[]>;
  selectModel(modelId: string): void;
  
  // Llamadas LLM
  chat(messages: Message[], params?: ChatParams): Promise<ChatResponse>;
  stream(messages: Message[], params?: ChatParams): AsyncGenerator<string>;
  
  // Información
  getModelInfo(modelId: string): Promise<ModelInfo>;
  getUsageStats(): Promise<UsageStats>;
}

// Ejemplo de uso
const adapter = new OpenCodeGoAdapter();
await adapter.initialize(apiKey);

const models = await adapter.getAvailableModels();
// Retorna: [
//   { id: 'glm-5.2', name: 'GLM-5.2', ... },
//   { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', ... },
//   ...
// ]

adapter.selectModel('deepseek-v4-flash');

const response = await adapter.chat([
  { role: 'user', content: 'Hola, ¿cómo estás?' }
]);
```

### Agentes Especializados

#### 1. Agente Planificador

```typescript
class PlannerAgent {
  private adapter: OpenCodeGoAdapter;
  private memory: SemanticMemory;
  
  async createPlan(objective: string, constraints?: string[]): Promise<ExecutionPlan> {
    // 1. Analizar objetivo
    const analysis = await this.analyzeObjective(objective);
    
    // 2. Llamar a OpenCode Go para crear plan
    const prompt = this.buildPlanningPrompt(objective, constraints, analysis);
    const response = await this.adapter.chat([
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]);
    
    // 3. Parsear plan
    const plan = this.parsePlan(response);
    
    // 4. Validar plan
    await this.validatePlan(plan);
    
    // 5. Guardar en memoria
    await this.memory.store(objective, plan);
    
    return plan;
  }
  
  private buildPlanningPrompt(objective: string, constraints?: string[], analysis?: any): string {
    return `
      Eres un planificador experto de tareas. Tu trabajo es descomponer objetivos complejos en pasos ejecutables.
      
      OBJETIVO: ${objective}
      ${constraints ? `RESTRICCIONES: ${constraints.join(', ')}` : ''}
      
      Debes retornar un JSON con la siguiente estructura:
      {
        "steps": [
          {
            "number": 1,
            "description": "Descripción del paso",
            "tool": "nombre_herramienta",
            "parameters": { ... },
            "dependencies": [0],
            "estimatedTime": 30
          }
        ],
        "totalEstimatedTime": 120,
        "riskFactors": ["factor1", "factor2"]
      }
    `;
  }
}
```

#### 2. Agente Ejecutor

```typescript
class ExecutorAgent {
  private adapter: OpenCodeGoAdapter;
  private tools: ToolRegistry;
  private memory: WorkingMemory;
  
  async executePlan(plan: ExecutionPlan, execution: Execution): Promise<void> {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      // 1. Preparar contexto
      const context = await this.memory.getContext();
      
      // 2. Ejecutar herramienta
      const tool = this.tools.get(step.tool);
      const result = await tool.execute(step.parameters, context);
      
      // 3. Guardar resultado
      execution.steps[i].result = result;
      execution.steps[i].status = 'completed';
      
      // 4. Actualizar memoria
      await this.memory.update(step.description, result);
      
      // 5. Emitir log
      this.emitLog(`Paso ${i + 1} completado: ${step.description}`);
    }
  }
}
```

#### 3. Agente Verificador

```typescript
class VerifierAgent {
  private adapter: OpenCodeGoAdapter;
  
  async verifyStep(step: ExecutionStep, context: any): Promise<VerificationResult> {
    // 1. Validar resultado
    const isValid = this.validateResult(step.result, step.toolName);
    
    if (!isValid) {
      // 2. Llamar a OpenCode Go para análisis
      const analysis = await this.analyzeError(step, context);
      
      // 3. Determinar acción
      if (analysis.canRetry) {
        return { status: 'retry', reason: analysis.reason };
      } else {
        return { status: 'failed', reason: analysis.reason };
      }
    }
    
    return { status: 'success' };
  }
}
```

---

## FRONTEND - ESPECIFICACIÓN TÉCNICA

### Estructura de Carpetas

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TaskCard.tsx
│   │   ├── ExecutionPanel.tsx
│   │   ├── PlanVisualizer.tsx
│   │   ├── APIConfigModal.tsx
│   │   ├── HistoryTable.tsx
│   │   └── ... (más componentes)
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── TaskExecution.tsx
│   │   ├── TaskResult.tsx
│   │   ├── History.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   ├── Documentation.tsx
│   │   └── NotFound.tsx
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── BlankLayout.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTask.ts
│   │   ├── useExecution.ts
│   │   ├── useWebSocket.ts
│   │   └── ... (más hooks)
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── AppContext.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── websocket.ts
│   │   └── storage.ts
│   ├── store/
│   │   ├── useAppStore.ts        # Zustand store
│   │   ├── useTaskStore.ts
│   │   └── useExecutionStore.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── ui.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── animations.css
│   │   └── theme.css
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Páginas Principales

#### 1. Landing Page (`/`)

```typescript
export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1>Agente de IA Autónomo</h1>
        <p>Ejecuta tareas complejas automáticamente con OpenCode Go</p>
        <button onClick={() => navigate('/register')}>Comenzar</button>
      </section>
      
      {/* Features */}
      <section className="features">
        <FeatureCard
          icon={<RobotIcon />}
          title="Autónomo"
          description="Ejecuta tareas sin intervención"
        />
        <FeatureCard
          icon={<ZapIcon />}
          title="Rápido"
          description="Acceso a 13 modelos especializados"
        />
        <FeatureCard
          icon={<ShieldIcon />}
          title="Seguro"
          description="Encriptación de extremo a extremo"
        />
      </section>
      
      {/* CTA */}
      <section className="cta">
        <h2>¿Listo para comenzar?</h2>
        <button>Crear Cuenta Gratis</button>
      </section>
    </div>
  );
}
```

#### 2. Dashboard (`/dashboard`)

```typescript
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats>();
  
  useEffect(() => {
    // Cargar tareas y estadísticas
    fetchTasks();
    fetchStats();
  }, []);
  
  return (
    <MainLayout>
      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <button onClick={() => openCreateTaskModal()}>
            <PlusIcon /> Nueva Tarea
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <StatCard
            title="Tareas Ejecutadas"
            value={stats?.totalTasks}
            icon={<CheckIcon />}
          />
          <StatCard
            title="Tasa de Éxito"
            value={`${stats?.successRate}%`}
            icon={<TrendingUpIcon />}
          />
          <StatCard
            title="Tiempo Total"
            value={formatDuration(stats?.totalTime)}
            icon={<ClockIcon />}
          />
          <StatCard
            title="Tokens Utilizados"
            value={stats?.totalTokens}
            icon={<ZapIcon />}
          />
        </div>
        
        {/* Recent Tasks */}
        <div className="recent-tasks">
          <h2>Tareas Recientes</h2>
          <div className="task-grid">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
                onDelete={() => deleteTask(task.id)}
                onRepeat={() => repeatTask(task.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Activity Chart */}
        <div className="activity-chart">
          <h2>Actividad (Últimos 7 días)</h2>
          <LineChart data={activityData} />
        </div>
      </div>
    </MainLayout>
  );
}
```

#### 3. Task Execution (`/tasks/:id/execution`)

```typescript
export default function TaskExecution() {
  const { id } = useParams();
  const [execution, setExecution] = useState<Execution>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const socket = useWebSocket();
  
  useEffect(() => {
    // Conectar a WebSocket para actualizaciones en tiempo real
    socket.on('execution:step:completed', (step) => {
      updateExecution(step);
    });
    
    socket.on('execution:log', (log) => {
      setLogs(prev => [...prev, log]);
    });
    
    return () => socket.off('execution:step:completed');
  }, []);
  
  return (
    <MainLayout>
      <div className="execution-container">
        {/* Header */}
        <div className="execution-header">
          <h1>{execution?.task.name}</h1>
          <Badge status={execution?.status}>
            {execution?.status}
          </Badge>
          <span className="time">
            {formatDuration(execution?.duration)}
          </span>
        </div>
        
        <div className="execution-grid">
          {/* Left Panel: Plan */}
          <div className="plan-panel">
            <h3>Plan de Ejecución</h3>
            <PlanVisualizer
              plan={execution?.plan}
              currentStep={execution?.currentStepIndex}
              completedSteps={execution?.steps.filter(s => s.status === 'completed')}
            />
          </div>
          
          {/* Center Panel: Execution */}
          <div className="execution-panel">
            <h3>Ejecución en Vivo</h3>
            <ExecutionPanel
              execution={execution}
              logs={logs}
              onPause={() => pauseExecution(id)}
              onCancel={() => cancelExecution(id)}
              onRetry={() => retryStep(id)}
            />
          </div>
          
          {/* Right Panel: Context */}
          <div className="context-panel">
            <h3>Contexto</h3>
            <ContextPanel
              variables={execution?.variables}
              memory={execution?.memory}
              errors={execution?.errors}
            />
          </div>
        </div>
        
        {/* Controls */}
        <div className="execution-controls">
          <button onClick={() => pauseExecution(id)}>
            <PauseIcon /> Pausar
          </button>
          <button onClick={() => cancelExecution(id)}>
            <StopIcon /> Cancelar
          </button>
          <button onClick={() => retryStep(id)}>
            <RefreshIcon /> Reintentar
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
```

#### 4. Settings (`/settings`)

```typescript
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [apiConfig, setApiConfig] = useState<APIConfig>();
  const [models, setModels] = useState<Model[]>([]);
  
  useEffect(() => {
    fetchAPIConfig();
    fetchAvailableModels();
  }, []);
  
  return (
    <MainLayout>
      <div className="settings">
        <h1>Configuración</h1>
        
        <Tabs value={activeTab} onChange={setActiveTab}>
          {/* General Tab */}
          <TabContent value="general">
            <GeneralSettings />
          </TabContent>
          
          {/* API Tab */}
          <TabContent value="api">
            <div className="api-settings">
              <h3>Configuración de API</h3>
              
              <div className="api-form">
                <div className="form-group">
                  <label>API Key OpenCode Go</label>
                  <input
                    type="password"
                    value={apiConfig?.apiKey}
                    onChange={(e) => setApiConfig({
                      ...apiConfig,
                      apiKey: e.target.value
                    })}
                    placeholder="sk-..."
                  />
                  <button onClick={() => testConnection()}>
                    Probar Conexión
                  </button>
                </div>
                
                <div className="form-group">
                  <label>Modelo Actual</label>
                  <select
                    value={apiConfig?.selectedModel}
                    onChange={(e) => setApiConfig({
                      ...apiConfig,
                      selectedModel: e.target.value
                    })}
                  >
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - ${model.costInput}/${model.costOutput}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button onClick={() => saveAPIConfig()}>
                  Guardar Configuración
                </button>
              </div>
              
              {/* Model Comparison */}
              <ModelComparison models={models} />
            </div>
          </TabContent>
          
          {/* Parameters Tab */}
          <TabContent value="parameters">
            <ParametersSettings />
          </TabContent>
          
          {/* Security Tab */}
          <TabContent value="security">
            <SecuritySettings />
          </TabContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
```

### Componentes Clave

#### ExecutionPanel Component

```typescript
interface ExecutionPanelProps {
  execution: Execution;
  logs: LogEntry[];
  onPause: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function ExecutionPanel({
  execution,
  logs,
  onPause,
  onCancel,
  onRetry
}: ExecutionPanelProps) {
  const currentStep = execution.steps[execution.currentStepIndex];
  
  return (
    <div className="execution-panel">
      {/* Current Step Info */}
      <div className="current-step">
        <h4>{currentStep?.description}</h4>
        <div className="step-meta">
          <span className="tool">
            <ToolIcon tool={currentStep?.toolName} />
            {currentStep?.toolName}
          </span>
          <span className="status">
            <Spinner /> Ejecutando...
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="progress">
        <ProgressBar
          value={(execution.currentStepIndex / execution.plan.steps.length) * 100}
        />
        <span className="progress-text">
          Paso {execution.currentStepIndex + 1} de {execution.plan.steps.length}
        </span>
      </div>
      
      {/* Logs */}
      <div className="logs">
        <div className="logs-header">
          <h5>Logs en Tiempo Real</h5>
          <button onClick={() => downloadLogs()}>
            <DownloadIcon /> Descargar
          </button>
        </div>
        <div className="logs-content">
          {logs.map((log, i) => (
            <LogEntry key={i} log={log} />
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="controls">
        <Button onClick={onPause} variant="secondary">
          <PauseIcon /> Pausar
        </Button>
        <Button onClick={onCancel} variant="destructive">
          <StopIcon /> Cancelar
        </Button>
        <Button onClick={onRetry} variant="outline">
          <RefreshIcon /> Reintentar
        </Button>
      </div>
    </div>
  );
}
```

#### PlanVisualizer Component

```typescript
interface PlanVisualizerProps {
  plan: ExecutionPlan;
  currentStep: number;
  completedSteps: ExecutionStep[];
}

export function PlanVisualizer({
  plan,
  currentStep,
  completedSteps
}: PlanVisualizerProps) {
  return (
    <div className="plan-visualizer">
      <svg viewBox="0 0 200 600" className="plan-tree">
        {plan.steps.map((step, i) => (
          <g key={i} className={`step ${getStepStatus(i, currentStep, completedSteps)}`}>
            {/* Node */}
            <circle cx="100" cy={50 + i * 100} r="20" className="node" />
            
            {/* Label */}
            <text x="100" y={55 + i * 100} textAnchor="middle" className="label">
              {i + 1}
            </text>
            
            {/* Description */}
            <text x="130" y={50 + i * 100} className="description">
              {step.description}
            </text>
            
            {/* Connection to next */}
            {i < plan.steps.length - 1 && (
              <line
                x1="100"
                y1={70 + i * 100}
                x2="100"
                y2={30 + (i + 1) * 100}
                className="connection"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
```

### State Management (Zustand)

```typescript
// useAppStore.ts
interface AppState {
  // Usuario
  user: User | null;
  isAuthenticated: boolean;
  
  // Configuración
  apiConfig: APIConfig | null;
  availableModels: Model[];
  
  // Tareas
  currentTask: Task | null;
  tasks: Task[];
  
  // Ejecución
  execution: Execution | null;
  logs: LogEntry[];
  
  // UI
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // Acciones
  setUser: (user: User) => void;
  setAPIConfig: (config: APIConfig) => void;
  setCurrentTask: (task: Task) => void;
  addLog: (log: LogEntry) => void;
  setExecution: (execution: Execution) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  apiConfig: null,
  availableModels: [],
  currentTask: null,
  tasks: [],
  execution: null,
  logs: [],
  sidebarCollapsed: false,
  theme: 'light',
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAPIConfig: (config) => set({ apiConfig: config }),
  setCurrentTask: (task) => set({ currentTask: task }),
  addLog: (log) => set((state) => ({
    logs: [...state.logs, log]
  })),
  setExecution: (execution) => set({ execution }),
  toggleSidebar: () => set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed
  })),
  setTheme: (theme) => set({ theme }),
}));
```

### WebSocket Real-time Communication

```typescript
// useWebSocket.ts
export function useWebSocket() {
  const socket = useRef<Socket>();
  const { setExecution, addLog } = useAppStore();
  
  useEffect(() => {
    socket.current = io(API_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });
    
    // Escuchar eventos
    socket.current.on('execution:started', (execution) => {
      setExecution(execution);
    });
    
    socket.current.on('execution:step:started', (step) => {
      addLog({
        timestamp: new Date(),
        level: 'info',
        message: `Iniciando paso: ${step.description}`
      });
    });
    
    socket.current.on('execution:step:completed', (step) => {
      addLog({
        timestamp: new Date(),
        level: 'info',
        message: `Paso completado: ${step.description}`
      });
    });
    
    socket.current.on('execution:log', (log) => {
      addLog(log);
    });
    
    socket.current.on('execution:completed', (result) => {
      setExecution(result);
    });
    
    return () => {
      socket.current?.disconnect();
    };
  }, []);
  
  return socket.current;
}
```

---

## LAS 56 HERRAMIENTAS INTEGRADAS

### Categoría 1: Navegación Web (7 herramientas)

1. **Browser Navigation Tool**
   - Navegar a URLs
   - Parámetros: `url`, `timeout`, `waitFor`
   - Retorna: HTML, status code

2. **Screenshot Tool**
   - Capturar pantalla
   - Parámetros: `selector`, `fullPage`, `format`
   - Retorna: Imagen (PNG/JPG)

3. **PDF Generation Tool**
   - Generar PDF desde HTML
   - Parámetros: `html`, `options`
   - Retorna: PDF binario

4. **Web Extraction Tool**
   - Extraer datos de sitios web
   - Parámetros: `url`, `selector`, `format`
   - Retorna: Datos extraídos

5. **Cookie Management Tool**
   - Gestionar cookies
   - Parámetros: `action`, `name`, `value`
   - Retorna: Cookie data

6. **Network Interception Tool**
   - Interceptar requests/responses
   - Parámetros: `pattern`, `action`
   - Retorna: Intercepted data

7. **JavaScript Execution Tool**
   - Ejecutar JavaScript en página
   - Parámetros: `code`, `timeout`
   - Retorna: Resultado de ejecución

### Categoría 2: Ejecución de Código (5 herramientas)

8. **Python Execution Tool**
   - Ejecutar código Python
   - Parámetros: `code`, `timeout`, `libraries`
   - Retorna: Output, stderr

9. **Node.js Execution Tool**
   - Ejecutar código JavaScript/Node
   - Parámetros: `code`, `timeout`, `packages`
   - Retorna: Output, stderr

10. **Bash/Shell Execution Tool**
    - Ejecutar comandos shell
    - Parámetros: `command`, `timeout`, `cwd`
    - Retorna: Output, exit code

11. **SQL Execution Tool**
    - Ejecutar queries SQL
    - Parámetros: `query`, `database`, `params`
    - Retorna: Query results

12. **Docker Execution Tool**
    - Ejecutar containers Docker
    - Parámetros: `image`, `command`, `timeout`
    - Retorna: Container output

### Categoría 3: Operaciones de Archivos (5 herramientas)

13. **File Read Tool**
    - Leer archivos
    - Parámetros: `path`, `encoding`
    - Retorna: File content

14. **File Write Tool**
    - Escribir archivos
    - Parámetros: `path`, `content`, `encoding`
    - Retorna: Success/error

15. **Directory Operations Tool**
    - Operaciones de directorio
    - Parámetros: `action`, `path`, `recursive`
    - Retorna: Directory listing

16. **Compression Tool**
    - Comprimir/descomprimir
    - Parámetros: `action`, `input`, `format`
    - Retorna: Compressed file

17. **File Hashing Tool**
    - Calcular hash de archivos
    - Parámetros: `path`, `algorithm`
    - Retorna: Hash value

### Categoría 4: Generación de Contenido (5 herramientas)

18. **Image Generation Tool**
    - Generar imágenes con IA
    - Parámetros: `prompt`, `style`, `size`
    - Retorna: Image URL

19. **Video Generation Tool**
    - Generar videos
    - Parámetros: `prompt`, `duration`, `style`
    - Retorna: Video URL

20. **Audio Generation Tool**
    - Generar audio/voz
    - Parámetros: `text`, `voice`, `language`
    - Retorna: Audio URL

21. **Document Generation Tool**
    - Generar documentos
    - Parámetros: `template`, `data`, `format`
    - Retorna: Document file

22. **Code Generation Tool**
    - Generar código
    - Parámetros: `description`, `language`, `style`
    - Retorna: Generated code

### Categoría 5: Procesamiento de Medios (3 herramientas)

23. **Image Processing Tool**
    - Procesar imágenes
    - Parámetros: `image`, `operation`, `params`
    - Retorna: Processed image

24. **Video Processing Tool**
    - Procesar videos
    - Parámetros: `video`, `operation`, `params`
    - Retorna: Processed video

25. **Audio Processing Tool**
    - Procesar audio
    - Parámetros: `audio`, `operation`, `params`
    - Retorna: Processed audio

### Categoría 6: Integración de APIs (4 herramientas)

26. **HTTP Client Tool**
    - Hacer requests HTTP
    - Parámetros: `method`, `url`, `headers`, `body`
    - Retorna: Response

27. **GraphQL Client Tool**
    - Ejecutar queries GraphQL
    - Parámetros: `endpoint`, `query`, `variables`
    - Retorna: Query result

28. **REST API Client Tool**
    - Cliente REST genérico
    - Parámetros: `endpoint`, `method`, `params`
    - Retorna: API response

29. **Webhook Management Tool**
    - Gestionar webhooks
    - Parámetros: `action`, `url`, `events`
    - Retorna: Webhook data

### Categoría 7: Base de Datos (3 herramientas)

30. **SQL Database Tool**
    - Operaciones SQL
    - Parámetros: `query`, `database`
    - Retorna: Query results

31. **MongoDB Tool**
    - Operaciones MongoDB
    - Parámetros: `collection`, `operation`, `query`
    - Retorna: Query results

32. **Redis Tool**
    - Operaciones Redis
    - Parámetros: `key`, `operation`, `value`
    - Retorna: Redis response

### Categoría 8: Sistema (3 herramientas)

33. **System Information Tool**
    - Obtener info del sistema
    - Parámetros: `type`
    - Retorna: System info

34. **Environment Variables Tool**
    - Gestionar variables de entorno
    - Parámetros: `action`, `name`, `value`
    - Retorna: Env var value

35. **Process Management Tool**
    - Gestionar procesos
    - Parámetros: `action`, `pid`, `signal`
    - Retorna: Process info

### Categoría 9: Automatización (3 herramientas)

36. **Task Scheduler Tool**
    - Programar tareas
    - Parámetros: `schedule`, `task`, `params`
    - Retorna: Scheduled task ID

37. **Workflow Automation Tool**
    - Automatizar flujos
    - Parámetros: `workflow`, `trigger`, `actions`
    - Retorna: Workflow result

38. **Notifications Tool**
    - Enviar notificaciones
    - Parámetros: `type`, `recipient`, `message`
    - Retorna: Notification status

### Categoría 10: Análisis y Visualización (3 herramientas)

39. **Data Analysis Tool**
    - Analizar datos
    - Parámetros: `data`, `analysis_type`
    - Retorna: Analysis result

40. **Visualization Tool**
    - Crear visualizaciones
    - Parámetros: `data`, `chart_type`, `options`
    - Retorna: Chart image/HTML

41. **Report Generation Tool**
    - Generar reportes
    - Parámetros: `data`, `template`, `format`
    - Retorna: Report file

### Categoría 11: Comunicación (2 herramientas)

42. **Email Tool**
    - Enviar emails
    - Parámetros: `to`, `subject`, `body`, `attachments`
    - Retorna: Email status

43. **Chat/Messaging Tool**
    - Enviar mensajes (Slack, Discord, Telegram, WhatsApp)
    - Parámetros: `platform`, `channel`, `message`
    - Retorna: Message status

### Categoría 12: Autenticación (1 herramienta)

44. **Authentication Tool**
    - Autenticar usuarios
    - Parámetros: `provider`, `credentials`
    - Retorna: Auth token

### Categoría 13: Búsqueda (2 herramientas)

45. **Web Search Tool**
    - Buscar en internet
    - Parámetros: `query`, `limit`, `language`
    - Retorna: Search results

46. **Web Scraping Tool**
    - Scraping de sitios web
    - Parámetros: `url`, `selectors`, `depth`
    - Retorna: Scraped data

### Categoría 14: Procesamiento de Documentos (2 herramientas)

47. **Document Parsing Tool**
    - Parsear documentos
    - Parámetros: `file`, `format`, `options`
    - Retorna: Parsed content

48. **Format Conversion Tool**
    - Convertir formatos
    - Parámetros: `input`, `from_format`, `to_format`
    - Retorna: Converted file

### Categoría 15: Versionamiento (1 herramienta)

49. **Git Tool**
    - Operaciones Git
    - Parámetros: `action`, `repo`, `params`
    - Retorna: Git result

### Herramientas Adicionales (7 más)

50. **Project Management Tool** - Gestionar proyectos
51. **Serialization Tool** - Serializar datos (JSON, XML, YAML, CSV)
52. **Caching Tool** - Gestionar caché
53. **Logging Tool** - Logging avanzado
54. **Monitoring Tool** - Monitoreo de recursos
55. **Testing Tool** - Ejecutar tests
56. **Deployment Tool** - Desplegar aplicaciones

---

## FLUJOS DE USUARIO

### Flujo 1: Onboarding Completo

```
1. Usuario accede a landing page
2. Hace clic en "Comenzar"
3. Registra cuenta (email + contraseña)
4. Verifica email
5. Inicia sesión
6. Wizard de configuración:
   a. Bienvenida
   b. Ingresa API key de OpenCode Go
   c. Prueba conexión
   d. Selecciona modelo inicial
   e. Configura parámetros (opcional)
7. Dashboard inicial
8. Puede crear primera tarea
```

### Flujo 2: Crear y Ejecutar Tarea

```
1. Usuario en dashboard
2. Hace clic en "Nueva Tarea"
3. Modal se abre:
   - Nombre de tarea
   - Descripción
   - Objetivo (textarea)
   - Restricciones (opcional)
   - Herramientas (opcional)
4. Hace clic en "Crear"
5. Sistema valida
6. Agente Planificador crea plan
7. Agente Ejecutor comienza ejecución
8. Frontend muestra ejecución en tiempo real:
   - Plan a la izquierda
   - Ejecución al centro
   - Contexto a la derecha
9. Logs en tiempo real
10. Paso a paso se completa
11. Resultado final
12. Opciones: Descargar, Compartir, Repetir
```

### Flujo 3: Cambiar Modelo

```
1. Usuario en Settings > API
2. Selecciona nuevo modelo del dropdown
3. Hace clic en "Cambiar Modelo"
4. Sistema valida
5. Modelo se actualiza
6. Próximas tareas usan nuevo modelo
```

### Flujo 4: Ver Historial

```
1. Usuario hace clic en "Historial"
2. Ve tabla de tareas pasadas
3. Puede filtrar por:
   - Nombre
   - Estado
   - Fecha
   - Duración
4. Hace clic en tarea
5. Ve detalles completos
6. Opciones: Repetir, Descargar, Compartir
```

### Flujo 5: Generar Reporte

```
1. Usuario hace clic en "Reportes"
2. Selecciona rango de fechas
3. Aplica filtros
4. Ve gráficos y estadísticas
5. Puede exportar como:
   - PDF
   - Excel
   - CSV
   - JSON
```

---

## SISTEMA DE CONFIGURACIÓN

### Configuración Inicial

```typescript
interface InitialConfig {
  apiKey: string;              // API key de OpenCode Go
  selectedModel: string;       // Modelo inicial
  temperature?: number;        // 0.0 - 2.0
  maxTokens?: number;          // Máximo de tokens
  topP?: number;               // 0.0 - 1.0
  frequencyPenalty?: number;   // -2.0 - 2.0
  presencePenalty?: number;    // -2.0 - 2.0
}
```

### Configuración de Parámetros

```typescript
interface ModelParameters {
  temperature: number;         // Creatividad (0=determinista, 2=creativo)
  maxTokens: number;          // Máximo de tokens en respuesta
  topP: number;               // Nucleus sampling
  frequencyPenalty: number;   // Penalizar tokens frecuentes
  presencePenalty: number;    // Penalizar tokens presentes
  stopSequences?: string[];   // Secuencias de parada
}
```

### Validación de API Key

```typescript
async function validateAPIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://opencode.ai/zen/go/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## AGENTES ESPECIALIZADOS

### 1. Agente Planificador

**Responsabilidad:** Descomponer objetivo en pasos ejecutables

**Prompt del Sistema:**
```
Eres un planificador experto de tareas. Tu trabajo es:
1. Analizar el objetivo del usuario
2. Descomponerlo en pasos claros y ejecutables
3. Identificar dependencias entre pasos
4. Seleccionar herramientas apropiadas para cada paso
5. Estimar tiempo y recursos

Retorna siempre un JSON con estructura:
{
  "steps": [
    {
      "number": 1,
      "description": "...",
      "tool": "...",
      "parameters": {...},
      "dependencies": [...],
      "estimatedTime": 30
    }
  ],
  "totalEstimatedTime": 120,
  "riskFactors": [...]
}
```

### 2. Agente Ejecutor

**Responsabilidad:** Ejecutar cada paso del plan

**Proceso:**
1. Obtiene contexto actual
2. Ejecuta herramienta
3. Valida resultado
4. Actualiza memoria
5. Emite logs
6. Pasa al siguiente paso

### 3. Agente Verificador

**Responsabilidad:** Validar resultados y manejar errores

**Proceso:**
1. Valida resultado de paso
2. Si error: Analiza y decide si reintentar
3. Si éxito: Continúa
4. Si crítico: Detiene ejecución

---

## SISTEMA DE MEMORIA

### Working Memory
- Información actual de ejecución
- Variables locales
- Contexto del paso actual
- Duración: Mientras se ejecuta la tarea

### Episodic Memory
- Historial de tareas ejecutadas
- Resultados de pasos anteriores
- Errores y soluciones
- Duración: Permanente (en DB)

### Semantic Memory
- Patrones aprendidos
- Mejores prácticas
- Relaciones entre conceptos
- Duración: Permanente (en DB)

---

## LOGGING Y MONITOREO

### Niveles de Log

```
DEBUG   - Información de depuración
INFO    - Información general
WARN    - Advertencias
ERROR   - Errores
FATAL   - Errores críticos
```

### Métricas Monitoreadas

```
- Tiempo de ejecución por paso
- Tokens utilizados
- Costo estimado
- Errores y reintentos
- Tasa de éxito
- Modelos más utilizados
- Herramientas más utilizadas
```

---

## SEGURIDAD

### Encriptación

```typescript
// Encriptar API key
const encrypted = encrypt(apiKey, MASTER_KEY);
// Guardar en DB: encrypted

// Desencriptar cuando se necesita
const decrypted = decrypt(encrypted, MASTER_KEY);
```

### Autenticación

```
- JWT tokens
- Refresh tokens
- 2FA opcional
- Session management
```

### Validación

```
- Validar entrada de usuario
- Sanitizar comandos
- Rate limiting
- CORS
```

---

## ROADMAP DE DESARROLLO

### Fase 1: Configuración Base (Semanas 1-2)
- [ ] Setup proyecto backend (Node.js + Express)
- [ ] Setup proyecto frontend (React + Vite)
- [ ] Configurar base de datos (PostgreSQL)
- [ ] Configurar Redis
- [ ] Autenticación básica

### Fase 2: Adapter OpenCode Go (Semanas 3-4)
- [ ] Implementar OpenCodeGoAdapter
- [ ] Integrar 13 modelos
- [ ] Validación de API key
- [ ] Fetch de modelos disponibles
- [ ] Testing de conexión

### Fase 3: Agentes (Semanas 5-6)
- [ ] Agente Planificador
- [ ] Agente Ejecutor
- [ ] Agente Verificador
- [ ] Sistema de memoria
- [ ] Manejo de errores

### Fase 4: Herramientas (Semanas 7-8)
- [ ] Implementar 56 herramientas
- [ ] Registry de herramientas
- [ ] Validación de parámetros
- [ ] Testing de herramientas

### Fase 5: API REST (Semanas 9-10)
- [ ] Endpoints de autenticación
- [ ] Endpoints de tareas
- [ ] Endpoints de ejecución
- [ ] Endpoints de configuración
- [ ] Endpoints de historial

### Fase 6: Frontend (Semanas 11-12)
- [ ] Landing page
- [ ] Dashboard
- [ ] Página de ejecución
- [ ] Página de historial
- [ ] Página de reportes
- [ ] Página de configuración
- [ ] WebSocket real-time

### Fase 7: Testing y Seguridad (Semanas 13-14)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security audit
- [ ] Performance testing

### Fase 8: Deployment (Semanas 15-16)
- [ ] Configurar CI/CD
- [ ] Deployment a producción
- [ ] Monitoreo
- [ ] Documentación
- [ ] Soporte

---

## STACK TECNOLÓGICO

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL 15+
- **Cache:** Redis 7+
- **ORM:** Prisma
- **Validación:** Zod
- **Autenticación:** JWT + Bcrypt
- **WebSocket:** Socket.io
- **Testing:** Jest + Supertest
- **Logging:** Winston
- **Monitoring:** Prometheus + Grafana

### Frontend
- **Framework:** React 19
- **Lenguaje:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Animations:** Framer Motion
- **HTTP Client:** Axios
- **WebSocket:** Socket.io-client
- **Testing:** Vitest + React Testing Library

### DevOps
- **Containerización:** Docker
- **Orquestación:** Docker Compose
- **CI/CD:** GitHub Actions
- **Hosting:** AWS/GCP/Azure
- **Monitoring:** Datadog/New Relic
- **Logging:** ELK Stack

### Herramientas Externas
- **OpenCode Go API:** https://opencode.ai/zen/go/v1
- **Playwright:** Para browser automation
- **Puppeteer:** Alternativa para browser automation

---

## CONCLUSIÓN

Este prompt exhaustivo incluye:

✅ **Backend Completo**
- Arquitectura de 4 capas
- 3 agentes especializados
- Sistema de memoria
- 56 herramientas integradas
- API REST completa
- WebSocket para tiempo real
- Seguridad y encriptación

✅ **Frontend Moderno**
- 8 páginas principales
- 20+ componentes
- Diseño responsivo
- Animaciones fluidas
- Estado global (Zustand)
- Comunicación en tiempo real

✅ **OpenCode Go Integration**
- 13 modelos soportados
- Validación de API key
- Fetch dinámico de modelos
- Parámetros configurables

✅ **Roadmap Claro**
- 8 fases de desarrollo
- 16 semanas de timeline
- Tareas específicas
- Entregables claros

**Este documento es tu blueprint completo para construir un agente de IA profesional y funcional.**

---

## CÓMO USAR ESTE PROMPT

1. **Copia todo el contenido** de este documento
2. **Pégalo en tu IA favorita** (ChatGPT, Claude, Gemini, etc.)
3. **Añade tu pregunta:** "Basándote en este prompt exhaustivo, crea un plan de acción detallado para construir este agente de IA"
4. **La IA generará:** Plan técnico, tareas específicas, timeline, recursos necesarios
5. **Comienza la construcción** con todo documentado

---

**Versión:** 1.0
**Última actualización:** Junio 26, 2026
**Estado:** Listo para producción
