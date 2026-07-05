# Análisis Técnico y Plan de Mejora: Mexa IA

**Autor:** Manus AI  
**Fecha:** 1 de julio de 2026  
**Versión:** 1.1  
**Proveedor LLM:** OpenCode Go (exclusivo)

---

## Resumen Ejecutivo

Este documento presenta un análisis exhaustivo del proyecto **Mexa IA**, un agente de inteligencia artificial autónomo construido sobre Next.js 16, comparándolo con la arquitectura y capacidades de **Manus IA** (Monica.im / Meta). El análisis identifica las brechas tecnológicas fundamentales y propone un plan de implementación estructurado en **4 fases** para alcanzar un nivel de funcionamiento equivalente.

Mexa IA opera exclusivamente con **OpenCode Go** como proveedor de modelos LLM, utilizando su catálogo de 13 modelos accesibles a través del endpoint `https://opencode.ai/zen/go/v1/chat/completions`. El plan de mejora respeta esta restricción y optimiza la asignación de cada modelo a los agentes y herramientas según sus fortalezas específicas.

---

## 1. Análisis Comparativo de Arquitectura

### 1.1 Entorno de Ejecución

La diferencia arquitectónica más significativa entre ambos sistemas radica en el entorno donde operan los agentes. Manus IA provisiona una **máquina virtual Ubuntu aislada** (basada en microVMs de Firecracker a través de E2B) para cada tarea del usuario. Este sandbox se levanta en aproximadamente 150 milisegundos y proporciona un sistema operativo completo con acceso a internet, shell con privilegios de superusuario, sistema de archivos persistente, navegador Chromium, e intérpretes de Python, Node.js y Bash [1]. El agente puede instalar paquetes, ejecutar código, levantar servidores web y exponer puertos públicos, todo dentro de un entorno seguro y efímero.

Mexa IA, por el contrario, ejecuta la lógica de sus agentes en el **navegador del usuario** (toda la carpeta `src/lib/agents/**` está marcada con `"use client"`). Las herramientas como ejecución de código, testing y deployment son **simuladas**, y el sistema de archivos opera sobre `localStorage`. Esta arquitectura limita fundamentalmente la autonomía del agente, ya que no puede realizar operaciones reales de sistema, instalar dependencias ni ejecutar procesos de larga duración.

| Aspecto | Mexa IA (Actual) | Manus IA | Impacto |
| --- | --- | --- | --- |
| Ubicación de ejecución | Navegador del usuario | VM en la nube (server-side) | Mexa no puede ejecutar operaciones de sistema |
| Sandbox | No existe | MicroVM aislada por tarea | Sin aislamiento de seguridad |
| Sistema de archivos | localStorage (virtual) | Filesystem real persistente | Sin capacidad de manipular archivos reales |
| Ejecución de código | Simulada | Real (Python/Node/Bash) | No puede resolver problemas mediante código |
| Persistencia | localStorage (7 días máx.) | VM con sleep/wake (21 días) | Pérdida de contexto entre sesiones |
| Recursos | Limitados al navegador | CPU/RAM dedicados en cloud | No puede procesar tareas pesadas |

### 1.2 Flujo de Control del Agente

Manus IA opera mediante un **ciclo iterativo estricto** donde cada iteración consiste en: (1) analizar el estado actual y el stream de eventos, (2) seleccionar una única acción, (3) ejecutarla en el sandbox, y (4) observar el resultado antes de decidir el siguiente paso [2]. Este diseño de "una acción por iteración" previene secuencias descontroladas y permite adaptación real al entorno.

Mexa IA implementa un flujo **secuencial predeterminado** (Analizador → Planificador → Ejecutor → Verificador → Optimizador → Reportero → Monitor) que se ejecuta completo para cada tarea. Si bien es funcional, carece de la capacidad de adaptarse dinámicamente a resultados inesperados durante la ejecución. El Verificador solo interviene en caso de error, pero no puede redirigir el plan completo basándose en observaciones intermedias.

### 1.3 Modelo de LLM: OpenCode Go como Proveedor Único

Mexa IA utiliza OpenCode Go como su proveedor exclusivo de modelos, lo cual es una decisión válida dado que el catálogo ofrece 13 modelos con diferentes perfiles de rendimiento, costo y especialidad. La clave está en **asignar el modelo correcto a cada agente y herramienta** para maximizar la relación calidad/costo.

Manus IA utiliza invocación dinámica de múltiples proveedores (Claude, Qwen, GPT-4, Gemini). Sin embargo, con la selección inteligente dentro del catálogo de OpenCode Go, Mexa IA puede lograr resultados comparables aprovechando la diversidad de modelos disponibles: desde modelos ultra-económicos (MiMo-V2.5 a $0.14/M input) hasta modelos premium de máxima calidad (Qwen3.7 Max a $2.5/M input).

### 1.4 Herramientas y Capacidades

| Categoría | Mexa IA | Manus IA | Estado |
| --- | --- | --- | --- |
| Shell/Terminal | Simulado | Real (sudo) | Faltante |
| Navegador web | Playwright (real) | Chromium en sandbox | Parcial |
| Sistema de archivos | localStorage | Filesystem real | Faltante |
| Búsqueda web | DuckDuckGo (real) | Múltiples fuentes | Parcial |
| Ejecución de código | Simulada | Real (Python/Node/Bash) | Faltante |
| Generación de imágenes | No implementada | Múltiples modelos | Faltante |
| Generación de audio/video | No implementada | Integrada | Faltante |
| Presentaciones/Slides | No implementada | Motor nativo | Faltante |
| Procesamiento paralelo | No implementado | Map/reduce de subtareas | Faltante |
| Web development/deploy | Simulado | Real con hosting | Faltante |
| Tareas programadas | No implementado | Cron/interval | Faltante |
| Extracción de páginas web | Real (básica) | Avanzada con fallbacks | Parcial |

---

## 2. Asignación Óptima de Modelos OpenCode Go

### 2.1 Catálogo Disponible

El catálogo de OpenCode Go ofrece 13 modelos con perfiles diferenciados. Para la asignación óptima, se clasifican en tres tiers según su relación costo/capacidad:

| Tier | Modelos | Contexto | Costo (input/output por M) | Perfil |
| --- | --- | --- | --- | --- |
| **Premium** | `qwen3.7-max`, `glm-5.2` | 1M | $2.5/$7.5 y $1.4/$4.4 | Máxima calidad, razonamiento complejo |
| **Balanceado** | `deepseek-v4-pro`, `mimo-v2.5-pro`, `kimi-k2.7-code`, `kimi-k2.6`, `qwen3.7-plus`, `qwen3.6-plus`, `glm-5.1` | 200K-1M | $0.4-$1.74 / $1.6-$4.0 | Calidad alta, costo moderado |
| **Económico** | `deepseek-v4-flash`, `mimo-v2.5`, `minimax-m3`, `minimax-m2.7` | 200K-1M | $0.1-$0.3 / $0.28-$1.2 | Velocidad, bajo costo |

### 2.2 Asignación Recomendada por Agente

La asignación actual de Mexa IA utiliza `deepseek-v4-flash` para casi todos los agentes, lo cual prioriza velocidad y costo pero sacrifica calidad en tareas que la requieren. La siguiente tabla propone una asignación optimizada que balancea calidad, costo y especialidad:

| Agente | Modelo Actual | Modelo Recomendado | Justificación |
| --- | --- | --- | --- |
| **Analizador** | `deepseek-v4-flash` | `deepseek-v4-flash` | Correcto. Tarea rápida de clasificación que no requiere razonamiento profundo. |
| **Planificador** | `deepseek-v4-flash` | `qwen3.7-plus` | El planificador necesita razonamiento de alto nivel para descomponer tareas complejas. Qwen3.7 Plus ofrece calidad media-alta a costo razonable ($0.4/$1.6). |
| **Ejecutor** | `deepseek-v4-flash` | `kimi-k2.7-code` | El ejecutor genera código, queries y parámetros de herramientas. Kimi K2.7 Code está especializado en coding ($0.95/$4.0) y es el modelo recomendado del catálogo. |
| **Verificador** | `deepseek-v4-flash` | `glm-5.1` | La verificación requiere razonamiento avanzado para detectar errores sutiles. GLM-5.1 ofrece razonamiento avanzado con 203K de contexto ($1.4/$4.4). |
| **Optimizador** | `minimax-m3` | `deepseek-v4-pro` | La optimización requiere análisis profundo de la ejecución completa. DeepSeek V4 Pro tiene 1M de contexto y razonamiento complejo ($1.74/$3.48). |
| **Reportero** | `minimax-m3` | `qwen3.6-plus` | La generación de reportes largos y bien estructurados requiere calidad de escritura. Qwen3.6 Plus ofrece calidad media con buen contexto ($0.5/$3.0). |
| **Monitor** | `mimo-v2.5` | `mimo-v2.5` | Correcto. El monitoreo es una tarea ligera de detección de anomalías que se beneficia de velocidad extrema y bajo costo. |

### 2.3 Asignación por Herramienta

Las herramientas que invocan al LLM también deben optimizarse:

| Herramienta | Modelo Actual | Modelo Recomendado | maxTokens | Justificación |
| --- | --- | --- | --- | --- |
| Code Generation | `deepseek-v4-flash` | `kimi-k2.7-code` | 4096 | Modelo especializado en código. Aumentar maxTokens de 2048 a 4096 para código complejo. |
| Document Generation | `deepseek-v4-flash` | `qwen3.7-plus` | 16384 | Documentos requieren calidad de escritura y coherencia en textos largos. |
| Data Analysis | `deepseek-v4-flash` | `deepseek-v4-pro` | 8192 | Análisis de datos requiere razonamiento sobre conjuntos complejos. Aumentar de 4096 a 8192. |
| Web Extraction (fallback) | `deepseek-v4-flash` | `mimo-v2.5` | 2048 | Tarea simple de extracción/resumen. Modelo económico suficiente. Aumentar de 1024. |
| Web Search (fallback) | `deepseek-v4-flash` | `mimo-v2.5` | 1024 | Generación de queries es tarea ligera. Modelo económico suficiente. |

### 2.4 Enrutamiento Dinámico con OpenCode Go

En lugar de asignaciones estáticas, se recomienda implementar un **router de modelos** que seleccione dinámicamente dentro del catálogo de OpenCode Go basándose en la complejidad de cada subtarea específica:

```typescript
// Pseudocódigo del router de modelos
function selectModel(task: SubTask): ModelId {
  // Nivel 1: Tareas triviales (clasificación, queries, extracción)
  if (task.complexity === 'low' && task.type !== 'code') {
    return 'mimo-v2.5'; // $0.14/$0.28 - velocidad extrema
  }
  
  // Nivel 2: Tareas de código
  if (task.type === 'code' || task.type === 'tool-params') {
    return task.complexity === 'high' 
      ? 'kimi-k2.7-code'  // $0.95/$4.0 - coding especializado
      : 'deepseek-v4-flash'; // $0.14/$0.28 - código simple
  }
  
  // Nivel 3: Razonamiento y planificación
  if (task.type === 'reasoning' || task.type === 'planning') {
    return task.complexity === 'high'
      ? 'qwen3.7-max'  // $2.5/$7.5 - máxima calidad (solo para tareas críticas)
      : 'qwen3.7-plus'; // $0.4/$1.6 - calidad media-alta
  }
  
  // Nivel 4: Generación de contenido largo
  if (task.type === 'content' || task.type === 'report') {
    return 'qwen3.6-plus'; // $0.5/$3.0 - buena escritura
  }
  
  // Default: balance general
  return 'deepseek-v4-flash'; // $0.14/$0.28
}
```

### 2.5 Modo Económico vs Modo Calidad

Mexa IA ya implementa un "modo económico" que omite verificación y optimización. Se recomienda formalizar dos perfiles de ejecución:

| Aspecto | Modo Económico | Modo Calidad |
| --- | --- | --- |
| Planificador | `deepseek-v4-flash` | `qwen3.7-plus` |
| Ejecutor | `deepseek-v4-flash` | `kimi-k2.7-code` |
| Verificador | Omitido (solo en errores) | `glm-5.1` (siempre) |
| Optimizador | Omitido | `deepseek-v4-pro` |
| Reportero | `minimax-m3` | `qwen3.6-plus` |
| Costo estimado por tarea | ~$0.01-0.05 | ~$0.10-0.50 |
| Calidad esperada | Aceptable para tareas simples | Alta para tareas complejas |

El usuario debería poder seleccionar el modo, o el sistema debería auto-detectar basándose en la complejidad estimada por el Analizador.

---

## 3. Problemas Críticos Identificados

### 3.1 Ejecución en el Cliente

El problema más grave es que toda la lógica de agentes se ejecuta en el navegador. Esto implica que si el usuario cierra la pestaña, la ejecución se interrumpe. Manus IA, por diseño, continúa trabajando incluso si el dispositivo del usuario está apagado [5]. Para un agente autónomo, la ejecución server-side no es opcional sino fundamental.

### 3.2 Herramientas Simuladas

Las herramientas de ejecución de código (Python, Node, Bash), testing, deployment y Git son simulaciones que devuelven respuestas predefinidas. Esto significa que el agente no puede resolver problemas reales que requieran computación. Manus IA utiliza el enfoque **CodeAct**, donde el agente escribe y ejecuta código Python como su mecanismo principal de acción [2], permitiéndole resolver cualquier problema computable.

### 3.3 Memoria Volátil

El sistema de memoria basado en `localStorage` tiene limitaciones de tamaño (típicamente 5-10 MB) y no es confiable para almacenamiento a largo plazo. Manus IA utiliza un sistema de **memoria basada en archivos** dentro del sandbox, donde el agente puede escribir y leer documentos de progreso, resultados intermedios y planes actualizados [2].

### 3.4 Ausencia de Aislamiento de Seguridad

Sin un sandbox, cualquier operación que el agente intente realizar (si se implementara ejecución real) podría comprometer el servidor. Manus IA sigue el principio de **Zero Trust**: cada sandbox es completamente aislado y no puede afectar al servicio principal ni a otros usuarios [1].

### 3.5 Discrepancias en la Configuración de Modelos

El documento del proyecto menciona una discrepancia entre los modelos declarados en comentarios (`qwen3.7-plus`, `glm-5.2`) y los realmente utilizados en runtime (`AGENTS[agentType].modelId`). La función `getModelForAgent` en `planner-agent.ts:255-265` solo actualiza metadatos de UI sin afectar la llamada LLM real. Esto debe unificarse para que la asignación de modelos sea coherente y configurable desde un solo punto.

### 3.6 Error de Base de Datos No Resuelto

Se detectó un error `NOT NULL constraint failed: session_message.seq` que no corresponde a ningún modelo del schema Prisma actual. Esto sugiere una tabla huérfana o código que referencia un modelo no declarado.

### 3.7 Subutilización del Catálogo de Modelos

De los 13 modelos disponibles en OpenCode Go, Mexa IA solo utiliza efectivamente 3 en runtime (`deepseek-v4-flash`, `minimax-m3`, `mimo-v2.5`). Los modelos premium y especializados (`qwen3.7-max`, `glm-5.2`, `kimi-k2.7-code`, `deepseek-v4-pro`) no se aprovechan, desperdiciando capacidades de razonamiento avanzado y coding especializado que mejorarían significativamente la calidad de las respuestas.

---

## 4. Plan de Implementación por Fases

### Fase 1: Reestructuración del Core y Sandboxing (Semanas 1-8)

**Objetivo:** Establecer la infraestructura fundamental para la autonomía real del agente, manteniendo OpenCode Go como proveedor exclusivo.

**1.1 Migración de la Orquestación al Backend**

Toda la lógica de agentes debe moverse del cliente al servidor. Esto implica crear un servicio backend (worker de Node.js o servicio Python separado) que reciba las tareas del usuario y las ejecute de forma asíncrona. El frontend debe limitarse a enviar mensajes y recibir actualizaciones de progreso vía WebSocket o Server-Sent Events.

El proxy existente (`/api/chat/completions`) ya maneja la comunicación con OpenCode Go correctamente. Lo que debe cambiar es que los agentes invoquen este proxy desde el backend (server-to-server) en lugar de desde el cliente (browser-to-server). Esto elimina la dependencia del navegador del usuario.

**1.2 Implementación del Sandbox**

Se debe integrar un sistema de entornos aislados. Para el MVP se recomienda Docker:

| Opción | Ventajas | Desventajas | Recomendación |
| --- | --- | --- | --- |
| **Docker** (Self-hosted) | Control total, sin costos externos, compatible con OpenCode Go | Spin-up lento (10-20s), no es OS completo | Recomendado para inicio |
| **E2B** (SaaS) | Spin-up en 150ms, escalable | Costo por uso, dependencia externa | Para escalar después |
| **Firecracker** (Self-hosted) | Máximo rendimiento, aislamiento real | Complejidad alta | Para producción a escala |

**1.3 Herramientas de Sistema Base**

Implementar las herramientas fundamentales que operan dentro del sandbox:

- **Shell Tool:** Ejecuta comandos en el terminal del sandbox. Debe soportar timeout, captura de stdout/stderr, y envío de input interactivo.
- **File Tool:** Operaciones CRUD sobre el sistema de archivos del sandbox (read, write, edit, append, delete, list).
- **Code Execution:** Capacidad de ejecutar scripts Python, Node.js y Bash dentro del sandbox.

Todas estas herramientas se comunican con OpenCode Go a través del mismo proxy backend cuando necesitan asistencia del LLM (ej. generar código antes de ejecutarlo).

**1.4 Ciclo de Ejecución Iterativo**

Refactorizar el orquestador para seguir el patrón de Manus IA: una acción por iteración con observación del resultado. El prompt de sistema enviado a OpenCode Go debe instruir al modelo a:

1. Analizar el estado actual (mensajes previos + resultados de herramientas)
2. Decidir la siguiente acción (qué herramienta usar y con qué parámetros)
3. Esperar el resultado de la ejecución
4. Repetir hasta completar la tarea o comunicar resultado al usuario

**1.5 Unificación de Configuración de Modelos**

Crear un archivo de configuración centralizado que sea la **única fuente de verdad** para la asignación modelo-agente:

```typescript
// src/lib/config/model-routing.ts
export const MODEL_ROUTING = {
  agents: {
    analyzer:   { default: 'deepseek-v4-flash', quality: 'qwen3.7-plus' },
    planner:    { default: 'deepseek-v4-flash', quality: 'qwen3.7-plus' },
    executor:   { default: 'deepseek-v4-flash', quality: 'kimi-k2.7-code' },
    verifier:   { default: 'deepseek-v4-flash', quality: 'glm-5.1' },
    optimizer:  { default: 'minimax-m3',        quality: 'deepseek-v4-pro' },
    reporter:   { default: 'minimax-m3',        quality: 'qwen3.6-plus' },
    monitor:    { default: 'mimo-v2.5',         quality: 'mimo-v2.5' },
  },
  tools: {
    codeGeneration:     { model: 'kimi-k2.7-code', maxTokens: 4096 },
    documentGeneration: { model: 'qwen3.7-plus',   maxTokens: 16384 },
    dataAnalysis:       { model: 'deepseek-v4-pro', maxTokens: 8192 },
    webExtraction:      { model: 'mimo-v2.5',       maxTokens: 2048 },
    webSearch:          { model: 'mimo-v2.5',       maxTokens: 1024 },
  }
} as const;
```

Eliminar `getModelForAgent` de `planner-agent.ts` y la lectura de `AGENTS[agentType].modelId` en `base-agent.ts`, reemplazándolos por este archivo centralizado.

**1.6 Corrección de Bugs**

- Resolver el error `NOT NULL constraint failed: session_message.seq` (investigar tablas huérfanas en SQLite).
- Migrar de SQLite a PostgreSQL para soportar concurrencia real del backend.
- Eliminar la discrepancia de modelos entre UI y runtime.

---

### Fase 2: Capacidades de Ejecución Real y CodeAct (Semanas 9-16)

**Objetivo:** Dotar al agente de la capacidad de resolver problemas mediante ejecución de código real, usando OpenCode Go para la generación de código.

**2.1 Implementación del Enfoque CodeAct**

El agente debe aprender a utilizar código como su mecanismo principal de acción. El flujo con OpenCode Go es:

1. El Ejecutor envía un prompt a `kimi-k2.7-code` (vía OpenCode Go) pidiendo un script para resolver la subtarea
2. OpenCode Go devuelve el código generado
3. El backend ejecuta el código dentro del sandbox
4. El resultado (stdout/stderr) se envía de vuelta al agente como observación
5. El agente decide si el resultado es satisfactorio o necesita ajustes

Los prompts del Ejecutor deben instruir al modelo `kimi-k2.7-code` a generar código ejecutable, no explicaciones textuales. Ejemplo de prompt:

```
Genera un script Python que resuelva la siguiente tarea. 
El script debe ser ejecutable directamente sin modificaciones.
Usa solo bibliotecas estándar o las siguientes disponibles: pandas, numpy, matplotlib, requests, beautifulsoup4.
Tarea: [descripción de la subtarea]
```

**2.2 Navegador en Sandbox**

Migrar el control de Playwright para que se ejecute dentro del sandbox de la tarea. El endpoint `/api/browser/sessions` debe crear la instancia de Playwright dentro del contenedor Docker asignado a la tarea, no en el servidor principal.

**2.3 Sistema de Memoria Persistente**

Reemplazar `localStorage` por un sistema de tres niveles:

| Nivel | Implementación | Contenido | Persistencia |
| --- | --- | --- | --- |
| Working Memory | Archivos en sandbox + Redis | Contexto actual, plan, resultados | Duración de la tarea |
| Episodic Memory | PostgreSQL | Historial de tareas, errores, soluciones | Permanente |
| Semantic Memory | pgvector (PostgreSQL) | Embeddings de patrones aprendidos | Permanente |

Para los embeddings de la memoria semántica, se puede usar `mimo-v2.5` (el más económico) para generar resúmenes que luego se vectorizan con una librería local (ej. `sentence-transformers`), evitando costos adicionales fuera de OpenCode Go.

**2.4 Enrutamiento Dinámico dentro de OpenCode Go**

Implementar el router de modelos descrito en la Sección 2.4 del análisis. El router debe:

- Recibir la subtarea con su tipo y complejidad estimada
- Seleccionar el modelo óptimo del catálogo de OpenCode Go
- Enviar la request al proxy `/api/chat/completions` con el `model` correcto en el body
- Registrar el modelo usado y tokens consumidos para monitoreo de costos

**2.5 Búsqueda Web Avanzada**

Expandir la herramienta de búsqueda más allá de DuckDuckGo. Implementar múltiples proveedores con fallbacks automáticos. Usar `mimo-v2.5` (vía OpenCode Go) para generar queries optimizados y `deepseek-v4-flash` para sintetizar resultados de múltiples fuentes.

---

### Fase 3: Herramientas Avanzadas y Multimedia (Semanas 17-24)

**Objetivo:** Equipar al agente con capacidades de propósito general, coordinadas a través de OpenCode Go para la lógica de decisión.

**3.1 Procesamiento Paralelo**

Implementar una herramienta `map` que permita al agente dividir una tarea en subtareas homogéneas y ejecutarlas en paralelo. Cada subtarea usa su propio contexto de OpenCode Go (llamada independiente al modelo asignado). Los resultados se agregan al finalizar.

**3.2 Generación Multimedia**

Integrar APIs externas de generación multimedia como herramientas del agente. OpenCode Go se usa para la **decisión y coordinación** (qué generar, con qué prompt), mientras que la generación real se delega a APIs especializadas:

| Capacidad | API Externa | Modelo OpenCode Go para Coordinación |
| --- | --- | --- |
| Generación de imágenes | Stable Diffusion / DALL-E | `qwen3.7-plus` (genera el prompt de imagen) |
| Edición de imágenes | InstructPix2Pix | `deepseek-v4-flash` (describe la edición) |
| Text-to-Speech | ElevenLabs / Google TTS | `mimo-v2.5` (prepara el texto) |
| Generación de música | Suno API | `minimax-m3` (genera el prompt musical) |
| Generación de video | Runway / Kling | `qwen3.7-plus` (genera el prompt de video) |

**3.3 Motor de Presentaciones**

Crear un sistema donde el agente usa `qwen3.6-plus` (vía OpenCode Go) para estructurar el contenido de las diapositivas, y luego un motor de renderizado (reveal.js o HTML/CSS) genera las slides finales dentro del sandbox.

**3.4 Desarrollo Web y Despliegue**

Implementar la capacidad de que el agente inicialice proyectos web usando `kimi-k2.7-code` (vía OpenCode Go) para generar el código, lo ejecute dentro del sandbox, y exponga puertos públicos temporales mediante un reverse proxy.

**3.5 Herramienta de Diagramas**

Usar `kimi-k2.7-code` para generar código Mermaid/D2/PlantUML y renderizarlo dentro del sandbox a PNG/SVG.

---

### Fase 4: Productización y Escalabilidad (Semanas 25-32)

**Objetivo:** Preparar el sistema para uso en producción con múltiples usuarios concurrentes, optimizando el consumo de tokens en OpenCode Go.

**4.1 Tareas Programadas (Scheduling)**

Implementar un planificador que permita al agente ejecutar tareas recurrentes. El scheduler despierta un sandbox dormido, ejecuta la tarea usando OpenCode Go, y vuelve a dormir. Usar `mimo-v2.5` (el más económico) para tareas programadas repetitivas.

**4.2 Autenticación y Multi-tenancy**

Evolucionar del sistema demo a un sistema real con OAuth2, aislamiento entre usuarios, y gestión de cuotas de tokens por usuario (tracking del consumo en OpenCode Go).

**4.3 Optimización de Costos de OpenCode Go**

| Estrategia | Descripción | Ahorro Estimado |
| --- | --- | --- |
| Caché de respuestas | Cachear respuestas idénticas (mismo prompt + modelo) | 20-40% |
| Compresión de contexto | Resumir historial largo antes de enviarlo al modelo | 30-50% en tokens |
| Modelo adaptativo | Usar `mimo-v2.5` para subtareas triviales auto-detectadas | 40-60% |
| Batch de requests | Agrupar múltiples queries pequeños en una sola llamada | 10-20% |
| Early stopping | Detener ejecución cuando el resultado ya es satisfactorio | 15-25% |

**4.4 Monitoreo de Consumo**

Implementar un dashboard que muestre al usuario:

- Tokens consumidos por tarea y por modelo
- Costo estimado en USD (usando los precios del catálogo de OpenCode Go)
- Modelo utilizado en cada paso de la ejecución
- Comparación entre modo económico y modo calidad

**4.5 Colaboración y Conectores MCP**

Desarrollar colaboración multiusuario y expandir conectores para soportar el Model Context Protocol (MCP), permitiendo integraciones personalizadas que se coordinen a través de OpenCode Go.

---

## 5. Arquitectura Objetivo Final

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Zustand)                     │
│  ChatPanel ←→ WebSocket ←→ Backend                               │
│  WorkspacePanel (Output/Browser/Terminal/Files/Data)              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ WebSocket / SSE
                ┌───────────┴────────────────┐
                │     BACKEND (Node.js)       │
                │                             │
                │  ┌─────────────────────┐    │
                │  │  Task Manager       │    │
                │  │  (queue + scheduler)│    │
                │  └──────────┬──────────┘    │
                │             │               │
                │  ┌──────────▼──────────┐    │
                │  │  Agent Orchestrator │    │
                │  │  (iterative loop)   │    │
                │  └──────────┬──────────┘    │
                │             │               │
                │  ┌──────────▼──────────┐    │
                │  │  Model Router       │    │  ←── Selecciona modelo
                │  │  (13 modelos OC Go) │    │      según subtarea
                │  └──────────┬──────────┘    │
                │             │               │
                └─────────────┼───────────────┘
                              │
              ┌───────────────┼───────────────────┐
              │               │                   │
    ┌─────────▼─────────┐   ┌▼──────────────┐   ┌▼──────────────┐
    │  OpenCode Go API   │   │  Sandbox Pool │   │  PostgreSQL   │
    │  /v1/chat/         │   │  (Docker/E2B) │   │  + pgvector   │
    │  completions       │   │               │   │               │
    │                    │   │  Shell         │   │  Memoria      │
    │  13 modelos:       │   │  Filesystem    │   │  Episódica    │
    │  - qwen3.7-max     │   │  Playwright    │   │  Semántica    │
    │  - kimi-k2.7-code  │   │  Python/Node   │   │  Usuarios     │
    │  - deepseek-v4-*   │   │  Networking    │   │  Auditoría    │
    │  - mimo-v2.5       │   │               │   │               │
    │  - minimax-m3      │   └───────────────┘   └───────────────┘
    │  - glm-5.*         │
    │  - etc.            │
    └────────────────────┘
```

---

## 6. Prioridades de Implementación

| Prioridad | Tarea | Modelo OC Go Involucrado | Fase |
| --- | --- | --- | --- |
| 1 | Migrar orquestación al backend | Todos (server-side) | 1 |
| 2 | Implementar sandbox (Docker) | N/A (infraestructura) | 1 |
| 3 | Shell tool + File tool reales | N/A (ejecución directa) | 1 |
| 4 | Ciclo iterativo (agent loop) | Todos (según router) | 1 |
| 5 | Unificar config de modelos | Todos (centralizar) | 1 |
| 6 | CodeAct (ejecución de código) | `kimi-k2.7-code` | 2 |
| 7 | Memoria persistente | `mimo-v2.5` (resúmenes) | 2 |
| 8 | Router dinámico de modelos | Todos (selección inteligente) | 2 |
| 9 | Búsqueda web avanzada | `mimo-v2.5`, `deepseek-v4-flash` | 2 |
| 10 | Procesamiento paralelo | Según subtarea | 3 |
| 11 | Generación multimedia | `qwen3.7-plus` (coordinación) | 3 |
| 12 | Web development/deploy | `kimi-k2.7-code` | 3 |
| 13 | Presentaciones | `qwen3.6-plus` | 3 |
| 14 | Tareas programadas | `mimo-v2.5` (económico) | 4 |
| 15 | Optimización de costos OC Go | Todos (caché + compresión) | 4 |

---

## 7. Recomendaciones Técnicas Adicionales

### 7.1 Prompt Engineering para OpenCode Go

El prompt del sistema es el componente más crítico. Debe enviarse a OpenCode Go con cada request y debe incluir:

- Definición del ciclo de ejecución (analizar → planificar → ejecutar → observar)
- Restricción de una sola acción por iteración
- Formato JSON estructurado para las respuestas del agente (tool_calls)
- Instrucciones específicas para cada herramienta disponible
- Reglas de seguridad y manejo de errores
- Políticas de comunicación con el usuario

Dado que OpenCode Go soporta el formato de API compatible con OpenAI (`/v1/chat/completions`), se puede usar el formato estándar de `function calling` / `tool_use` para que el modelo seleccione herramientas de forma nativa.

### 7.2 Manejo de Contexto con Ventanas Grandes

Los modelos de OpenCode Go ofrecen ventanas de contexto de hasta 1M de tokens. Esto permite enviar historiales extensos sin truncar, pero se debe balancear con el costo. Estrategia recomendada:

- Para `mimo-v2.5` y `deepseek-v4-flash` (económicos): enviar contexto completo (hasta 1M)
- Para modelos premium (`qwen3.7-max`, `glm-5.2`): comprimir contexto a lo esencial para minimizar costos
- Usar `mimo-v2.5` para generar resúmenes de contexto antes de enviar a modelos caros

### 7.3 Fallback entre Modelos

Si un modelo de OpenCode Go falla (timeout, error 5xx, rate limit), implementar fallback automático:

```
kimi-k2.7-code → deepseek-v4-flash → mimo-v2.5
qwen3.7-max → qwen3.7-plus → deepseek-v4-pro
glm-5.2 → glm-5.1 → deepseek-v4-pro
```

### 7.4 Testing con OpenCode Go

Desarrollar tests de integración que verifiquen:

- Que cada modelo del catálogo responde correctamente al formato de tool calling
- Que el router selecciona el modelo esperado para cada tipo de tarea
- Que los fallbacks funcionan cuando un modelo no está disponible
- Que los costos estimados coinciden con los reales

---

## 8. Referencias

[1] Manus IA. "Understanding Manus Sandbox - Your Cloud Computer." Blog oficial de Manus, enero 2026. https://manus.im/blog/manus-sandbox

[2] Renschni. "In-depth Technical Investigation into the Manus AI Agent." GitHub Gist, 2025. https://gist.github.com/renschni/4fbc70b31bad8dd57f3370239dccd58f

[3] Shen, M. y Yang, Q. "From Mind to Machine: The Rise of Manus AI as a Fully Autonomous Digital Agent." arXiv:2505.02024, mayo 2025. https://arxiv.org/html/2505.02024v1

[4] E2B. "How Manus Uses E2B to Provide Agents With Virtual Computers." Blog de E2B, mayo 2025. https://e2b.dev/blog/how-manus-uses-e2b-to-provide-agents-with-virtual-computers

[5] TechFundingNews. "After DeepSeek, China Takes a Leap with Manus, World's First Autonomous AI Agent." 2025. https://techfundingnews.com/after-deepseek-china-takes-a-leap-with-manus-worlds-first-autonomous-ai-agent/
