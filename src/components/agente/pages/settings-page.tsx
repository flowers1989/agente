"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
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
} from "lucide-react";
import { OPENCODE_MODELS } from "@/lib/mock-data";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const apiConfig = useAppStore((s) => s.apiConfig);
  const setAPIKey = useAppStore((s) => s.setAPIKey);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const testConnection = useAppStore((s) => s.testConnection);
  const modelParameters = useAppStore((s) => s.modelParameters);
  const setModelParameters = useAppStore((s) => s.setModelParameters);
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const logout = useAppStore((s) => s.logout);

  const [apiKey, setApiKey] = useState(apiConfig?.apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(apiConfig?.testResult);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

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
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setTesting(false);
  };

  const handleExportData = () => {
    const data = {
      user,
      apiConfig: apiConfig ? { ...apiConfig, apiKey: "sk-***" } : null,
      modelParameters,
      tasks: useAppStore.getState().tasks,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agente-ia-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados");
  };

  return (
    <MainLayout title="Configuración" subtitle="Personaliza tu experiencia con el agente">
      <Tabs defaultValue="api" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="api" className="gap-1.5">
            <KeyRound className="size-3.5" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="parameters" className="gap-1.5">
            <Sliders className="size-3.5" />
            <span className="hidden sm:inline">Parámetros</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5">
            <User className="size-3.5" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="size-3.5" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5 text-destructive">
            <AlertTriangle className="size-3.5" />
            <span className="hidden sm:inline">Zona</span>
          </TabsTrigger>
        </TabsList>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">API Key de OpenCode Go</h3>
                <p className="text-xs text-muted-foreground">Encriptada con AES-256 en tu navegador</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-apikey">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="settings-apikey"
                      type={showKey ? "text" : "password"}
                      placeholder="sk-opencode-..."
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
                  <Button variant="outline" onClick={handleTest} disabled={testing}>
                    {testing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <TestTube className="size-4" />
                    )}
                    Probar
                  </Button>
                </div>
              </div>

              {testResult === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                >
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">Conexión exitosa · {OPENCODE_MODELS.length} modelos disponibles</span>
                </motion.div>
              )}
              {testResult === "failed" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <XCircle className="size-4 text-destructive" />
                  <span className="text-sm text-destructive">API key inválida o expirada</span>
                </motion.div>
              )}

              <Button onClick={handleSaveKey}>
                <Check className="size-4" />
                Guardar API Key
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Modelo activo</h3>
                <p className="text-xs text-muted-foreground">Selecciona el modelo que se usará en las próximas tareas</p>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                value={apiConfig?.selectedModel || "kimi-k2.7-code"}
                onValueChange={(v) => {
                  setSelectedModel(v);
                  toast.success(`Modelo cambiado a ${OPENCODE_MODELS.find(m => m.id === v)?.name}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {OPENCODE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{m.specialty}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">${m.costInput}/M · {m.context}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model comparison */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {OPENCODE_MODELS.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      toast.success(`Modelo cambiado a ${m.name}`);
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      apiConfig?.selectedModel === m.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="font-semibold text-xs mb-1">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{m.specialty}</div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-primary">${m.costInput}</span>
                      <span className="text-muted-foreground">{m.context}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Parameters Tab */}
        <TabsContent value="parameters" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sliders className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Parámetros del modelo</h3>
                <p className="text-xs text-muted-foreground">Ajusta el comportamiento del modelo IA</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Temperatura</Label>
                  <span className="text-sm font-mono font-semibold text-primary">{modelParameters.temperature.toFixed(2)}</span>
                </div>
                <Slider
                  value={[modelParameters.temperature]}
                  onValueChange={([v]) => setModelParameters({ temperature: v })}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground mt-1.5">0 = determinista · 2 = muy creativo</p>
              </div>

              {/* Max tokens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Máximo de tokens</Label>
                  <span className="text-sm font-mono font-semibold text-primary">{modelParameters.maxTokens}</span>
                </div>
                <Slider
                  value={[modelParameters.maxTokens]}
                  onValueChange={([v]) => setModelParameters({ maxTokens: v })}
                  min={256}
                  max={32768}
                  step={256}
                />
                <p className="text-xs text-muted-foreground mt-1.5">Tamaño máximo de la respuesta</p>
              </div>

              {/* Top P */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Top P (Nucleus Sampling)</Label>
                  <span className="text-sm font-mono font-semibold text-primary">{modelParameters.topP.toFixed(2)}</span>
                </div>
                <Slider
                  value={[modelParameters.topP]}
                  onValueChange={([v]) => setModelParameters({ topP: v })}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground mt-1.5">Diversidad de tokens considerados</p>
              </div>

              {/* Frequency penalty */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Penalización por frecuencia</Label>
                  <span className="text-sm font-mono font-semibold text-primary">{modelParameters.frequencyPenalty.toFixed(2)}</span>
                </div>
                <Slider
                  value={[modelParameters.frequencyPenalty]}
                  onValueChange={([v]) => setModelParameters({ frequencyPenalty: v })}
                  min={-2}
                  max={2}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1.5">Reduce la repetición de tokens frecuentes</p>
              </div>

              {/* Presence penalty */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Penalización por presencia</Label>
                  <span className="text-sm font-mono font-semibold text-primary">{modelParameters.presencePenalty.toFixed(2)}</span>
                </div>
                <Slider
                  value={[modelParameters.presencePenalty]}
                  onValueChange={([v]) => setModelParameters({ presencePenalty: v })}
                  min={-2}
                  max={2}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1.5">Fomenta hablar de nuevos temas</p>
              </div>

              <Button onClick={() => toast.success("Parámetros guardados")}>
                <Check className="size-4" />
                Guardar parámetros
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Perfil</h3>
                <p className="text-xs text-muted-foreground">Tu información de cuenta</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} disabled />
                </div>
              </div>
              <Button onClick={() => toast.success("Perfil actualizado")}>Guardar cambios</Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Preferencias</h3>
                <p className="text-xs text-muted-foreground">Personaliza la interfaz</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
                  <div>
                    <div className="text-sm font-medium">Tema oscuro</div>
                    <div className="text-xs text-muted-foreground">Cambia entre modo claro y oscuro</div>
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Bell className="size-5" />
                  <div>
                    <div className="text-sm font-medium">Notificaciones</div>
                    <div className="text-xs text-muted-foreground">Recibe alertas cuando terminen las tareas</div>
                  </div>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5" />
                  <div>
                    <div className="text-sm font-medium">Autoguardar tareas</div>
                    <div className="text-xs text-muted-foreground">Guarda automáticamente el progreso</div>
                  </div>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Seguridad de la cuenta</h3>
                <p className="text-xs text-muted-foreground">Protege tu cuenta y datos</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">Verificación en 2 pasos</div>
                  <div className="text-xs text-muted-foreground">Añade una capa extra de seguridad</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info("Configuración 2FA próximamente")}>
                  Habilitar
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">Sesiones activas</div>
                  <div className="text-xs text-muted-foreground">Gestiona dispositivos conectados</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info("1 sesión activa: este navegador")}>
                  Ver (1)
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">Cambiar contraseña</div>
                  <div className="text-xs text-muted-foreground">Actualiza tu contraseña periódicamente</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info("Te enviaremos un email")}>
                  Cambiar
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">Exportar datos</div>
                  <div className="text-xs text-muted-foreground">Descarga toda tu información</div>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportData}>
                  <Download className="size-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger" className="space-y-4">
          <Card className="p-6 border-destructive/30">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Zona de peligro</h3>
                <p className="text-xs text-muted-foreground">Acciones irreversibles</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium">Cerrar sesión</div>
                  <div className="text-xs text-muted-foreground">Cierra sesión en este dispositivo</div>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="size-4" />
                  Cerrar sesión
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <div className="text-sm font-medium text-destructive">Eliminar cuenta</div>
                  <div className="text-xs text-muted-foreground">Borra permanentemente tu cuenta y todas tus tareas</div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => toast.error("Esta acción es irreversible. Contacta soporte.")}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
