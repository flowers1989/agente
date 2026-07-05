"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserStore } from "@/lib/browser/store-browser";
import {
  Play,
  Square,
  RefreshCw,
  MousePointerClick,
  Type,
  ScrollText,
  ScanText,
  Code,
  Layers,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BrowserControlView() {
  const store = useBrowserStore();
  const [url, setUrl] = useState("https://example.com");
  const [selector, setSelector] = useState("");
  const [text, setText] = useState("");
  const [script, setScript] = useState("document.title");
  const [scrollAmount, setScrollAmount] = useState(300);
  const [clickCoordinates, setClickCoordinates] = useState({ x: 100, y: 100 });
  const screenshotRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Verifica que la sesión exista y esté activa en el backend.
  const verifySession = async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/browser/sessions/${sessionId}`);
      if (!res.ok) return false;
      const data = (await res.json()) as { session?: { id?: string; active?: boolean } };
      return !!data.session?.id;
    } catch {
      return false;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const startStream = (sessionId: string) => {
    eventSourceRef.current?.close();
    clearReconnect();
    const es = new EventSource(`/api/browser/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;
    reconnectAttemptsRef.current = 0;

    es.addEventListener("connected", () => {
      reconnectAttemptsRef.current = 0;
    });

    es.addEventListener("screenshot", (event) => {
      try {
        const data = JSON.parse(event.data);
        store.setScreenshot(data.screenshot ? `data:image/jpeg;base64,${data.screenshot}` : null);
      } catch (error) {
        console.error("Error parsing screenshot stream:", error);
      }
    });

    es.onerror = () => {
      es.close();
      const attempts = ++reconnectAttemptsRef.current;
      // Backoff exponencial: 2s, 4s, 8s, 16s, 32s. Máximo 5 intentos.
      if (attempts > 5) {
        // Antes de rendirnos, verificar si la sesión sigue activa.
        verifySession(sessionId).then((alive) => {
          if (!alive) {
            store.setError("La sesión de navegador se cerró. Inicia una nueva.");
            store.setSessionId(null);
            store.setActive(false);
          } else {
            store.setError("Conexión con el navegador perdida. Reinicia la sesión.");
          }
        });
        return;
      }
      const delay = Math.min(1000 * 2 ** attempts, 32000);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (store.sessionId === sessionId) {
          startStream(sessionId);
        }
      }, delay);
    };
  };

  // Inicia el stream automáticamente si ya hay una sesión activa (auto-start).
  // Verifica primero que la sesión siga viva en el backend para evitar errores SSE 404.
  useEffect(() => {
    if (!store.sessionId) return;
    const sessionId = store.sessionId;
    let cancelled = false;
    verifySession(sessionId).then((alive) => {
      if (cancelled) return;
      if (alive) {
        startStream(sessionId);
      } else {
        // La sesión ya no existe (servidor reiniciado o expirada). Limpiar estado.
        store.setSessionId(null);
        store.setActive(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store.sessionId]);

  // Cleanup on unmount: no cerramos la sesión para mantenerla activa en toda la app.
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      clearReconnect();
    };
  }, []);

  const startSession = async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const res = await fetch("/api/browser/sessions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error iniciando sesión");
      store.setSessionId(data.session.id);
      store.setActive(true);
      toast.success("Sesión de browser iniciada");
      startStream(data.session.id);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : String(error));
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      store.setLoading(false);
    }
  };

  const stopSession = async () => {
    if (!store.sessionId) return;
    eventSourceRef.current?.close();
    clearReconnect();
    reconnectAttemptsRef.current = 0;
    try {
      await fetch(`/api/browser/sessions/${store.sessionId}`, { method: "DELETE" });
      toast.success("Sesión detenida");
    } catch (error) {
      console.error("Error deteniendo sesión:", error);
    } finally {
      store.reset();
    }
  };

  const executeAction = async (action: string, params: Record<string, unknown> = {}) => {
    if (!store.sessionId) {
      toast.error("No hay sesión activa");
      return;
    }
    store.setLoading(true);
    try {
      const res = await fetch(`/api/browser/sessions/${store.sessionId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params }),
      });
      const data = await res.json();
      store.addLog({ action, params, result: data.success ? "success" : "error", message: data.error });

      if (!data.success) throw new Error(data.error || "Error ejecutando acción");

      if (action === "navigate" && data.data) {
        store.setUrl(data.data.url);
        store.setTitle(data.data.title);
      }
      if (action === "getDOMRepresentation" && data.data) {
        store.setElements(data.data);
      }
      if (data.screenshot) {
        store.setScreenshot(`data:image/jpeg;base64,${data.screenshot}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      store.setLoading(false);
    }
  };

  const handleScreenshotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenshotRef.current || !store.sessionId) return;
    const rect = screenshotRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setClickCoordinates({ x, y });
    void executeAction("click", { x, y });
  };

  const handleNavigate = () => {
    if (!url) return;
    void executeAction("navigate", { url });
  };

  if (!store.isActive && !store.sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Play className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">Control de navegador</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
          Inicia una sesión de Playwright para controlar un navegador real desde el agente.
        </p>
        <Button onClick={startSession} size="sm">
          <Play className="size-3.5 mr-1.5" />
          Iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Header con URL y controles principales */}
      <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
          />
          <Button onClick={handleNavigate} size="sm" className="h-8 px-2.5" disabled={store.isLoading}>
            {store.isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
          <Button
            onClick={stopSession}
            size="sm"
            variant="destructive"
            className="h-8 px-2.5"
            title="Detener control"
          >
            <Square className="size-3.5" />
            <span className="sr-only">Detener</span>
          </Button>
        </div>
        {store.title && (
          <div className="text-[10px] text-muted-foreground truncate">
            {store.title}
          </div>
        )}
      </div>

      {/* Screenshot */}
      <div className="flex-1 overflow-hidden bg-muted/30 relative min-h-0">
        {store.screenshot ? (
          <div
            ref={screenshotRef}
            onClick={handleScreenshotClick}
            className={cn(
              "w-full h-full overflow-auto flex items-start justify-center p-2",
              store.showElements && "cursor-crosshair"
            )}
          >
            <div className="relative inline-block">
              <img
                src={store.screenshot}
                alt="Browser screenshot"
                className="max-w-none border border-border shadow-sm"
                style={{ maxHeight: "100%" }}
              />
              {store.showElements &&
                store.elements.map((el) => (
                  <div
                    key={el.id}
                    className="absolute border border-emerald-500/70 bg-emerald-500/10 text-[8px] text-emerald-700 flex items-center justify-center overflow-hidden"
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                    }}
                    title={`${el.tag}${el.name ? ` - ${el.name}` : ""}`}
                  >
                    {el.interactive && <MousePointerClick className="size-3" />}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            {store.isLoading ? <Loader2 className="size-5 animate-spin" /> : "Esperando screenshot..."}
          </div>
        )}
      </div>

      {/* Error */}
      {store.error && (
        <div className="px-3 py-2 border-t border-destructive/20 bg-destructive/5 flex items-center gap-2 text-xs text-destructive shrink-0">
          <AlertCircle className="size-3.5" />
          {store.error}
        </div>
      )}

      {/* Controls */}
      <div className="border-t border-border shrink-0">
        <Tabs defaultValue="navigate" className="w-full">
          <TabsList className="w-full justify-start rounded-none h-8 bg-transparent border-b border-border px-2">
            <TabsTrigger value="navigate" className="text-[10px] h-6 px-2">
              Navegar
            </TabsTrigger>
            <TabsTrigger value="interact" className="text-[10px] h-6 px-2">
              Interactuar
            </TabsTrigger>
            <TabsTrigger value="extract" className="text-[10px] h-6 px-2">
              Extraer
            </TabsTrigger>
            <TabsTrigger value="dom" className="text-[10px] h-6 px-2">
              DOM
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-[10px] h-6 px-2">
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="navigate" className="p-2 m-0 space-y-2">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL"
                className="h-7 text-xs"
              />
              <Button onClick={handleNavigate} size="sm" className="h-7" disabled={store.isLoading}>
                Navegar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="interact" className="p-2 m-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Selector</Label>
                <Input
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  placeholder="input[name=q]"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Texto</Label>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="..."
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => executeAction("clickBySelector", { selector })}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={!selector}
              >
                <MousePointerClick className="size-3 mr-1" />
                Click
              </Button>
              <Button
                onClick={() => executeAction("type", { selector, text })}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={!selector}
              >
                <Type className="size-3 mr-1" />
                Escribir
              </Button>
              <Button
                onClick={() => executeAction("scroll", { direction: "down", amount: scrollAmount })}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <ScrollText className="size-3 mr-1" />
                Scroll abajo
              </Button>
              <Button
                onClick={() => executeAction("scroll", { direction: "up", amount: scrollAmount })}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <ScrollText className="size-3 mr-1" />
                Scroll arriba
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="extract" className="p-2 m-0 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => executeAction("extractText")}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <ScanText className="size-3 mr-1" />
                Extraer texto
              </Button>
              <Button
                onClick={() => executeAction("screenshot")}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <RefreshCw className="size-3 mr-1" />
                Screenshot
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Script</Label>
              <div className="flex gap-2">
                <Input
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="document.title"
                  className="h-7 text-xs"
                />
                <Button
                  onClick={() => executeAction("executeScript", { script })}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                >
                  <Code className="size-3 mr-1" />
                  Ejecutar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dom" className="p-2 m-0 space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={() => executeAction("getDOMRepresentation")}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <Layers className="size-3 mr-1" />
                Detectar elementos
              </Button>
              <Button
                onClick={() => store.toggleShowElements()}
                size="sm"
                variant={store.showElements ? "default" : "outline"}
                className="h-7 text-xs"
              >
                {store.showElements ? "Ocultar overlay" : "Mostrar overlay"}
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {store.elements.length} elementos detectados
            </div>
          </TabsContent>

          <TabsContent value="logs" className="p-2 m-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Acciones ejecutadas</span>
              <Button onClick={() => store.clearLogs()} size="sm" variant="ghost" className="h-6 text-[10px]">
                <Trash2 className="size-3 mr-1" />
                Limpiar
              </Button>
            </div>
            <div className="h-32 overflow-y-auto border border-border rounded-md bg-muted/30 p-2 space-y-1">
              {store.logs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">Sin acciones aún</p>
              ) : (
                store.logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "text-[10px] px-1.5 py-1 rounded",
                      log.result === "success" ? "bg-emerald-500/10" : "bg-destructive/10"
                    )}
                  >
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground ml-1">
                      {JSON.stringify(log.params)}
                    </span>
                    {log.message && <span className="text-destructive block">{log.message}</span>}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
