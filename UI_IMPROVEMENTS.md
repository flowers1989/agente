# Mejoras de UI/UX para Alinearse con Manus IA

## Objetivo
Mejorar la interfaz del frontend del proyecto `agente` para que refleje el estilo, la calidad y la experiencia de usuario de **Manus IA**.

## Cambios Implementados en el Backend

### 1. System Prompts Actualizados
Todos los agentes del sistema han sido actualizados con nuevos `systemPrompt` que incluyen:
- **Identidad de Manus IA**: Cada agente ahora se identifica como parte de Manus IA.
- **Directrices de Formato Manus IA**: Especificaciones claras sobre cómo estructurar respuestas (Markdown, tablas, negritas, párrafos completos).
- **Tono Profesional y Académico**: Énfasis en la calidad y la profesionalidad de las respuestas.

### Agentes Actualizados:
1. **Analizador** - Análisis estructurado con entidades, restricciones, contexto y complejidad.
2. **Planificador** - Planes detallados con pasos ejecutables y dependencias.
3. **Ejecutor** - Ejecución precisa de herramientas con reportes claros.
4. **Verificador** - Validación rigurosa con análisis de causa raíz.
5. **Optimizador** - Sugerencias de mejora con estimaciones de ahorro.
6. **Reportero** - Informes profesionales con formato Markdown.
7. **Monitor** - Monitoreo continuo con alertas y métricas.

---

## Cambios Recomendados para el Frontend

### A. Componentes de Chat (chat-panel.tsx)

#### 1. Mejorar la Visualización de Mensajes del Agente
**Cambio**: Añadir un indicador visual más prominente para mensajes del agente.

```tsx
// Antes: Solo un logo pequeño
<div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
  <LogoMark size={16} />
</div>

// Después: Añadir badge de "Manus IA" con animación
<div className="flex items-center gap-2 mb-2">
  <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
    <LogoMark size={16} />
  </div>
  <span className="text-xs font-semibold text-foreground">Manus IA</span>
  <span className="text-[10px] text-muted-foreground">Agente Inteligente</span>
</div>
```

#### 2. Mejorar la Visualización de Steps
**Cambio**: Mostrar más información sobre cada paso (agente responsable, tiempo, costo).

```tsx
// Añadir información adicional al StepRow
<div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
  {step.agent && <span className="capitalize">{step.agent}</span>}
  {step.duration && <span>·</span>}
  {step.duration && <span>{step.duration}s</span>}
  {step.modelUsed && <span>·</span>}
  {step.modelUsed && <span className="truncate">{step.modelUsed}</span>}
</div>
```

#### 3. Mejorar el Bloque de Output
**Cambio**: Añadir más contexto y opciones de visualización.

```tsx
// Antes: Solo título y contenido
// Después: Añadir información de agente, modelo y opciones de formato

<div className="text-[10px] text-muted-foreground/60 mb-2">
  <span>Generado por: {message.output?.agent || 'Reportero'}</span>
  {message.output?.model && <span> · {message.output.model}</span>}
</div>
```

---

### B. Componentes de Workspace (workspace-panel.tsx)

#### 1. Mejorar la Visualización de Archivos
**Cambio**: Mostrar más detalles sobre archivos generados (tamaño, tipo, timestamp).

```tsx
// Añadir información detallada en la lista de archivos
<div className="text-[10px] text-muted-foreground/60">
  {file.size && <span>{(file.size / 1024).toFixed(1)} KB</span>}
  {file.modified && <span> · {new Date(file.modified).toLocaleDateString()}</span>}
</div>
```

#### 2. Mejorar la Visualización de Código
**Cambio**: Añadir opciones de copia, descarga y vista previa.

```tsx
// Botones adicionales para código
<div className="flex items-center gap-2 mb-2">
  <button onClick={() => copyToClipboard(code)} className="text-[10px] text-muted-foreground hover:text-foreground">
    Copiar
  </button>
  <button onClick={() => downloadCode(code)} className="text-[10px] text-muted-foreground hover:text-foreground">
    Descargar
  </button>
  <button onClick={() => previewCode(code)} className="text-[10px] text-muted-foreground hover:text-foreground">
    Vista previa
  </button>
</div>
```

---

### C. Componentes de Sidebar (conversation-sidebar.tsx)

#### 1. Mejorar la Visualización de Conversaciones
**Cambio**: Mostrar más información sobre cada conversación (estado, tokens, costo, agentes usados).

```tsx
// Añadir información detallada en la lista de conversaciones
<div className="text-[10px] text-muted-foreground/60 mt-1">
  <span>{conversation.tokensUsed} tokens</span>
  {conversation.cost && <span> · ${conversation.cost.toFixed(4)}</span>}
  {conversation.modelUsed && <span> · {conversation.modelUsed}</span>}
</div>
```

#### 2. Mejorar la Búsqueda de Conversaciones
**Cambio**: Añadir filtros por categoría, estado, agente, etc.

```tsx
// Añadir filtros
<div className="flex gap-1 mb-2">
  <button className="text-[10px] px-2 py-1 rounded border border-border hover:border-foreground/30">
    Todas
  </button>
  <button className="text-[10px] px-2 py-1 rounded border border-border hover:border-foreground/30">
    Investigación
  </button>
  <button className="text-[10px] px-2 py-1 rounded border border-border hover:border-foreground/30">
    Código
  </button>
  {/* ... más filtros */}
</div>
```

---

### D. Componentes de Página (pages/*.tsx)

#### 1. Dashboard Page
**Cambio**: Mostrar estadísticas detalladas sobre el uso de agentes, modelos y herramientas.

```tsx
// Añadir gráficos de uso
- Distribución de tareas por categoría
- Uso de modelos (pie chart)
- Uso de herramientas (bar chart)
- Tasa de éxito por agente
- Costo promedio por tarea
```

#### 2. History Page
**Cambio**: Mejorar la visualización del historial con filtros y búsqueda avanzada.

```tsx
// Añadir filtros avanzados
- Por rango de fechas
- Por categoría de tarea
- Por estado (completada, fallida, etc.)
- Por modelo usado
- Por agente responsable
```

#### 3. Reports Page
**Cambio**: Mostrar reportes generados con opciones de descarga y visualización.

```tsx
// Mejorar la visualización de reportes
- Mostrar vista previa del reporte
- Opciones de descarga (PDF, Markdown, HTML, Excel)
- Filtros por fecha, categoría, etc.
```

---

### E. Estilos Globales (globals.css)

#### 1. Mejorar la Paleta de Colores
**Cambio**: Alinearse con la paleta de Manus IA (violeta, azul, gradientes).

```css
/* Añadir variables de color para Manus IA */
--manus-primary: #7c3aed; /* Violeta */
--manus-secondary: #3b82f6; /* Azul */
--manus-accent: #06b6d4; /* Cyan */
--manus-gradient: linear-gradient(135deg, #7c3aed, #3b82f6);
```

#### 2. Mejorar las Animaciones
**Cambio**: Añadir animaciones más suaves y profesionales.

```css
/* Animaciones de entrada */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animaciones de carga */
@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

### F. Componentes de UI (components/ui/*.tsx)

#### 1. Mejorar el Componente Markdown
**Cambio**: Añadir soporte para más elementos Markdown y mejorar el styling.

```tsx
// Añadir soporte para:
- Tablas con colores alternados
- Bloques de código con syntax highlighting
- Citas con estilos mejorados
- Listas anidadas con estilos
- Enlaces con iconos
```

#### 2. Mejorar el Componente Button
**Cambio**: Añadir variantes de botón alineadas con Manus IA.

```tsx
// Variantes de botón
- primary (violeta)
- secondary (azul)
- ghost (transparente)
- outline (borde)
- destructive (rojo)
- success (verde)
```

---

## Implementación Recomendada

### Fase 1: Cambios Inmediatos (Semana 1)
1. Actualizar `chat-panel.tsx` para mejorar la visualización de mensajes del agente.
2. Mejorar el componente `Markdown` para mejor rendering.
3. Actualizar la paleta de colores en `globals.css`.

### Fase 2: Mejoras de Componentes (Semana 2)
1. Mejorar `workspace-panel.tsx` con más opciones de visualización.
2. Mejorar `conversation-sidebar.tsx` con filtros y búsqueda.
3. Actualizar componentes de UI con nuevas variantes.

### Fase 3: Páginas y Dashboards (Semana 3)
1. Mejorar `dashboard-page.tsx` con gráficos y estadísticas.
2. Mejorar `history-page.tsx` con filtros avanzados.
3. Mejorar `reports-page.tsx` con opciones de descarga.

---

## Recursos de Referencia

- **Manus IA Website**: https://manus.im/
- **Manus IA Chat Interface**: Observar el diseño, colores, animaciones y estructura.
- **Tailwind CSS**: https://tailwindcss.com/ (para estilos)
- **Framer Motion**: https://www.framer.com/motion/ (para animaciones)
- **React Markdown**: https://github.com/remarkjs/react-markdown (para Markdown)

---

## Conclusión

Con estos cambios, el proyecto `agente` tendrá una interfaz más profesional, moderna y alineada con la experiencia de usuario de **Manus IA**. Los usuarios verán respuestas estructuradas, bien formateadas y con información detallada sobre el proceso de ejecución.
