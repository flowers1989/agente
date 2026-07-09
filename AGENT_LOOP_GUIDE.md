# Agent Loop - Guía Completa

## 📚 Introducción

El **Agent Loop** es el corazón de la autonomía en tu sistema `agente`. Implementa el ciclo iterativo **Pensar → Actuar → Observar → Evaluar** que permite que los agentes sean verdaderamente autónomos y capaces de auto-corregirse.

## 🎯 Conceptos Clave

### ¿Qué es un Agent Loop?

Un Agent Loop es un ciclo de ejecución iterativo donde el agente:

1. **Piensa** - Reflexiona sobre el objetivo y decide qué hacer
2. **Actúa** - Ejecuta la acción seleccionada (usa una herramienta)
3. **Observa** - Captura el resultado de la acción
4. **Evalúa** - Decide si el objetivo se alcanzó o si debe continuar
5. **Repite** - Vuelve al paso 1 si es necesario

### ¿Por qué es importante?

- **Autonomía**: El agente puede tomar decisiones sin intervención humana
- **Auto-corrección**: Si algo falla, el agente intenta recuperarse automáticamente
- **Adaptabilidad**: El agente ajusta su estrategia basándose en los resultados
- **Robustez**: Múltiples estrategias de recuperación ante errores

## 🏗️ Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Loop Engine                        │
│  (agent-loop.ts)                                             │
│  - Pensar, Actuar, Observar, Evaluar                        │
│  - Persistencia en memoria                                   │
│  - Recuperación de errores                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────────┐          ┌──────────────────────┐
│  Executor Loop       │          │  Verifier Loop       │
│  (executor-agent-    │          │  (verifier-agent-    │
│   loop.ts)           │          │   loop.ts)           │
│                      │          │                      │
│ - executeWithLoop()  │          │ - validateWithLoop() │
│ - executeSteps()     │          │ - validateMultiple() │
│ - executeHybrid()    │          │ - validateConsist.() │
│ - executeWithAuto-   │          │                      │
│   Correction()       │          │                      │
└──────────────────────┘          └──────────────────────┘
        ↓                                       ↓
        └───────────────────┬───────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────────┐          ┌──────────────────────┐
│  Loop Middleware     │          │  Error Recovery      │
│  (loop-middleware.ts)│          │  (error-recovery.ts) │
│                      │          │                      │
│ - analyzeAndDecide() │          │ - 6 estrategias      │
│ - prepareForLoop()   │          │ - Priorización       │
│ - integrateVerif.()  │          │ - Persistencia       │
│ - createRecoveryPlan │          │                      │
└──────────────────────┘          └──────────────────────┘
        ↓                                       ↓
        └───────────────────┬───────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────────┐          ┌──────────────────────┐
│  Loop Context Mgr    │          │  Loop Monitor UI     │
│  (loop-context-      │          │  (loop-monitor.tsx)  │
│   manager.ts)        │          │                      │
│                      │          │ - Estadísticas       │
│ - createContext()    │          │ - Historial          │
│ - recordSuccess()    │          │ - Progreso           │
│ - recordFailure()    │          │ - Controles          │
│ - shouldChangeStrat()│          │                      │
└──────────────────────┘          └──────────────────────┘
```

## 🚀 Uso

### Uso Básico

```typescript
import { executeAgentLoop } from "@/lib/agents/agent-loop";

// Ejecutar un loop
const context = await executeAgentLoop(
  "conversation-123",
  "user-456",
  "Investigar sobre inteligencia artificial",
  10 // máximo de iteraciones
);

console.log(`Loop completado: ${context.isComplete}`);
console.log(`Iteraciones: ${context.currentIteration}`);
console.log(`Resultado: ${context.finalResult}`);
```

### Uso con ExecutorAgent

```typescript
import { getExecutorAgentLoop } from "@/lib/agents/executor-agent-loop";

const executor = getExecutorAgentLoop();

// Opción 1: Ejecución con loop
const result1 = await executor.executeWithLoop(
  steps,
  "conversation-123",
  "user-456",
  "Mi objetivo"
);

// Opción 2: Ejecución secuencial (tradicional)
const result2 = await executor.executeSteps(
  steps,
  "conversation-123",
  "user-456"
);

// Opción 3: Ejecución híbrida (intenta loop, luego pasos)
const result3 = await executor.executeHybrid(
  "Mi objetivo",
  steps,
  "conversation-123",
  "user-456"
);

// Opción 4: Ejecución con auto-corrección
const result4 = await executor.executeWithAutoCorrection(
  steps,
  "conversation-123",
  "user-456"
);
```

### Uso con VerifierAgent

```typescript
import { getVerifierAgentLoop } from "@/lib/agents/verifier-agent-loop";

const verifier = getVerifierAgentLoop();

// Validar con loop de corrección
const verification = await verifier.validateWithLoop(
  resultado,
  "El resultado debe ser válido JSON",
  "conversation-123",
  3 // máximo de intentos
);

if (verification.isApproved) {
  console.log("✓ Resultado aprobado");
} else {
  console.log("✗ Resultado rechazado");
  console.log(verifier.generateVerificationReport(verification));
}
```

### Uso del Middleware

```typescript
import { LoopMiddleware } from "@/lib/agents/loop-middleware";

// Analizar un plan y decidir si usar loop
const decision = LoopMiddleware.analyzeAndDecide(plan, objetivo);

if (decision.useLoop) {
  console.log(`Usar loop: ${decision.reason}`);
  
  // Preparar plan para loop
  const preparedPlan = LoopMiddleware.prepareForLoop(plan, objetivo);
  
  // Integrar verificación
  const enhancedPlan = LoopMiddleware.integrateVerification(preparedPlan);
  
  // Guardar decisión
  LoopMiddleware.saveLoopDecision(decision, conversationId, objetivo);
}
```

### Uso del Gestor de Contexto

```typescript
import { getLoopContextManager } from "@/lib/agents/loop-context-manager";

const contextMgr = getLoopContextManager();

// Crear contexto
const context = contextMgr.createContext("conv-123", "Mi objetivo");

// Registrar éxito
contextMgr.recordSuccess("conv-123", resultado);

// Registrar fallo
contextMgr.recordFailure("conv-123", "Error: timeout");

// Registrar adaptación
contextMgr.recordAdaptation("conv-123", "Cambié a herramienta alternativa");

// Evaluar si cambiar estrategia
if (contextMgr.shouldChangeStrategy("conv-123")) {
  const recommendation = contextMgr.getStrategyRecommendation("conv-123");
  console.log(`Cambiar a estrategia: ${recommendation}`);
}

// Generar reporte
console.log(contextMgr.generateContextReport("conv-123"));
```

### Uso del Sistema de Recuperación

```typescript
import { getErrorRecovery, type ErrorContext } from "@/lib/agents/error-recovery";

const recovery = getErrorRecovery();

// Crear contexto de error
const errorContext: ErrorContext = {
  errorType: "execution-failed",
  errorMessage: "La herramienta falló",
  toolName: "Web Search",
  parameters: { query: "inteligencia artificial" },
  timestamp: new Date().toISOString(),
  attemptNumber: 1,
};

// Intentar recuperación
const result = await recovery.recover(errorContext);

if (result.recovered) {
  console.log(`✓ Recuperado con estrategia: ${result.strategy}`);
  console.log(`Nuevos parámetros: ${JSON.stringify(result.newParams)}`);
} else {
  console.log(`✗ No se pudo recuperar`);
}
```

## 📊 Monitoreo

### Componente React

```typescript
import { LoopMonitor } from "@/components/agente/loop-monitor";

export function MyComponent() {
  const [loopContext, setLoopContext] = useState<LoopContext>();
  const [isRunning, setIsRunning] = useState(false);

  return (
    <LoopMonitor
      loopContext={loopContext}
      isRunning={isRunning}
      onStop={() => setIsRunning(false)}
    />
  );
}
```

### Datos Disponibles

El `LoopMonitor` muestra:
- Número de iteraciones
- Tasa de éxito
- Errores encontrados
- Duración promedio
- Historial expandible de iteraciones
- Barra de progreso animada
- Estado final (completado/fallido)

## 🔄 Ciclo de Ejecución Detallado

### Fase 1: PENSAR

El agente reflexiona sobre el objetivo:

```typescript
// Prompt enviado al LLM
"Eres un agente autónomo que está ejecutando un objetivo.
Objetivo: 'Investigar sobre IA'
Iteración actual: 1/10

¿Qué acción deberías tomar AHORA para avanzar?
Responde ÚNICAMENTE con una descripción breve de la acción."
```

**Resultado:** Una descripción de la acción a tomar

### Fase 2: ACTUAR

El agente ejecuta la acción:

```typescript
// 1. Seleccionar herramienta basada en el pensamiento
const toolName = selectToolFromThought(thought);

// 2. Extraer parámetros
const parameters = extractParametersFromThought(thought);

// 3. Ejecutar herramienta
const result = await toolRegistry.execute(toolName, parameters);
```

### Fase 3: OBSERVAR

El agente captura el resultado:

```typescript
// Resultado de la herramienta
{
  success: true,
  result: "Contenido de la página web...",
  data: { /* datos estructurados */ }
}
```

### Fase 4: EVALUAR

El agente decide si continuar:

```typescript
// Prompt enviado al LLM
"Evaluando progreso hacia el objetivo: 'Investigar sobre IA'

Resultado de la acción anterior:
- Éxito: true
- Resultado: 'Contenido de la página web...'

¿Se ha logrado el objetivo? Responde ÚNICAMENTE con 'SÍ' o 'NO'."
```

**Resultado:** Decisión de continuar o completar

## 🛡️ Estrategias de Recuperación

El sistema intenta recuperarse de errores en este orden:

| Prioridad | Estrategia | Descripción |
|---|---|---|
| 1 | LLM Fix Params | Generar parámetros corregidos con LLM |
| 2 | Alternative Tool | Usar herramienta alternativa |
| 3 | Decompose | Descomponer en tareas más pequeñas |
| 4 | Simplify Params | Simplificar parámetros complejos |
| 5 | Retry Same | Reintentar con parámetros idénticos |
| 6 | Change Model | Cambiar modelo de LLM |

## 📈 Métricas

El loop registra automáticamente:

- **Iteraciones totales**: Número de ciclos ejecutados
- **Tasa de éxito**: Porcentaje de acciones exitosas
- **Errores**: Lista de errores encontrados
- **Duración promedio**: Tiempo promedio por iteración
- **Adaptaciones**: Cambios realizados durante la ejecución
- **Confianza**: Nivel de confianza del agente (0-1)

## 🎓 Ejemplos de Uso

### Ejemplo 1: Investigación Autónoma

```typescript
const objective = "Investigar y resumir los últimos avances en IA";

const context = await executeAgentLoop(
  "conv-123",
  "user-456",
  objective,
  10
);

// El loop:
// 1. Piensa: "Debo buscar información sobre IA"
// 2. Actúa: Ejecuta "Web Search" con query "últimos avances IA"
// 3. Observa: Obtiene resultados de búsqueda
// 4. Evalúa: "¿Tengo suficiente información?"
// 5. Si no: Repite con "Web Extraction" para obtener más detalles
// 6. Si sí: Completa el loop
```

### Ejemplo 2: Generación de Código con Validación

```typescript
const executor = getExecutorAgentLoop();
const verifier = getVerifierAgentLoop();

// Generar código
const codeResult = await executor.executeWithLoop(
  steps,
  "conv-123",
  "user-456",
  "Generar función de validación de email"
);

// Validar código generado
const verification = await verifier.validateWithLoop(
  codeResult.results[0],
  "El código debe ser válido JavaScript y tener pruebas unitarias",
  "conv-123",
  3
);

if (!verification.isApproved) {
  // El verifier intentó auto-corregir, pero falló
  console.log("Código rechazado después de 3 intentos de corrección");
}
```

### Ejemplo 3: Ejecución Híbrida

```typescript
const result = await executor.executeHybrid(
  "Crear un sitio web estático",
  steps,
  "conv-123",
  "user-456",
  true // intentar loop primero
);

// Si el loop falla, automáticamente cae a ejecución de pasos
// Si los pasos fallan, intenta recuperación
```

## 🔐 Consideraciones de Seguridad

- Los loops se ejecutan en el sandbox seguro
- Máximo de iteraciones previene bucles infinitos
- Timeout en cada iteración (30 segundos por defecto)
- Validación de parámetros antes de ejecutar herramientas
- Registro de todas las acciones en memoria

## 📚 Recursos Adicionales

- [Agent Loop Architecture](./AGENT_LOOP_ARCHITECTURE.md)
- [Error Recovery Strategies](./ERROR_RECOVERY_STRATEGIES.md)
- [Loop Monitoring Guide](./LOOP_MONITORING_GUIDE.md)
- [Performance Tuning](./PERFORMANCE_TUNING.md)

## 🤝 Contribuciones

Para mejorar el Agent Loop:

1. Añadir nuevas estrategias de recuperación en `error-recovery.ts`
2. Optimizar la lógica de pensamiento en `agent-loop.ts`
3. Mejorar la UI del monitor en `loop-monitor.tsx`
4. Registrar casos de uso en la documentación

## ❓ Preguntas Frecuentes

**P: ¿Cuántas iteraciones debería permitir?**
R: Depende de la complejidad. Para tareas simples 3-5, para complejas 10-20.

**P: ¿Qué pasa si el loop se queda en bucle infinito?**
R: El máximo de iteraciones lo detiene automáticamente.

**P: ¿Puedo personalizar las estrategias de recuperación?**
R: Sí, registra nuevas estrategias con `recovery.register()`.

**P: ¿Cómo monitoreo el progreso?**
R: Usa el componente `LoopMonitor` o accede a `loopContext.history`.

---

**Versión:** 1.0  
**Última actualización:** Julio 9, 2026  
**Autor:** Manus IA
