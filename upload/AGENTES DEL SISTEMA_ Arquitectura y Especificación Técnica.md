# AGENTES DEL SISTEMA: Arquitectura y Especificación Técnica

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Agentes](#arquitectura-de-agentes)
3. [Los 7 Agentes Principales](#los-7-agentes-principales)
4. [Selección de Modelos OpenCode Go](#selección-de-modelos-opencode-go)
5. [Flujo de Comunicación Entre Agentes](#flujo-de-comunicación-entre-agentes)
6. [Implementación Técnica](#implementación-técnica)
7. [Ejemplos de Ejecución](#ejemplos-de-ejecución)

---

## VISIÓN GENERAL

El sistema de agentes funciona como un **equipo de especialistas** donde cada agente tiene una responsabilidad específica. Los agentes se comunican entre sí, comparten información a través de la memoria compartida, y coordinan sus acciones para completar tareas complejas.

### Principios de Diseño

✅ **Separación de Responsabilidades** - Cada agente hace una cosa bien
✅ **Comunicación Asincrónica** - Los agentes no se bloquean entre sí
✅ **Memoria Compartida** - Acceso a contexto común
✅ **Escalabilidad** - Fácil añadir nuevos agentes
✅ **Resiliencia** - Si un agente falla, otros continúan
✅ **Optimización de Costos** - Cada agente usa el modelo más eficiente

---

## ARQUITECTURA DE AGENTES

### Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO / FRONTEND                       │
│                   (Ingresa objetivo)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE ANALIZADOR (1)                          │
│  • Analiza objetivo                                         │
│  • Extrae contexto                                          │
│  • Identifica restricciones                                 │
│  • Modelo: DeepSeek V4 Flash (rápido, económico)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE PLANIFICADOR (2)                        │
│  • Descompone en pasos                                      │
│  • Identifica dependencias                                  │
│  • Selecciona herramientas                                  │
│  • Modelo: Qwen3.7 Plus (razonamiento, planificación)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE EJECUTOR (3)                            │
│  • Ejecuta cada paso del plan                               │
│  • Selecciona herramientas                                  │
│  • Maneja parámetros                                        │
│  • Modelo: DeepSeek V4 Flash (velocidad)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE VERIFICADOR (4)                         │
│  • Valida resultados                                        │
│  • Detecta errores                                          │
│  • Decide si reintentar                                     │
│  • Modelo: GLM-5.2 (análisis profundo)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE OPTIMIZADOR (5)                         │
│  • Optimiza pasos                                           │
│  • Mejora rendimiento                                       │
│  • Reduce costos                                            │
│  • Modelo: MiniMax M3 (eficiencia)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE REPORTERO (6)                           │
│  • Formatea resultados                                      │
│  • Genera reportes                                          │
│  • Crea visualizaciones                                     │
│  • Modelo: Kimi K2.7 Code (generación de contenido)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENTE MONITOR (7)                             │
│  • Monitorea ejecución                                      │
│  • Registra logs                                            │
│  • Alertas en tiempo real                                   │
│  • Modelo: MiMo-V2.5 (procesamiento rápido)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  MEMORIA COMPARTIDA                         │
│  • Working Memory (contexto actual)                         │
│  • Episodic Memory (historial)                              │
│  • Semantic Memory (patrones)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## LOS 7 AGENTES PRINCIPALES

### AGENTE 1: ANALIZADOR

#### Responsabilidad
Analizar el objetivo del usuario y extraer información relevante.

#### Funciones Principales

```typescript
class AnalyzerAgent {
  async analyzeObjective(objective: string): Promise<Analysis> {
    // 1. Extraer entidades
    const entities = await this.extractEntities(objective);
    
    // 2. Identificar restricciones
    const constraints = await this.identifyConstraints(objective);
    
    // 3. Detectar contexto
    const context = await this.detectContext(objective);
    
    // 4. Evaluar complejidad
    const complexity = await this.evaluateComplexity(objective);
    
    // 5. Guardar en memoria
    await this.memory.store('analysis', {
      entities,
      constraints,
      context,
      complexity
    });
    
    return { entities, constraints, context, complexity };
  }
  
  private async extractEntities(objective: string): Promise<Entity[]> {
    // Extrae: personas, lugares, objetos, acciones
    const prompt = `
      Extrae todas las entidades del siguiente objetivo:
      "${objective}"
      
      Retorna JSON con:
      {
        "entities": [
          { "type": "person|place|object|action", "value": "..." }
        ]
      }
    `;
    
    return await this.llm.call(prompt);
  }
  
  private async identifyConstraints(objective: string): Promise<Constraint[]> {
    // Identifica restricciones: tiempo, recursos, acceso
    const prompt = `
      Identifica todas las restricciones en:
      "${objective}"
      
      Retorna JSON con:
      {
        "constraints": [
          { "type": "time|resource|access|other", "description": "..." }
        ]
      }
    `;
    
    return await this.llm.call(prompt);
  }
}
```

#### Entrada
```
Objetivo: "Necesito analizar los últimos 100 tweets de mi cuenta, 
extraer sentimientos, crear un gráfico y enviar un reporte por email"
```

#### Proceso
1. Extrae entidades: tweets, sentimientos, gráfico, email
2. Identifica restricciones: acceso a Twitter API, límite de 100 tweets
3. Detecta contexto: análisis de redes sociales
4. Evalúa complejidad: Media (múltiples pasos)

#### Salida
```json
{
  "entities": [
    { "type": "action", "value": "analizar tweets" },
    { "type": "action", "value": "extraer sentimientos" },
    { "type": "action", "value": "crear gráfico" },
    { "type": "action", "value": "enviar email" }
  ],
  "constraints": [
    { "type": "resource", "description": "100 tweets máximo" },
    { "type": "access", "description": "Requiere API de Twitter" }
  ],
  "context": "análisis de redes sociales",
  "complexity": "medium"
}
```

#### Modelo OpenCode Go Ideal
**DeepSeek V4 Flash** ⭐⭐⭐⭐⭐
- ✅ Muy rápido (análisis inicial)
- ✅ Económico ($0.14/$0.28)
- ✅ Excelente para extracción de información
- ✅ Contexto de 1.0M tokens
- ✅ Ideal para tareas de clasificación

---

### AGENTE 2: PLANIFICADOR

#### Responsabilidad
Descomponer el objetivo en un plan ejecutable con pasos claros.

#### Funciones Principales

```typescript
class PlannerAgent {
  async createPlan(analysis: Analysis): Promise<ExecutionPlan> {
    // 1. Generar pasos iniciales
    const steps = await this.generateSteps(analysis);
    
    // 2. Identificar dependencias
    const dependencies = await this.identifyDependencies(steps);
    
    // 3. Seleccionar herramientas
    const toolSelection = await this.selectTools(steps);
    
    // 4. Estimar recursos
    const estimates = await this.estimateResources(steps);
    
    // 5. Optimizar orden
    const optimizedPlan = await this.optimizeOrder(steps, dependencies);
    
    // 6. Guardar plan
    await this.memory.store('plan', optimizedPlan);
    
    return optimizedPlan;
  }
  
  private async generateSteps(analysis: Analysis): Promise<Step[]> {
    const prompt = `
      Basándote en este análisis:
      ${JSON.stringify(analysis)}
      
      Genera un plan detallado con pasos específicos.
      
      Retorna JSON con:
      {
        "steps": [
          {
            "number": 1,
            "description": "...",
            "expectedInput": "...",
            "expectedOutput": "...",
            "estimatedTime": 30
          }
        ]
      }
    `;
    
    return await this.llm.call(prompt);
  }
  
  private async selectTools(steps: Step[]): Promise<ToolSelection[]> {
    // Para cada paso, selecciona la herramienta más apropiada
    const toolSelections = [];
    
    for (const step of steps) {
      const prompt = `
        Para este paso: "${step.description}"
        
        ¿Qué herramienta de estas es la más apropiada?
        ${this.availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}
        
        Retorna JSON con:
        {
          "tool": "nombre_herramienta",
          "parameters": { ... },
          "reasoning": "..."
        }
      `;
      
      const selection = await this.llm.call(prompt);
      toolSelections.push(selection);
    }
    
    return toolSelections;
  }
}
```

#### Entrada
```json
{
  "analysis": {
    "entities": [...],
    "constraints": [...],
    "context": "análisis de redes sociales",
    "complexity": "medium"
  }
}
```

#### Proceso
1. Genera 5 pasos iniciales
2. Identifica que el paso 2 depende del paso 1
3. Selecciona herramientas para cada paso
4. Estima 2 horas totales
5. Optimiza el orden

#### Salida
```json
{
  "steps": [
    {
      "number": 1,
      "description": "Obtener últimos 100 tweets",
      "tool": "twitter_api",
      "parameters": { "count": 100, "format": "json" },
      "dependencies": [],
      "estimatedTime": 10
    },
    {
      "number": 2,
      "description": "Analizar sentimientos",
      "tool": "sentiment_analysis",
      "parameters": { "model": "bert", "language": "es" },
      "dependencies": [1],
      "estimatedTime": 30
    },
    {
      "number": 3,
      "description": "Crear gráfico",
      "tool": "visualization",
      "parameters": { "type": "bar_chart", "title": "Sentimientos" },
      "dependencies": [2],
      "estimatedTime": 5
    },
    {
      "number": 4,
      "description": "Generar reporte",
      "tool": "report_generation",
      "parameters": { "format": "pdf", "include_chart": true },
      "dependencies": [2, 3],
      "estimatedTime": 10
    },
    {
      "number": 5,
      "description": "Enviar por email",
      "tool": "email",
      "parameters": { "subject": "Análisis de Sentimientos", "attachment": "reporte.pdf" },
      "dependencies": [4],
      "estimatedTime": 5
    }
  ],
  "totalEstimatedTime": 60,
  "riskFactors": ["API rate limiting", "Análisis incorrecto"]
}
```

#### Modelo OpenCode Go Ideal
**Qwen3.7 Plus** ⭐⭐⭐⭐⭐
- ✅ Excelente razonamiento
- ✅ Especializado en planificación
- ✅ Contexto de 1.0M tokens
- ✅ Buen balance costo/calidad ($0.40/$1.60)
- ✅ Maneja dependencias complejas

**Alternativa:** GLM-5.2 (si necesitas máxima calidad)

---

### AGENTE 3: EJECUTOR

#### Responsabilidad
Ejecutar cada paso del plan, manejar herramientas y parámetros.

#### Funciones Principales

```typescript
class ExecutorAgent {
  async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const execution = {
      planId: plan.id,
      steps: [],
      startTime: new Date(),
      status: 'running'
    };
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      // 1. Obtener contexto
      const context = await this.memory.getContext(step.dependencies);
      
      // 2. Preparar parámetros
      const params = await this.prepareParameters(step, context);
      
      // 3. Ejecutar herramienta
      const result = await this.executeTool(step.tool, params);
      
      // 4. Guardar resultado
      execution.steps.push({
        stepNumber: i + 1,
        description: step.description,
        status: result.success ? 'completed' : 'failed',
        result: result.data,
        error: result.error,
        duration: result.duration
      });
      
      // 5. Actualizar memoria
      await this.memory.update(`step_${i + 1}_result`, result.data);
      
      // 6. Emitir evento
      this.emit('step:completed', { step: i + 1, result });
      
      if (!result.success) {
        // Notificar al Verificador
        const shouldRetry = await this.verifierAgent.shouldRetry(step, result);
        if (shouldRetry) {
          i--; // Reintentar este paso
        } else {
          execution.status = 'failed';
          break;
        }
      }
    }
    
    execution.endTime = new Date();
    execution.status = execution.steps.every(s => s.status === 'completed') 
      ? 'completed' 
      : 'failed';
    
    return execution;
  }
  
  private async executeTool(toolName: string, params: any): Promise<ToolResult> {
    const tool = this.toolRegistry.get(toolName);
    
    if (!tool) {
      return {
        success: false,
        error: `Herramienta no encontrada: ${toolName}`
      };
    }
    
    try {
      const startTime = Date.now();
      const result = await tool.execute(params);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
}
```

#### Entrada
```json
{
  "plan": {
    "steps": [
      {
        "number": 1,
        "description": "Obtener últimos 100 tweets",
        "tool": "twitter_api",
        "parameters": { "count": 100 }
      }
    ]
  }
}
```

#### Proceso
1. Obtiene contexto de pasos anteriores
2. Prepara parámetros para la herramienta
3. Ejecuta la herramienta
4. Maneja errores
5. Guarda resultado en memoria
6. Emite evento al frontend

#### Salida
```json
{
  "planId": "plan_123",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Obtener últimos 100 tweets",
      "status": "completed",
      "result": { "tweets": [...], "count": 100 },
      "duration": 2500
    }
  ],
  "status": "running"
}
```

#### Modelo OpenCode Go Ideal
**DeepSeek V4 Flash** ⭐⭐⭐⭐⭐
- ✅ Velocidad extrema (ejecución rápida)
- ✅ Muy económico ($0.14/$0.28)
- ✅ Ideal para tareas repetitivas
- ✅ Contexto de 1.0M tokens
- ✅ Excelente para manejo de parámetros

**Alternativa:** MiMo-V2.5 (aún más rápido)

---

### AGENTE 4: VERIFICADOR

#### Responsabilidad
Validar resultados, detectar errores y decidir si reintentar.

#### Funciones Principales

```typescript
class VerifierAgent {
  async verifyStep(step: ExecutionStep, result: any): Promise<VerificationResult> {
    // 1. Validar resultado
    const validation = await this.validateResult(step, result);
    
    if (!validation.isValid) {
      // 2. Analizar error
      const analysis = await this.analyzeError(step, result, validation.errors);
      
      // 3. Decidir acción
      const action = await this.decideAction(step, analysis);
      
      return {
        isValid: false,
        errors: validation.errors,
        analysis,
        action, // 'retry', 'skip', 'fail'
        recommendation: action.recommendation
      };
    }
    
    return { isValid: true };
  }
  
  private async validateResult(step: ExecutionStep, result: any): Promise<Validation> {
    const prompt = `
      Valida este resultado:
      
      Paso: ${step.description}
      Herramienta: ${step.tool}
      Resultado: ${JSON.stringify(result)}
      
      ¿Es válido? ¿Hay errores? ¿Falta información?
      
      Retorna JSON con:
      {
        "isValid": true|false,
        "errors": ["error1", "error2"],
        "severity": "low|medium|high|critical"
      }
    `;
    
    return await this.llm.call(prompt);
  }
  
  private async analyzeError(step: ExecutionStep, result: any, errors: string[]): Promise<ErrorAnalysis> {
    const prompt = `
      Analiza estos errores:
      
      Paso: ${step.description}
      Errores: ${errors.join(', ')}
      Resultado: ${JSON.stringify(result)}
      
      ¿Cuál es la causa raíz? ¿Se puede reintentar? ¿Necesita cambios?
      
      Retorna JSON con:
      {
        "rootCause": "...",
        "canRetry": true|false,
        "suggestedFix": "...",
        "likelihood": 0.0-1.0
      }
    `;
    
    return await this.llm.call(prompt);
  }
  
  async shouldRetry(step: ExecutionStep, result: any): Promise<boolean> {
    const verification = await this.verifyStep(step, result);
    
    if (!verification.isValid && verification.analysis.canRetry) {
      // Reintentar si la probabilidad de éxito es > 60%
      return verification.analysis.likelihood > 0.6;
    }
    
    return false;
  }
}
```

#### Entrada
```json
{
  "step": {
    "number": 1,
    "description": "Obtener últimos 100 tweets",
    "tool": "twitter_api"
  },
  "result": {
    "error": "Rate limit exceeded",
    "status": 429
  }
}
```

#### Proceso
1. Valida que el resultado sea correcto
2. Si hay error, analiza la causa
3. Decide si reintentar, saltar o fallar
4. Retorna recomendación

#### Salida
```json
{
  "isValid": false,
  "errors": ["Rate limit exceeded"],
  "analysis": {
    "rootCause": "Twitter API rate limit",
    "canRetry": true,
    "suggestedFix": "Esperar 15 minutos y reintentar",
    "likelihood": 0.85
  },
  "action": "retry",
  "recommendation": "Reintentar en 15 minutos"
}
```

#### Modelo OpenCode Go Ideal
**GLM-5.2** ⭐⭐⭐⭐⭐
- ✅ Análisis profundo y preciso
- ✅ Excelente para validación
- ✅ Contexto de 1.0M tokens
- ✅ Especializado en razonamiento complejo
- ✅ Ideal para tomar decisiones críticas

**Alternativa:** Qwen3.7 Max (máxima precisión)

---

### AGENTE 5: OPTIMIZADOR

#### Responsabilidad
Optimizar pasos, mejorar rendimiento y reducir costos.

#### Funciones Principales

```typescript
class OptimizerAgent {
  async optimizeExecution(execution: Execution): Promise<OptimizationSuggestions> {
    // 1. Analizar ejecución
    const analysis = await this.analyzeExecution(execution);
    
    // 2. Identificar cuellos de botella
    const bottlenecks = await this.identifyBottlenecks(analysis);
    
    // 3. Generar sugerencias
    const suggestions = await this.generateSuggestions(bottlenecks);
    
    // 4. Estimar ahorros
    const savings = await this.estimateSavings(suggestions);
    
    // 5. Guardar en memoria
    await this.memory.store('optimizations', suggestions);
    
    return { suggestions, savings };
  }
  
  private async analyzeExecution(execution: Execution): Promise<ExecutionAnalysis> {
    const prompt = `
      Analiza esta ejecución:
      
      ${JSON.stringify(execution)}
      
      Identifica:
      - Pasos lentos
      - Pasos costosos
      - Pasos innecesarios
      - Pasos que pueden paralelizarse
      
      Retorna JSON con análisis detallado.
    `;
    
    return await this.llm.call(prompt);
  }
  
  private async generateSuggestions(bottlenecks: Bottleneck[]): Promise<Suggestion[]> {
    const suggestions = [];
    
    for (const bottleneck of bottlenecks) {
      const prompt = `
        Para este cuello de botella:
        ${JSON.stringify(bottleneck)}
        
        Sugiere optimizaciones específicas que reduzcan tiempo/costo.
        
        Retorna JSON con:
        {
          "suggestions": [
            {
              "title": "...",
              "description": "...",
              "timeReduction": "30%",
              "costReduction": "20%",
              "implementation": "..."
            }
          ]
        }
      `;
      
      const result = await this.llm.call(prompt);
      suggestions.push(...result.suggestions);
    }
    
    return suggestions;
  }
}
```

#### Entrada
```json
{
  "execution": {
    "steps": [
      {
        "number": 1,
        "duration": 45000,
        "cost": 0.15
      },
      {
        "number": 2,
        "duration": 120000,
        "cost": 0.45
      }
    ]
  }
}
```

#### Proceso
1. Analiza cada paso
2. Identifica que el paso 2 es muy lento
3. Sugiere usar modelo más rápido
4. Estima ahorros

#### Salida
```json
{
  "suggestions": [
    {
      "title": "Usar modelo más rápido",
      "description": "Cambiar a DeepSeek V4 Flash",
      "timeReduction": "40%",
      "costReduction": "60%",
      "implementation": "Cambiar modelo en paso 2"
    }
  ],
  "savings": {
    "timeReduction": "48 segundos",
    "costReduction": "$0.27"
  }
}
```

#### Modelo OpenCode Go Ideal
**MiniMax M3** ⭐⭐⭐⭐⭐
- ✅ Excelente relación costo/calidad
- ✅ Rápido análisis
- ✅ Contexto de 1.0M tokens
- ✅ Ideal para optimizaciones
- ✅ Económico ($0.10/$0.40)

**Alternativa:** MiMo-V2.5 (aún más económico)

---

### AGENTE 6: REPORTERO

#### Responsabilidad
Formatear resultados, generar reportes y crear visualizaciones.

#### Funciones Principales

```typescript
class ReporterAgent {
  async generateReport(execution: Execution): Promise<Report> {
    // 1. Recopilar datos
    const data = await this.collectData(execution);
    
    // 2. Formatear resultados
    const formatted = await this.formatResults(data);
    
    // 3. Crear visualizaciones
    const visualizations = await this.createVisualizations(formatted);
    
    // 4. Generar documento
    const document = await this.generateDocument(formatted, visualizations);
    
    // 5. Guardar reporte
    await this.memory.store('report', document);
    
    return document;
  }
  
  private async formatResults(data: any): Promise<FormattedData> {
    const prompt = `
      Formatea estos resultados de forma clara y profesional:
      
      ${JSON.stringify(data)}
      
      Crea:
      - Resumen ejecutivo
      - Hallazgos principales
      - Recomendaciones
      - Métricas clave
      
      Retorna JSON con contenido formateado.
    `;
    
    return await this.llm.call(prompt);
  }
  
  private async createVisualizations(data: FormattedData): Promise<Visualization[]> {
    const visualizations = [];
    
    // Crear gráfico de resultados
    const chartPrompt = `
      Crea un gráfico que muestre:
      ${JSON.stringify(data.metrics)}
      
      Retorna JSON con:
      {
        "type": "bar|line|pie|scatter",
        "title": "...",
        "data": [...],
        "options": {...}
      }
    `;
    
    const chart = await this.llm.call(chartPrompt);
    visualizations.push(chart);
    
    return visualizations;
  }
  
  async generateDocument(formatted: FormattedData, visualizations: Visualization[]): Promise<Document> {
    const prompt = `
      Genera un documento profesional con:
      
      Contenido:
      ${JSON.stringify(formatted)}
      
      Visualizaciones:
      ${JSON.stringify(visualizations)}
      
      Retorna HTML/PDF con formato profesional.
    `;
    
    return await this.llm.call(prompt);
  }
}
```

#### Entrada
```json
{
  "execution": {
    "steps": [...],
    "results": [...],
    "metrics": { "success_rate": 100, "duration": 65000 }
  }
}
```

#### Proceso
1. Recopila todos los datos
2. Formatea de forma legible
3. Crea gráficos
4. Genera documento profesional

#### Salida
```json
{
  "title": "Análisis de Sentimientos - Twitter",
  "summary": "Se analizaron 100 tweets...",
  "findings": [
    "70% sentimiento positivo",
    "20% sentimiento neutral",
    "10% sentimiento negativo"
  ],
  "visualizations": [
    { "type": "pie", "title": "Distribución de Sentimientos", ... }
  ],
  "format": "pdf",
  "file": "reporte_20260626.pdf"
}
```

#### Modelo OpenCode Go Ideal
**Kimi K2.7 Code** ⭐⭐⭐⭐⭐
- ✅ Excelente generación de contenido
- ✅ Especializado en coding y documentación
- ✅ Contexto de 262K tokens
- ✅ Ideal para formateo profesional
- ✅ Buen costo ($0.95/$4.00)

**Alternativa:** GLM-5.2 (para máxima calidad)

---

### AGENTE 7: MONITOR

#### Responsabilidad
Monitorear ejecución, registrar logs y alertas en tiempo real.

#### Funciones Principales

```typescript
class MonitorAgent {
  async monitorExecution(execution: Execution): Promise<void> {
    // Monitoreo continuo durante la ejecución
    const interval = setInterval(async () => {
      // 1. Obtener estado actual
      const status = await this.getExecutionStatus(execution.id);
      
      // 2. Verificar métricas
      const metrics = await this.checkMetrics(status);
      
      // 3. Detectar anomalías
      const anomalies = await this.detectAnomalies(metrics);
      
      // 4. Generar alertas si es necesario
      if (anomalies.length > 0) {
        await this.generateAlerts(anomalies);
      }
      
      // 5. Registrar logs
      await this.logMetrics(metrics);
      
      // 6. Emitir eventos al frontend
      this.emit('metrics:updated', metrics);
      
      // Detener si la ejecución terminó
      if (status.finished) {
        clearInterval(interval);
      }
    }, 1000); // Cada segundo
  }
  
  private async detectAnomalies(metrics: Metrics): Promise<Anomaly[]> {
    const anomalies = [];
    
    // Detectar si tarda demasiado
    if (metrics.elapsedTime > metrics.estimatedTime * 1.5) {
      anomalies.push({
        type: 'slow_execution',
        severity: 'warning',
        message: 'La ejecución está tardando más de lo esperado'
      });
    }
    
    // Detectar si el costo es demasiado alto
    if (metrics.currentCost > metrics.estimatedCost * 1.5) {
      anomalies.push({
        type: 'high_cost',
        severity: 'warning',
        message: 'El costo está siendo mayor al estimado'
      });
    }
    
    // Detectar errores
    if (metrics.errorCount > 3) {
      anomalies.push({
        type: 'multiple_errors',
        severity: 'critical',
        message: 'Múltiples errores detectados'
      });
    }
    
    return anomalies;
  }
  
  private async generateAlerts(anomalies: Anomaly[]): Promise<void> {
    for (const anomaly of anomalies) {
      // Emitir alerta al frontend
      this.emit('alert', {
        type: anomaly.type,
        severity: anomaly.severity,
        message: anomaly.message,
        timestamp: new Date()
      });
      
      // Registrar en logs
      await this.logger.warn(`Anomalía detectada: ${anomaly.message}`);
      
      // Guardar en memoria
      await this.memory.store(`anomaly_${Date.now()}`, anomaly);
    }
  }
  
  async logMetrics(metrics: Metrics): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      executionId: metrics.executionId,
      elapsedTime: metrics.elapsedTime,
      currentCost: metrics.currentCost,
      tokensUsed: metrics.tokensUsed,
      errorCount: metrics.errorCount,
      currentStep: metrics.currentStep
    };
    
    await this.logger.info('Metrics', logEntry);
  }
}
```

#### Entrada
```json
{
  "executionId": "exec_123",
  "status": "running",
  "currentStep": 2,
  "elapsedTime": 45000,
  "estimatedTime": 60000
}
```

#### Proceso
1. Cada segundo, obtiene estado
2. Verifica métricas
3. Detecta anomalías
4. Genera alertas si es necesario
5. Registra logs
6. Emite eventos al frontend

#### Salida
```json
{
  "timestamp": "2026-06-26T14:30:45Z",
  "executionId": "exec_123",
  "metrics": {
    "elapsedTime": 45000,
    "estimatedTime": 60000,
    "currentCost": 0.32,
    "estimatedCost": 0.50,
    "tokensUsed": 2500,
    "errorCount": 0,
    "currentStep": 2
  },
  "anomalies": [],
  "alerts": []
}
```

#### Modelo OpenCode Go Ideal
**MiMo-V2.5** ⭐⭐⭐⭐⭐
- ✅ Procesamiento ultra rápido
- ✅ Ideal para monitoreo en tiempo real
- ✅ Muy económico ($0.14/$0.28)
- ✅ Contexto de 1.0M tokens
- ✅ Excelente para detección de anomalías

---

## SELECCIÓN DE MODELOS OPENCODE GO

### Tabla Comparativa de Modelos por Agente

| Agente | Modelo Ideal | Alternativa | Razón |
|--------|-------------|------------|-------|
| **Analizador** | DeepSeek V4 Flash | MiMo-V2.5 | Rápido, económico, extracción de info |
| **Planificador** | Qwen3.7 Plus | GLM-5.2 | Razonamiento, planificación, balance |
| **Ejecutor** | DeepSeek V4 Flash | MiMo-V2.5 | Velocidad extrema, bajo costo |
| **Verificador** | GLM-5.2 | Qwen3.7 Max | Análisis profundo, decisiones críticas |
| **Optimizador** | MiniMax M3 | MiMo-V2.5 | Relación costo/calidad, análisis |
| **Reportero** | Kimi K2.7 Code | GLM-5.2 | Generación de contenido, formato |
| **Monitor** | MiMo-V2.5 | DeepSeek V4 Flash | Ultra rápido, tiempo real |

### Matriz de Decisión

```
┌─────────────────────────────────────────────────────────────┐
│                  MATRIZ DE SELECCIÓN                        │
├──────────────┬──────────┬──────────┬──────────┬──────────────┤
│ Agente       │ Velocidad│ Costo    │ Calidad  │ Modelo       │
├──────────────┼──────────┼──────────┼──────────┼──────────────┤
│ Analizador   │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐  │ DeepSeek V4  │
│ Planificador │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐⭐ │ Qwen3.7 Plus │
│ Ejecutor     │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐  │ DeepSeek V4  │
│ Verificador  │ ⭐⭐⭐⭐  │ ⭐⭐⭐    │ ⭐⭐⭐⭐⭐ │ GLM-5.2      │
│ Optimizador  │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐  │ MiniMax M3   │
│ Reportero    │ ⭐⭐⭐⭐  │ ⭐⭐⭐    │ ⭐⭐⭐⭐⭐ │ Kimi K2.7    │
│ Monitor      │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐  │ MiMo-V2.5    │
└──────────────┴──────────┴──────────┴──────────┴──────────────┘
```

### Estrategia de Costos

```
PRESUPUESTO MENSUAL: $60 (OpenCode Go)

Distribución recomendada:
├─ Analizador (5%):     $3.00  - Análisis inicial rápido
├─ Planificador (15%):  $9.00  - Planificación compleja
├─ Ejecutor (40%):      $24.00 - Ejecución de herramientas
├─ Verificador (15%):   $9.00  - Validación de resultados
├─ Optimizador (10%):   $6.00  - Optimización
├─ Reportero (10%):     $6.00  - Generación de reportes
└─ Monitor (5%):        $3.00  - Monitoreo en tiempo real

Total: $60.00
```

---

## FLUJO DE COMUNICACIÓN ENTRE AGENTES

### Comunicación Asincrónica

```
┌──────────────────────────────────────────────────────────────┐
│                    MESSAGE QUEUE                             │
│  (Redis Pub/Sub)                                             │
└──────────────────────────────────────────────────────────────┘

Analizador ──┐
             ├──> analysis:completed ──> Planificador
             │
             └──> analysis:stored ──> Memory

Planificador ─┐
              ├──> plan:created ──> Ejecutor
              │
              └──> plan:stored ──> Memory

Ejecutor ────┐
             ├──> step:completed ──> Verificador
             │
             ├──> step:completed ──> Monitor
             │
             └──> result:stored ──> Memory

Verificador ─┐
             ├──> verification:passed ──> Ejecutor (siguiente paso)
             │
             ├──> verification:failed ──> Ejecutor (reintentar)
             │
             └──> verification:critical ──> Monitor (alerta)

Optimizador ─┐
             ├──> optimization:suggested ──> Reportero
             │
             └──> optimization:stored ──> Memory

Reportero ───┐
             ├──> report:generated ──> Frontend
             │
             └──> report:stored ──> Memory

Monitor ─────┐
             ├──> metrics:updated ──> Frontend
             │
             ├──> alert:generated ──> Frontend
             │
             └──> logs:stored ──> Memory
```

### Ejemplo de Comunicación

```
1. Usuario ingresa objetivo
   └─> Analizador comienza

2. Analizador publica "analysis:completed"
   └─> Planificador recibe y comienza

3. Planificador publica "plan:created"
   └─> Ejecutor recibe y comienza

4. Ejecutor ejecuta paso 1
   └─> Publica "step:completed"
   └─> Verificador recibe
   └─> Monitor recibe

5. Verificador valida
   └─> Si OK: Publica "verification:passed"
   └─> Ejecutor continúa con paso 2

6. Cuando termina ejecución
   └─> Optimizador analiza
   └─> Reportero genera reporte
   └─> Monitor emite métricas finales

7. Frontend recibe eventos en tiempo real
   └─> Actualiza UI con progreso
```

---

## IMPLEMENTACIÓN TÉCNICA

### Arquitectura de Agentes

```typescript
// base-agent.ts
abstract class BaseAgent {
  protected llm: OpenCodeGoAdapter;
  protected memory: MemorySystem;
  protected eventBus: EventBus;
  protected logger: Logger;
  
  constructor(
    private agentName: string,
    private modelId: string
  ) {
    this.llm = new OpenCodeGoAdapter(modelId);
    this.memory = new MemorySystem();
    this.eventBus = new EventBus();
    this.logger = new Logger(agentName);
  }
  
  protected async callLLM(prompt: string, params?: ChatParams): Promise<string> {
    this.logger.debug(`Calling LLM with prompt: ${prompt.substring(0, 100)}...`);
    
    try {
      const response = await this.llm.chat([
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ], params);
      
      this.logger.debug(`LLM response received`);
      return response;
    } catch (error) {
      this.logger.error(`LLM call failed: ${error.message}`);
      throw error;
    }
  }
  
  protected emit(eventName: string, data: any): void {
    this.eventBus.emit(eventName, data);
    this.logger.info(`Event emitted: ${eventName}`);
  }
  
  protected async storeInMemory(key: string, value: any): Promise<void> {
    await this.memory.store(key, value);
    this.logger.debug(`Stored in memory: ${key}`);
  }
  
  protected abstract getSystemPrompt(): string;
}

// analyzer-agent.ts
class AnalyzerAgent extends BaseAgent {
  constructor() {
    super('Analyzer', 'deepseek-v4-flash');
  }
  
  protected getSystemPrompt(): string {
    return `Eres un analizador experto. Tu trabajo es:
    1. Analizar objetivos del usuario
    2. Extraer entidades relevantes
    3. Identificar restricciones
    4. Detectar contexto
    5. Evaluar complejidad
    
    Siempre responde en JSON.`;
  }
  
  async analyze(objective: string): Promise<Analysis> {
    const prompt = `Analiza este objetivo: "${objective}"`;
    const response = await this.callLLM(prompt);
    const analysis = JSON.parse(response);
    
    await this.storeInMemory('analysis', analysis);
    this.emit('analysis:completed', analysis);
    
    return analysis;
  }
}

// planner-agent.ts
class PlannerAgent extends BaseAgent {
  constructor() {
    super('Planner', 'qwen3.7-plus');
  }
  
  protected getSystemPrompt(): string {
    return `Eres un planificador experto. Tu trabajo es:
    1. Descomponer objetivos en pasos
    2. Identificar dependencias
    3. Seleccionar herramientas
    4. Estimar recursos
    5. Optimizar orden
    
    Siempre responde en JSON.`;
  }
  
  async plan(analysis: Analysis): Promise<ExecutionPlan> {
    const prompt = `Crea un plan basado en: ${JSON.stringify(analysis)}`;
    const response = await this.callLLM(prompt);
    const plan = JSON.parse(response);
    
    await this.storeInMemory('plan', plan);
    this.emit('plan:created', plan);
    
    return plan;
  }
}

// ... más agentes
```

### Orquestación de Agentes

```typescript
// agent-orchestrator.ts
class AgentOrchestrator {
  private analyzer: AnalyzerAgent;
  private planner: PlannerAgent;
  private executor: ExecutorAgent;
  private verifier: VerifierAgent;
  private optimizer: OptimizerAgent;
  private reporter: ReporterAgent;
  private monitor: MonitorAgent;
  
  constructor() {
    this.analyzer = new AnalyzerAgent();
    this.planner = new PlannerAgent();
    this.executor = new ExecutorAgent();
    this.verifier = new VerifierAgent();
    this.optimizer = new OptimizerAgent();
    this.reporter = new ReporterAgent();
    this.monitor = new MonitorAgent();
  }
  
  async executeTask(objective: string): Promise<TaskResult> {
    try {
      // 1. Analizar
      console.log('1. Analizando objetivo...');
      const analysis = await this.analyzer.analyze(objective);
      
      // 2. Planificar
      console.log('2. Creando plan...');
      const plan = await this.planner.plan(analysis);
      
      // 3. Ejecutar
      console.log('3. Ejecutando plan...');
      const monitor = this.monitor.monitorExecution(execution);
      const execution = await this.executor.execute(plan);
      
      // 4. Verificar
      console.log('4. Verificando resultados...');
      const verification = await this.verifier.verify(execution);
      
      // 5. Optimizar
      console.log('5. Optimizando...');
      const optimizations = await this.optimizer.optimize(execution);
      
      // 6. Reportar
      console.log('6. Generando reporte...');
      const report = await this.reporter.generateReport(execution, optimizations);
      
      return {
        success: true,
        analysis,
        plan,
        execution,
        verification,
        optimizations,
        report
      };
    } catch (error) {
      console.error('Error en orquestación:', error);
      throw error;
    }
  }
}
```

---

## EJEMPLOS DE EJECUCIÓN

### Ejemplo 1: Análisis de Sentimientos en Twitter

```
OBJETIVO: "Analiza los últimos 100 tweets de mi cuenta, 
extrae sentimientos, crea un gráfico y envía un reporte por email"

PASO 1: ANALIZADOR (DeepSeek V4 Flash)
├─ Extrae entidades: tweets, sentimientos, gráfico, email
├─ Identifica restricciones: 100 tweets, API de Twitter
├─ Contexto: análisis de redes sociales
├─ Complejidad: Media
└─ Tiempo: 2 segundos, Costo: $0.001

PASO 2: PLANIFICADOR (Qwen3.7 Plus)
├─ Paso 1: Obtener tweets (twitter_api)
├─ Paso 2: Analizar sentimientos (sentiment_analysis)
├─ Paso 3: Crear gráfico (visualization)
├─ Paso 4: Generar reporte (report_generation)
├─ Paso 5: Enviar email (email_tool)
└─ Tiempo estimado: 60 segundos, Costo estimado: $0.15

PASO 3: EJECUTOR (DeepSeek V4 Flash)
├─ Ejecuta paso 1: 10 segundos, $0.01
├─ Ejecuta paso 2: 30 segundos, $0.05
├─ Ejecuta paso 3: 5 segundos, $0.02
├─ Ejecuta paso 4: 10 segundos, $0.04
├─ Ejecuta paso 5: 5 segundos, $0.01
└─ Total: 60 segundos, $0.13

PASO 4: VERIFICADOR (GLM-5.2)
├─ Valida resultados de cada paso
├─ Detecta que el gráfico es correcto
├─ Verifica que el email se envió
└─ Resultado: ✓ Todo válido

PASO 5: OPTIMIZADOR (MiniMax M3)
├─ Analiza ejecución
├─ Sugiere usar MiMo-V2.5 para paso 2 (ahorraría 40%)
├─ Sugiere paralelizar pasos 3 y 4
└─ Ahorros estimados: $0.04, 15 segundos

PASO 6: REPORTERO (Kimi K2.7 Code)
├─ Formatea resultados
├─ Crea gráfico profesional
├─ Genera PDF con reporte
└─ Archivo: reporte_20260626.pdf

PASO 7: MONITOR (MiMo-V2.5)
├─ Monitorea toda la ejecución
├─ Registra métricas cada segundo
├─ No detecta anomalías
└─ Emite eventos al frontend en tiempo real

RESULTADO FINAL:
├─ Tiempo total: 62 segundos
├─ Costo total: $0.14
├─ Éxito: 100%
├─ Reporte: reporte_20260626.pdf
└─ Email enviado a: usuario@example.com
```

### Ejemplo 2: Scraping y Análisis de Datos

```
OBJETIVO: "Extrae datos de 50 páginas de un sitio web, 
analiza patrones y crea un dashboard interactivo"

ANALIZADOR (2s, $0.001)
├─ Entidades: web scraping, análisis, dashboard
├─ Restricciones: 50 páginas, rate limiting
└─ Complejidad: Alta

PLANIFICADOR (5s, $0.003)
├─ Paso 1: Scraping de 50 páginas (web_scraping)
├─ Paso 2: Limpieza de datos (data_cleaning)
├─ Paso 3: Análisis de patrones (data_analysis)
├─ Paso 4: Crear dashboard (visualization)
└─ Tiempo estimado: 300 segundos

EJECUTOR (280s, $0.08)
├─ Paso 1: Scraping - 200s
├─ Paso 2: Limpieza - 40s
├─ Paso 3: Análisis - 30s
├─ Paso 4: Dashboard - 10s
└─ Total: 280 segundos

VERIFICADOR (5s, $0.002)
├─ Valida que se extrajeron 50 páginas
├─ Verifica integridad de datos
└─ Resultado: ✓ OK

OPTIMIZADOR (3s, $0.001)
├─ Sugiere paralelizar scraping
├─ Ahorraría 100 segundos
└─ Ahorro: $0.03

REPORTERO (10s, $0.005)
├─ Formatea datos
├─ Crea visualizaciones
├─ Genera dashboard HTML
└─ Archivo: dashboard.html

MONITOR (continuo)
├─ Alerta: Scraping lento en página 25
├─ Alerta: Uso de memoria alto
└─ Recomendación: Usar caché

RESULTADO:
├─ Tiempo: 303 segundos
├─ Costo: $0.10
├─ Éxito: 100%
└─ Dashboard: dashboard.html
```

---

## CONCLUSIÓN

### Resumen de Agentes

| # | Agente | Responsabilidad | Modelo | Velocidad | Costo |
|---|--------|-----------------|--------|-----------|-------|
| 1 | Analizador | Analizar objetivo | DeepSeek V4 Flash | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 2 | Planificador | Crear plan | Qwen3.7 Plus | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 3 | Ejecutor | Ejecutar pasos | DeepSeek V4 Flash | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 4 | Verificador | Validar resultados | GLM-5.2 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 5 | Optimizador | Optimizar ejecución | MiniMax M3 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 6 | Reportero | Generar reportes | Kimi K2.7 Code | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 7 | Monitor | Monitorear | MiMo-V2.5 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Ventajas del Sistema Multi-Agente

✅ **Especialización** - Cada agente es experto en su tarea
✅ **Escalabilidad** - Fácil añadir nuevos agentes
✅ **Resiliencia** - Si un agente falla, otros continúan
✅ **Eficiencia** - Cada agente usa el modelo más apropiado
✅ **Optimización** - Reducción de costos y tiempo
✅ **Transparencia** - Cada paso es visible y auditable
✅ **Flexibilidad** - Fácil cambiar modelos o estrategias

---

**Versión:** 1.0
**Última actualización:** Junio 26, 2026
**Estado:** Listo para implementación
