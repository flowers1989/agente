# Mejoras de Componentes - Ejemplos Prácticos

Este documento proporciona ejemplos de código para mejorar componentes específicos del frontend para alinearse con el estilo de Manus IA.

---

## 1. Mejorar MessageBubble en chat-panel.tsx

### Antes
```tsx
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-foreground text-background rounded-2xl rounded-br-md px-3.5 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="text-[10px] opacity-60 mt-1.5">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
        <LogoMark size={16} />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* ... rest of code */}
      </div>
    </motion.div>
  );
}
```

### Después
```tsx
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-foreground text-background rounded-2xl rounded-br-md px-3.5 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="text-[10px] opacity-60 mt-1.5">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      {/* Mejorado: Avatar con gradiente y badge */}
      <div className="flex flex-col items-center gap-1.5 shrink-0 mt-0.5">
        <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg">
          <LogoMark size={18} />
        </div>
        <span className="text-[8px] font-semibold text-violet-500 uppercase tracking-wider">
          Manus
        </span>
      </div>
      
      <div className="flex-1 min-w-0 space-y-3">
        {/* Indicador "Trabajando..." mejorado */}
        {message.agentStatus &&
          message.agentStatus !== "completed" &&
          message.agentStatus !== "failed" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span className="size-1.5 rounded-full bg-violet-500 animate-pulse animation-delay-100" />
                <span className="size-1.5 rounded-full bg-violet-500 animate-pulse animation-delay-200" />
              </div>
              <span>Procesando...</span>
            </div>
          )}

        {/* Contenido Markdown */}
        {message.content && (
          <Markdown content={message.content} />
        )}

        {/* Steps mejorados */}
        {message.steps && message.steps.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <div className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Pasos Ejecutados
            </div>
            <div className="space-y-1.5">
              {message.steps.map((step) => (
                <StepRowImproved key={step.id} step={step} />
              ))}
            </div>
          </div>
        )}

        {/* Output mejorado */}
        {message.output &&
          (message.agentStatus === "completed" || message.agentStatus === "failed") && (
            <OutputBlockImproved message={message} />
          )}
      </div>
    </motion.div>
  );
}
```

---

## 2. Mejorar StepRow en chat-panel.tsx

### Antes
```tsx
function StepRow({ step }: { step: ExecutionStep }) {
  const Icon = PRODUCES_ICON[step.produces || "output"] || FileText;
  const setWorkspaceTab = useExecutionStore((s) => s.setWorkspaceTab);

  const handleClick = () => {
    if (step.produces) {
      setWorkspaceTab(step.produces);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={step.status === "pending"}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors text-xs",
        step.status === "pending"
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-muted/60 cursor-pointer"
      )}
    >
      <div className="size-4 shrink-0 flex items-center justify-center">
        {step.status === "completed" && <Check className="size-3.5 text-foreground" />}
        {step.status === "running" && <Loader2 className="size-3.5 animate-spin text-foreground" />}
        {step.status === "failed" && <span className="text-destructive text-xs">✕</span>}
        {step.status === "pending" && <div className="size-1.5 rounded-full border border-muted-foreground" />}
      </div>
      <span
        className={cn(
          "flex-1 truncate",
          step.status === "completed" && "text-muted-foreground line-through decoration-muted-foreground/40",
          step.status === "running" && "text-foreground font-medium",
          step.status === "failed" && "text-destructive",
          step.status === "pending" && "text-muted-foreground"
        )}
      >
        {step.description}
      </span>
      {step.duration && step.status === "completed" && (
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{step.duration}s</span>
      )}
      {step.status !== "pending" && <Icon className="size-3 text-muted-foreground/60 shrink-0" />}
      {step.status !== "pending" && <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />}
    </button>
  );
}
```

### Después
```tsx
function StepRowImproved({ step }: { step: ExecutionStep }) {
  const Icon = PRODUCES_ICON[step.produces || "output"] || FileText;
  const setWorkspaceTab = useExecutionStore((s) => s.setWorkspaceTab);

  const handleClick = () => {
    if (step.produces) {
      setWorkspaceTab(step.produces);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={step.status === "pending"}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-all text-xs border border-transparent",
        step.status === "pending"
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-muted/60 hover:border-border/60 cursor-pointer"
      )}
    >
      {/* Status Icon mejorado */}
      <div className="size-5 shrink-0 flex items-center justify-center rounded-full">
        {step.status === "completed" && (
          <div className="size-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="size-3 text-green-500" />
          </div>
        )}
        {step.status === "running" && (
          <div className="size-5 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Loader2 className="size-3 animate-spin text-violet-500" />
          </div>
        )}
        {step.status === "failed" && (
          <div className="size-5 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-destructive text-xs font-bold">✕</span>
          </div>
        )}
        {step.status === "pending" && (
          <div className="size-5 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>

      {/* Descripción y Detalles */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate font-medium",
            step.status === "completed" && "text-muted-foreground line-through decoration-muted-foreground/40",
            step.status === "running" && "text-foreground",
            step.status === "failed" && "text-destructive",
            step.status === "pending" && "text-muted-foreground"
          )}
        >
          {step.description}
        </p>
        
        {/* Información adicional */}
        {step.status !== "pending" && (
          <div className="text-[9px] text-muted-foreground/60 mt-0.5 flex items-center gap-1.5">
            {step.agent && <span className="capitalize">{step.agent}</span>}
            {step.duration && (
              <>
                <span>·</span>
                <span>{step.duration}s</span>
              </>
            )}
            {step.modelUsed && (
              <>
                <span>·</span>
                <span className="truncate">{step.modelUsed}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Icono de tipo de output */}
      {step.status !== "pending" && (
        <Icon className="size-3.5 text-muted-foreground/60 shrink-0" />
      )}
    </button>
  );
}
```

---

## 3. Mejorar OutputBlock en chat-panel.tsx

### Después
```tsx
function OutputBlockImproved({ message }: { message: ChatMessage }) {
  const output = message.output!;
  const setWorkspace = useExecutionStore((s) => s.setWorkspace);
  const workspaceCollapsed = useExecutionStore((s) => s.workspaceCollapsed);
  const toggleWorkspace = useExecutionStore((s) => s.toggleWorkspace);

  const handleView = () => {
    if (workspaceCollapsed) toggleWorkspace();
    setWorkspace({
      activeTab:
        output.type === "code"
          ? "files"
          : "output",
      output: {
        type: output.type === "html" ? "html" : output.type === "code" ? "code" : "text",
        content: output.content,
        title: output.title,
        language: output.language,
      },
      ...(output.type === "code"
        ? {
            activeFile: {
              name: output.title || "output.ts",
              content: output.content,
              language: output.language || "typescript",
            },
          }
        : {}),
    });
  };

  const handleExport = (format: ExportFormat) => {
    const baseName = output.filename || output.title || "reporte";
    exportReport(output.content, format, baseName);
  };

  const exportOptions: { label: string; format: ExportFormat }[] = [
    { label: "Markdown (.md)", format: "markdown" },
    { label: "PDF (.pdf)", format: "pdf" },
    { label: "HTML (.html)", format: "html" },
    { label: "Texto (.txt)", format: "txt" },
    { label: "Excel (.xlsx)", format: "excel" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border p-4 mt-2",
        message.agentStatus === "failed"
          ? "bg-destructive/5 border-destructive/20"
          : "bg-gradient-to-br from-violet-500/5 to-blue-500/5 border-violet-500/20"
      )}
    >
      {/* Header mejorado */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {message.agentStatus === "failed" ? (
            <span className="text-destructive text-xs">✕</span>
          ) : (
            <Sparkles className="size-4 text-violet-500" />
          )}
          <div>
            <div className="text-xs font-semibold text-foreground">
              {output.title || "Resultado"}
            </div>
            {output.type && (
              <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                Tipo: {output.type} {output.language && `(${output.language})`}
              </div>
            )}
          </div>
        </div>
        
        {/* Badges de información */}
        <div className="flex items-center gap-1.5">
          {message.agentStatus === "completed" && (
            <span className="text-[8px] font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-600">
              Completado
            </span>
          )}
          {message.agentStatus === "failed" && (
            <span className="text-[8px] font-semibold px-2 py-1 rounded-full bg-destructive/20 text-destructive">
              Fallido
            </span>
          )}
        </div>
      </div>

      {/* Advertencia de API key */}
      {output.content.includes("API KEY REQUERIDA") && (
        <div className="mb-3 rounded bg-destructive/10 border border-destructive/20 px-3 py-2 text-[11px] text-destructive font-medium">
          ⚠️ Falta una API key válida. Configúrala en Configuración → API.
        </div>
      )}

      {/* Contenido */}
      <div className="max-h-64 overflow-hidden relative mb-3">
        <Markdown content={output.content} compact />
        {output.content.length > 800 && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {/* Indicador de truncado */}
      {output.content.length > 400 && (
        <div className="mb-2 text-[10px] text-muted-foreground/70 italic">
          El contenido está truncado. Abre el workspace para verlo completo.
        </div>
      )}

      {/* Acciones mejoradas */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleView}
          className="text-[10px] font-medium px-2.5 py-1.5 rounded-md bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 transition-colors flex items-center gap-1.5"
        >
          <Eye className="size-3" />
          Ver en Workspace
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[10px] font-medium px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5">
              <Download className="size-3" />
              Descargar
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {exportOptions.map((opt) => (
              <DropdownMenuItem 
                key={opt.format} 
                onClick={() => handleExport(opt.format)} 
                className="text-xs cursor-pointer"
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => {
            navigator.clipboard.writeText(output.content);
            // Mostrar notificación de éxito
          }}
          className="text-[10px] font-medium px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5"
        >
          <Copy className="size-3" />
          Copiar
        </button>
      </div>
    </motion.div>
  );
}
```

---

## 4. Mejorar Markdown Component

### Cambios en markdown.tsx
```tsx
export function Markdown({ content, className, compact }: MarkdownProps) {
  return (
    <div
      className={cn(
        "text-sm text-foreground/90 leading-relaxed",
        // Encabezados mejorados con gradiente
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-transparent [&_h1]:bg-clip-text [&_h1]:bg-gradient-to-r [&_h1]:from-violet-500 [&_h1]:to-blue-500 [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-3",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-foreground",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
        "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:text-foreground",
        
        // Párrafos y listas
        "[&_p]:my-2.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul>li]:my-1.5",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li]:my-1.5",
        "[&_li]:leading-relaxed",
        
        // Enlaces mejorados
        "[&_a]:text-violet-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium dark:[&_a]:text-violet-400 [&_a]:break-words hover:[&_a]:text-violet-700",
        
        // Citas mejoradas
        "[&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:bg-muted/30 [&_blockquote]:py-2 [&_blockquote]:pr-3 [&_blockquote]:rounded-r",
        
        // Código mejorado
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_code]:bg-muted [&_code]:text-foreground [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono [&_code]:before:content-none [&_code]:after:content-none [&_code]:border [&_code]:border-border/40",
        "[&_pre]:bg-muted/80 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs [&_pre_code]:text-foreground/90",
        
        // Líneas horizontales
        "[&_hr]:my-4 [&_hr]:border-border",
        
        // Tablas mejoradas
        "[&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:text-xs [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-border [&_table]:shadow-sm",
        "[&_thead]:bg-muted/60 [&_thead]:border-b [&_thead]:border-border",
        "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:bg-muted/40",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
        "[&_tbody_tr:nth-child(even)]:bg-muted/20",
        "[&_tbody_tr:hover]:bg-muted/40",
        
        // Modo compacto
        compact &&
          "[&_h1]:text-lg [&_h1]:mt-2 [&_h1]:mb-1.5 [&_h1]:border-b-0 [&_h1]:pb-0 [&_h2]:text-base [&_h2]:mt-2 [&_h2]:mb-1",
        
        className
      )}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Personalizar componentes si es necesario
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

---

## 5. Añadir Animaciones Personalizadas

### Crear archivo `animations.css`
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

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

/* Delays para animaciones escalonadas */
.animation-delay-100 {
  animation-delay: 100ms;
}

.animation-delay-200 {
  animation-delay: 200ms;
}

.animation-delay-300 {
  animation-delay: 300ms;
}
```

---

## Conclusión

Estos ejemplos proporcionan una base sólida para mejorar el frontend del proyecto `agente`. Implementar estos cambios gradualmente mejorará significativamente la experiencia del usuario y alineará el proyecto con el estilo de **Manus IA**.
