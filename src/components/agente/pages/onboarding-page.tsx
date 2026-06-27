"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/agente/logo";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  KeyRound,
  Zap,
  TestTube,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";
import { OPENCODE_MODELS } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = ["Bienvenida", "API Key", "Probar conexión", "Elegir modelo", "Listo"];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);
  const [selectedModel, setSelectedModel] = useState("kimi-k2.7-code");

  const setAPIKey = useAppStore((s) => s.setAPIKey);
  const testConnection = useAppStore((s) => s.testConnection);
  const setSelectedModelStore = useAppStore((s) => s.setSelectedModel);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const user = useAppStore((s) => s.user);

  const handleNext = () => {
    if (step === 1 && !apiKey) {
      toast.error("Introduce tu API key");
      return;
    }
    if (step === 1) {
      setAPIKey(apiKey);
    }
    if (step === 2 && testResult !== "success") {
      toast.error("Prueba la conexión primero");
      return;
    }
    if (step === 3) {
      setSelectedModelStore(selectedModel);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
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

  const handleFinish = () => {
    completeOnboarding();
    toast.success("¡Configuración completada!");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <div className="font-bold">Agente IA</div>
        </div>
        <div className="text-sm text-muted-foreground">
          Hola, <span className="font-medium text-foreground">{user?.name}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all shrink-0",
                  i < step && "bg-primary border-primary text-primary-foreground",
                  i === step && "border-primary text-primary",
                  i > step && "border-border text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs hidden md:block whitespace-nowrap",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-1 transition-colors", i < step ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Bienvenida */}
              {step === 0 && (
                <div className="text-center">
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 mx-auto mb-6 flex items-center justify-center">
                    <Sparkles className="size-8 text-primary-foreground" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    ¡Bienvenido, {user?.name?.split(" ")[0]}!
                  </h1>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                    Vamos a configurar tu agente en 4 pasos sencillos.
                    Necesitarás tu API key de OpenCode Go para empezar.
                  </p>
                  <Card className="p-6 text-left max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="size-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">¿No tienes API key?</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          OpenCode Go cuesta $10/mes e incluye acceso a 13 modelos IA.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer">
                            Obtener API key
                            <ArrowRight className="size-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Step 1: API Key */}
              {step === 1 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <KeyRound className="size-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Tu API Key de OpenCode Go</h1>
                      <p className="text-sm text-muted-foreground">Se encripta localmente, nunca se envía a terceros</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="apikey">API Key</Label>
                    <div className="relative">
                      <Input
                        id="apikey"
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
                    <p className="text-xs text-muted-foreground">
                      Tu API key se almacena encriptada con AES-256 en tu navegador.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Probar conexión */}
              {step === 2 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TestTube className="size-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Probar conexión</h1>
                      <p className="text-sm text-muted-foreground">Verificamos que tu API key funcione correctamente</p>
                    </div>
                  </div>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm font-medium">Estado de la conexión</div>
                        <div className="text-xs text-muted-foreground">Endpoint: opencode.ai/zen/go/v1/models</div>
                      </div>
                      <Button onClick={handleTest} disabled={testing}>
                        {testing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Probando...
                          </>
                        ) : (
                          <>
                            <Zap className="size-4" />
                            Probar ahora
                          </>
                        )}
                      </Button>
                    </div>

                    {testResult === "success" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        <div>
                          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            Conexión exitosa
                          </div>
                          <div className="text-xs text-muted-foreground">
                            13 modelos disponibles · Latencia: 142ms
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {testResult === "failed" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                      >
                        <XCircle className="size-5 text-destructive" />
                        <div>
                          <div className="text-sm font-medium text-destructive">Conexión fallida</div>
                          <div className="text-xs text-muted-foreground">Verifica tu API key e inténtalo de nuevo</div>
                        </div>
                      </motion.div>
                    )}

                    {testResult === null && !testing && (
                      <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground text-center">
                        Haz clic en &quot;Probar ahora&quot; para verificar la conexión
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Step 3: Elegir modelo */}
              {step === 3 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="size-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Elige tu modelo inicial</h1>
                      <p className="text-sm text-muted-foreground">Puedes cambiarlo en cualquier momento desde Configuración</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {OPENCODE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={cn(
                          "text-left p-3 rounded-lg border-2 transition-all relative",
                          selectedModel === m.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        {selectedModel === m.id && (
                          <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="size-3 text-primary-foreground" />
                          </div>
                        )}
                        <div className="font-semibold text-sm mb-1 pr-6">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground leading-tight mb-2">{m.specialty}</div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-primary">${m.costInput}/M</span>
                          <span className="text-muted-foreground">{m.context}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Listo */}
              {step === 4 && (
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="size-20 rounded-full bg-emerald-500/20 mx-auto mb-6 flex items-center justify-center"
                  >
                    <CheckCircle2 className="size-10 text-emerald-500" />
                  </motion.div>
                  <h1 className="text-3xl font-bold tracking-tight mb-3">¡Todo listo!</h1>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Tu agente está configurado y listo para ejecutar tareas.
                    Comienza creando tu primera tarea.
                  </p>

                  <Card className="p-6 text-left max-w-md mx-auto">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">API Key</span>
                        <span className="font-mono text-xs">sk-...•••••</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Modelo inicial</span>
                        <span className="font-medium">{OPENCODE_MODELS.find((m) => m.id === selectedModel)?.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Estado</span>
                        <span className="text-emerald-500 font-medium">Activo</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 && step < 4 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" />
                Atrás
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button onClick={handleNext} size="lg">
                {step === 0 ? "Empezar configuración" : "Continuar"}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} size="lg">
                <Sparkles className="size-4" />
                Ir al Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
