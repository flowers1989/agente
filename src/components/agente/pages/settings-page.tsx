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
} from "lucide-react";
import { AI_MODELS } from "@/lib/mock-data";
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
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full mb-6">
            <TabsTrigger value="api" className="text-xs gap-1">
              <KeyRound className="size-3" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="parameters" className="text-xs gap-1">
              <Sliders className="size-3" />
              <span className="hidden sm:inline">Parámetros</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs gap-1">
              <User className="size-3" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1">
              <Shield className="size-3" />
              <span className="hidden sm:inline">Seguridad</span>
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
