"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogoMark } from "@/components/agente/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  KeyRound,
  TestTube,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Sliders,
  Shield,
  User,
  Bell,
  Moon,
  Sun,
  Trash2,
  AlertTriangle,
  Download,
  LogOut,
  Cpu,
  Brain,
  Database,
  Lightbulb,
  Plug,
  Clock,
  Plus,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import { AI_MODELS, AGENT_LIST, AGENT_MODEL_ASSIGNMENTS } from "@/lib/mock-data";
import { useMemoryStore } from "@/lib/memory/memory-store";
import { ConnectorsPanel } from "@/components/integration/ConnectorsPanel";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const navigate = useAppStore((s) => s.navigate);
  const apiConfig = useAppStore((s) => s.apiConfig);
  const setAPIKey = useAppStore((s) => s.setAPIKey);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const testConnection = useAppStore((s) => s.testConnection);
  const modelParameters = useAppStore((s) => s.modelParameters);
  const setModelParameters = useAppStore((s) => s.setModelParameters);
  const preferences = useAppStore((s) => s.preferences);
  const setPreferences = useAppStore((s) => s.setPreferences);
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const logout = useAppStore((s) => s.logout);

  const [apiKey, setApiKey] = useState(apiConfig?.apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(apiConfig?.testResult || null);

  const handleSaveKey = () => {
    if (!apiKey) {
      toast.error("Introduce una API key");
      return;
    }
    setAPIKey(apiKey);
    toast.success("API key guardada");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setAPIKey(apiKey);
    const result = await testConnection();
    setTestResult(result.success ? "success" : "failed");
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
    setTesting(false);
  };

  const handleExportData = () => {
    const data = {
      user,
      apiConfig: apiConfig ? { ...apiConfig, apiKey: "sk-***" } : null,
      modelParameters,
      preferences,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agente-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados");
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("app")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-sm font-medium">Agente</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Configuración</h1>
        <p className="text-sm text-muted-foreground mb-8">Gestiona tu cuenta y conexión.</p>

        <Tabs defaultValue="api">
          <TabsList className="grid grid-cols-2 sm:grid-cols-9 w-full mb-6">
            <TabsTrigger value="api" className="text-xs gap-1">
              <KeyRound className="size-3" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs gap-1">
              <Plug className="size-3" />
              <span className="hidden sm:inline">Integraciones</span>
            </TabsTrigger>
            <TabsTrigger value="parameters" className="text-xs gap-1">
              <Sliders className="size-3" />
              <span className="hidden sm:inline">Parámetros</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs gap-1">
              <Brain className="size-3" />
              <span className="hidden sm:inline">Agentes</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs gap-1">
              <Database className="size-3" />
              <span className="hidden sm:inline">Memoria</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs gap-1">
              <User className="size-3" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1">
              <Shield className="size-3" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs gap-1">
              <Clock className="size-3" />
              <span className="hidden sm:inline">Tareas</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="text-xs gap-1 text-destructive">
              <AlertTriangle className="size-3" />
              <span className="hidden sm:inline">Zona</span>
            </TabsTrigger>
          </TabsList>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-4">
            <Section icon={KeyRound} title="API Key">
              <div className="space-y-2">
                <Label className="text-xs">Clave de acceso</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={handleTest} disabled={testing || !apiKey}>
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <TestTube className="size-4" />}
                    Probar
                  </Button>
                </div>
                {testResult === "success" && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-foreground/5 border border-foreground/10">
                    <CheckCircle2 className="size-3.5" />
                    <span className="text-xs">Conexión activa · {AI_MODELS.length} modelos disponibles</span>
                  </div>
                )}
                {testResult === "failed" && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                    <XCircle className="size-3.5 text-destructive" />
                    <span className="text-xs text-destructive">API key inválida</span>
                  </div>
                )}
                <Button onClick={handleSaveKey} size="sm">
                  <Check className="size-3.5" />
                  Guardar
                </Button>
              </div>
            </Section>

            <Section icon={Zap} title="Modelo activo">
              <div className="space-y-2">
                <Label className="text-xs">Modelo por defecto</Label>
                <Select
                  value={apiConfig?.selectedModel || "kimi-k2.7-code"}
                  onValueChange={(v) => {
                    setSelectedModel(v);
                    toast.success(`Modelo: ${AI_MODELS.find((m) => m.id === v)?.name}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {AI_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">· {m.specialty}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {AI_MODELS.length} modelos disponibles. Puedes cambiarlo en cualquier momento.
                </p>
              </div>
            </Section>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <Section icon={Plug} title="Conectores">
              <p className="text-xs text-muted-foreground mb-3">
                Conecta aplicaciones externas para que el agente pueda ejecutar acciones reales.
              </p>
              <ConnectorsPanel />
            </Section>
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-4">
            <Section icon={Sliders} title="Parámetros del modelo">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Temperatura</Label>
                    <span className="text-xs font-mono font-semibold">{modelParameters.temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[modelParameters.temperature]}
                    onValueChange={([v]) => setModelParameters({ temperature: v })}
                    min={0}
                    max={2}
                    step={0.05}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">0 = determinista · 2 = creativo</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Máximo de tokens</Label>
                    <span className="text-xs font-mono font-semibold">{modelParameters.maxTokens}</span>
                  </div>
                  <Slider
                    value={[modelParameters.maxTokens]}
                    onValueChange={([v]) => setModelParameters({ maxTokens: v })}
                    min={256}
                    max={32768}
                    step={256}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Tamaño máximo de respuesta</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Top P</Label>
                    <span className="text-xs font-mono font-semibold">{modelParameters.topP.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[modelParameters.topP]}
                    onValueChange={([v]) => setModelParameters({ topP: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Nucleus sampling</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Penalización por frecuencia</Label>
                    <span className="text-xs font-mono font-semibold">{modelParameters.frequencyPenalty.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[modelParameters.frequencyPenalty]}
                    onValueChange={([v]) => setModelParameters({ frequencyPenalty: v })}
                    min={-2}
                    max={2}
                    step={0.1}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Penalización por presencia</Label>
                    <span className="text-xs font-mono font-semibold">{modelParameters.presencePenalty.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[modelParameters.presencePenalty]}
                    onValueChange={([v]) => setModelParameters({ presencePenalty: v })}
                    min={-2}
                    max={2}
                    step={0.1}
                  />
                </div>

                <Button onClick={() => toast.success("Parámetros guardados")} size="sm">
                  <Check className="size-3.5" />
                  Guardar parámetros
                </Button>
              </div>
            </Section>
          </TabsContent>

          {/* Agents Tab - Los 7 agentes con sus modelos asignados */}
          <TabsContent value="agents" className="space-y-4">
            <Section icon={Brain} title="Sistema de Agentes">
              <p className="text-xs text-muted-foreground mb-3">
                7 agentes especializados trabajan en conjunto. Cada uno usa el modelo OpenCode Go
                ideal para su tarea. El usuario no ve qué agente está activo - solo ve "Trabajando...".
              </p>
              <div className="space-y-2">
                {AGENT_LIST.map((agent, i) => {
                  const assignment = AGENT_MODEL_ASSIGNMENTS[i];
                  const model = AI_MODELS.find((m) => m.id === agent.modelId);
                  return (
                    <div key={agent.type} className="p-3 rounded-lg border border-border bg-background/50">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0 text-xs font-semibold">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{agent.name}</span>
                            <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono">
                              {model?.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{agent.description}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {agent.responsibilities.map((r) => (
                              <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {r}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>Velocidad: {"★".repeat(agent.speed)}</span>
                            <span>Costo: {"★".repeat(agent.cost)}</span>
                            <span>Calidad: {"★".repeat(agent.quality)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section icon={Cpu} title="Distribución de Costos">
              <p className="text-xs text-muted-foreground mb-3">
                Presupuesto mensual recomendado: $60 (plan OpenCode Go).
              </p>
              <div className="space-y-1.5">
                {[
                  { agent: "Analizador", pct: 5, amount: "$3.00" },
                  { agent: "Planificador", pct: 15, amount: "$9.00" },
                  { agent: "Ejecutor", pct: 40, amount: "$24.00" },
                  { agent: "Verificador", pct: 15, amount: "$9.00" },
                  { agent: "Optimizador", pct: 10, amount: "$6.00" },
                  { agent: "Reportero", pct: 10, amount: "$6.00" },
                  { agent: "Monitor", pct: 5, amount: "$3.00" },
                ].map((item) => (
                  <div key={item.agent} className="flex items-center gap-3">
                    <span className="text-xs w-24 shrink-0">{item.agent}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-foreground" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono w-12 text-right">{item.amount}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* Memory Tab - Sistema de memoria persistente */}
          <TabsContent value="memory" className="space-y-4">
            <Section icon={Database} title="Sistema de Memoria Persistente">
              <p className="text-xs text-muted-foreground mb-3">
                Los 7 agentes leen y escriben en 3 tipos de memoria.
                Working es volátil, Episodic y Semantic persisten entre sesiones.
              </p>
              <MemoryStats />
            </Section>

            <Section icon={Lightbulb} title="Patrones Aprendidos (Semantic Memory)">
              <SemanticMemoryList />
            </Section>

            <Section icon={Database} title="Historial de Tareas (Episodic Memory)">
              <EpisodicMemoryList />
            </Section>

            <Section icon={Trash2} title="Gestión de Memoria">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                  <div>
                    <div className="text-sm">Limpiar memoria volátil</div>
                    <div className="text-[10px] text-muted-foreground">Working memory (contexto actual)</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      useMemoryStore.getState().clearWorking();
                      toast.success("Working memory limpiada");
                    }}
                  >
                    Limpiar
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-md border border-destructive/30 bg-destructive/5">
                  <div>
                    <div className="text-sm text-destructive">Borrar toda la memoria</div>
                    <div className="text-[10px] text-muted-foreground">Elimina patrones aprendidos e historial</div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("¿Borrar TODA la memoria? Esto eliminará patrones aprendidos.")) {
                        useMemoryStore.getState().clearAll();
                        toast.success("Memoria borrada");
                      }
                    }}
                  >
                    Borrar todo
                  </Button>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Section icon={User} title="Perfil">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input value={user?.name || ""} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={user?.email || ""} readOnly className="mt-1 bg-muted/30" />
                </div>
              </div>
            </Section>

            <Section icon={Cpu} title="Apariencia">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  <span className="text-sm">Tema</span>
                </div>
                <div className="flex bg-background rounded-md p-0.5 border border-border">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded transition-colors",
                        theme === t ? "bg-foreground text-background" : "text-muted-foreground"
                      )}
                    >
                      {t === "dark" ? "Oscuro" : "Claro"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 mt-2">
                <div className="flex items-center gap-2">
                  <Bell className="size-4" />
                  <div>
                    <div className="text-sm">Notificaciones</div>
                    <div className="text-[10px] text-muted-foreground">Alertas al terminar tareas</div>
                  </div>
                </div>
                <Switch
                  checked={preferences.notifications}
                  onCheckedChange={(v) => setPreferences({ notifications: v })}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 mt-2">
                <div className="flex items-center gap-2">
                  <Check className="size-4" />
                  <div>
                    <div className="text-sm">Autoguardar</div>
                    <div className="text-[10px] text-muted-foreground">Guarda progreso automáticamente</div>
                  </div>
                </div>
                <Switch
                  checked={preferences.autoSaveTasks}
                  onCheckedChange={(v) => setPreferences({ autoSaveTasks: v })}
                />
              </div>
            </Section>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Section icon={Shield} title="Seguridad">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                  <div>
                    <div className="text-sm">Verificación en 2 pasos</div>
                    <div className="text-[10px] text-muted-foreground">Capa extra de seguridad</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info("Próximamente")}>
                    Habilitar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                  <div>
                    <div className="text-sm">Sesiones activas</div>
                    <div className="text-[10px] text-muted-foreground">Dispositivos conectados</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info("1 sesión activa")}>
                    Ver (1)
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                  <div>
                    <div className="text-sm">Cambiar contraseña</div>
                    <div className="text-[10px] text-muted-foreground">Actualízala periódicamente</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info("Email enviado")}>
                    Cambiar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                  <div>
                    <div className="text-sm">Exportar datos</div>
                    <div className="text-[10px] text-muted-foreground">Descarga tu información</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download className="size-3.5" />
                    Exportar
                  </Button>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Section icon={Clock} title="Tareas programadas">
              <ScheduledTasksPanel />
            </Section>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="space-y-4">
            <Section icon={AlertTriangle} title="Zona de peligro">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-md border border-border">
                  <div>
                    <div className="text-sm">Cerrar sesión</div>
                    <div className="text-[10px] text-muted-foreground">Cierra sesión en este dispositivo</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="size-3.5" />
                    Salir
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md border border-destructive/30 bg-destructive/5">
                  <div>
                    <div className="text-sm text-destructive">Eliminar cuenta</div>
                    <div className="text-[10px] text-muted-foreground">Borra todo permanentemente</div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => toast.error("Esta acción es irreversible")}
                  >
                    <Trash2 className="size-3.5" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof KeyRound;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      <div className="space-y-3 pl-5 border-l border-border">{children}</div>
    </div>
  );
}

function MemoryStats() {
  const working = useMemoryStore((s) => s.working.length);
  const episodic = useMemoryStore((s) => s.episodic.length);
  const semantic = useMemoryStore((s) => s.semantic.length);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="p-3 rounded-lg border border-border bg-background/50">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          <Brain className="size-2.5" />
          Working
        </div>
        <div className="text-xl font-semibold">{working}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">Volátil</div>
      </div>
      <div className="p-3 rounded-lg border border-border bg-background/50">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          <Database className="size-2.5" />
          Episodic
        </div>
        <div className="text-xl font-semibold">{episodic}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">Persistente</div>
      </div>
      <div className="p-3 rounded-lg border border-border bg-background/50">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          <Lightbulb className="size-2.5" />
          Semantic
        </div>
        <div className="text-xl font-semibold">{semantic}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">Persistente</div>
      </div>
    </div>
  );
}

function SemanticMemoryList() {
  const semantic = useMemoryStore((s) => s.semantic);

  if (semantic.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Aún no hay patrones aprendidos. Ejecuta tareas para que el agente aprenda.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {semantic.slice(0, 10).map((entry) => (
        <div key={entry.id} className="p-2 rounded border border-border bg-background/50">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs text-foreground/90">{entry.value}</p>
            {entry.confidence !== undefined && (
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                {Math.round(entry.confidence * 100)}%
              </span>
            )}
          </div>
          <div className="text-[9px] text-muted-foreground">
            {new Date(entry.timestamp).toLocaleString("es-ES")}
          </div>
        </div>
      ))}
    </div>
  );
}

function EpisodicMemoryList() {
  const episodic = useMemoryStore((s) => s.episodic);

  if (episodic.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Aún no hay tareas en el historial.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {episodic.slice(0, 20).map((entry) => (
        <div key={entry.id} className="p-2 rounded border border-border bg-background/50">
          <div className="flex items-start justify-between gap-2 mb-1">
            <code className="text-[10px] font-mono text-foreground/70 truncate">{entry.key}</code>
            {entry.success !== undefined && (
              <span className={cn("text-[9px] shrink-0", entry.success ? "text-emerald-500" : "text-destructive")}>
                {entry.success ? "✓" : "✕"}
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/90 line-clamp-2">{entry.value}</p>
          <div className="text-[9px] text-muted-foreground mt-1">
            {new Date(entry.timestamp).toLocaleString("es-ES")}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== PANEL DE TAREAS PROGRAMADAS ====================
function ScheduledTasksPanel() {
  const [tasks, setTasks] = useState<
    {
      id: string;
      name: string;
      description: string;
      cronExpression: string;
      enabled: boolean;
      lastRunAt?: string;
      nextRunAt?: string;
      lastStatus?: string;
      runCount: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", description: "", cronExpression: "0 9 * * 1-5" });

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron");
      if (res.ok) {
        const data = (await res.json()) as { tasks: typeof tasks };
        setTasks(data.tasks ?? []);
      }
    } catch {
      toast.error("Error al cargar tareas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTask.name || !newTask.description || !newTask.cronExpression) {
      toast.error("Completa todos los campos");
      return;
    }
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        toast.success("Tarea creada");
        setCreating(false);
        setNewTask({ name: "", description: "", cronExpression: "0 9 * * 1-5" });
        await loadTasks();
      } else {
        toast.error("Error al crear tarea");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/cron?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
      toast.success(enabled ? "Tarea activada" : "Tarea pausada");
    } catch {
      toast.error("Error al actualizar tarea");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/cron?id=${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tarea eliminada");
    } catch {
      toast.error("Error al eliminar tarea");
    }
  };

  // Cargar tareas al montar
  useState(() => {
    void loadTasks();
  });

  const CRON_PRESETS = [
    { label: "Cada 5 minutos", value: "*/5 * * * *" },
    { label: "Cada hora", value: "0 * * * *" },
    { label: "Diario a las 9am", value: "0 9 * * *" },
    { label: "Lunes a viernes 9am", value: "0 9 * * 1-5" },
    { label: "Primer día del mes", value: "0 0 1 * *" },
    { label: "Cada domingo", value: "0 10 * * 0" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          El agente ejecutará estas tareas automáticamente según el horario definido.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => setCreating(!creating)}>
            <Plus className="size-3.5" />
            Nueva tarea
          </Button>
        </div>
      </div>

      {/* Formulario de nueva tarea */}
      {creating && (
        <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
          <h3 className="text-xs font-semibold">Nueva tarea programada</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                placeholder="Ej: Resumen diario de emails"
                value={newTask.name}
                onChange={(e) => setNewTask((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Descripción (qué debe hacer el agente)</Label>
              <Input
                placeholder="Ej: Revisar emails sin leer y generar un resumen"
                value={newTask.description}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Horario</Label>
              <div className="flex gap-2 mt-1">
                <Select
                  value={newTask.cronExpression}
                  onValueChange={(v) => setNewTask((p) => ({ ...p, cronExpression: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="text-xs">{p.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 font-mono">{p.value}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{newTask.cronExpression}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}>
              <Check className="size-3.5" />
              Crear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de tareas */}
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center">
          No hay tareas programadas. Crea una para que el agente trabaje de forma autónoma.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="p-3 rounded-lg border border-border bg-background/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{task.name}</span>
                    {task.lastStatus && (
                      <Badge
                        variant={task.lastStatus === "success" ? "default" : "destructive"}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {task.lastStatus === "success" ? "OK" : "Error"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {task.cronExpression}
                    </span>
                    {task.nextRunAt && (
                      <span className="text-[10px] text-muted-foreground">
                        Próxima: {new Date(task.nextRunAt).toLocaleString("es-ES")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{task.runCount} ejecuciones</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => handleToggle(task.id, !task.enabled)}
                    title={task.enabled ? "Pausar" : "Activar"}
                  >
                    {task.enabled ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(task.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
