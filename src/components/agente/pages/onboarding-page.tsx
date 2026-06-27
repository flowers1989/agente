"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/agente/logo";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Check,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Cpu,
} from "lucide-react";
import { AI_MODELS } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const navigate = useAppStore((s) => s.navigate);

  const handleTest = async () => {
    if (!apiKey) {
      toast.error("Introduce tu API key");
      return;
    }
    setTesting(true);
    setTestResult(null);
    setAPIKey(apiKey);
    const result = await testConnection();
    setTestResult(result.success ? "success" : "failed");
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
    setTesting(false);
  };

  const handleNext = () => {
    if (step === 1 && !apiKey) {
      toast.error("Introduce tu API key");
      return;
    }
    if (step === 1) setAPIKey(apiKey);
    if (step === 2 && testResult !== "success") {
      toast.error("Prueba la conexión primero");
      return;
    }
    if (step === 3) setSelectedModelStore(selectedModel);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleFinish = () => {
    completeOnboarding();
    toast.success("¡Listo!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top */}
      <div className="px-6 h-14 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-medium text-sm">Agente</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Hola, <span className="text-foreground font-medium">{user?.name}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-3 border-b border-border">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={cn(
                  "size-6 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-all shrink-0",
                  i < step && "bg-foreground border-foreground text-background",
                  i === step && "border-foreground text-foreground",
                  i > step && "border-border text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] hidden sm:block whitespace-nowrap",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-1 transition-colors", i < step ? "bg-foreground" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Bienvenida */}
              {step === 0 && (
                <div className="text-center">
                  <div className="inline-flex mb-6">
                    <LogoMark size={48} animated />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight mb-3">
                    ¡Bienvenido{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                  </h1>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
                    Vamos a configurar tu agente en 4 pasos sencillos.
                    Necesitarás tu API key para empezar.
                  </p>
                  <div className="border border-border rounded-lg p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <KeyRound className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm mb-1">¿No tienes API key?</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          Necesitas una para que el agente funcione.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer">
                            Obtener API key
                            <ArrowRight className="size-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: API Key */}
              {step === 1 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                      <KeyRound className="size-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">Tu API Key</h1>
                      <p className="text-xs text-muted-foreground">Se encripta localmente</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="apikey">API Key</Label>
                    <div className="relative">
                      <Input
                        id="apikey"
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
                    <p className="text-xs text-muted-foreground">
                      Se almacena encriptada en tu navegador.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Probar conexión */}
              {step === 2 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">Probar conexión</h1>
                      <p className="text-xs text-muted-foreground">Verificamos que tu API key funcione</p>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm font-medium">Estado de la conexión</div>
                        <div className="text-xs text-muted-foreground">Endpoint: /v1/models</div>
                      </div>
                      <Button onClick={handleTest} disabled={testing}>
                        {testing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Probando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4" />
                            Probar
                          </>
                        )}
                      </Button>
                    </div>

                    {testResult === "success" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-2.5 rounded-md bg-foreground/5 border border-foreground/10"
                      >
                        <CheckCircle2 className="size-4 shrink-0" />
                        <div>
                          <div className="text-xs font-medium">Conexión exitosa</div>
                          <div className="text-[10px] text-muted-foreground">
                            {AI_MODELS.length} modelos disponibles · Latencia: 142ms
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {testResult === "failed" && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20"
                      >
                        <XCircle className="size-4 shrink-0 text-destructive" />
                        <div>
                          <div className="text-xs font-medium text-destructive">Conexión fallida</div>
                          <div className="text-[10px] text-muted-foreground">Verifica tu API key</div>
                        </div>
                      </motion.div>
                    )}

                    {testResult === null && !testing && (
                      <div className="p-2.5 rounded-md bg-muted/50 text-xs text-muted-foreground text-center">
                        Haz clic en &quot;Probar&quot; para verificar
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Elegir modelo */}
              {step === 3 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                      <Cpu className="size-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">Elige tu modelo</h1>
                      <p className="text-xs text-muted-foreground">Puedes cambiarlo después</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Modelo inicial</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
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

                    {/* Quick models */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {AI_MODELS.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedModel(m.id)}
                          className={cn(
                            "p-2.5 rounded-lg border-2 text-left transition-all",
                            selectedModel === m.id ? "border-foreground bg-muted/30" : "border-border hover:border-foreground/30"
                          )}
                        >
                          <div className="font-medium text-xs">{m.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{m.specialty}</div>
                          <div className="text-[10px] font-mono mt-1 text-foreground">
                            ${m.costInput}/M · {m.context}
                          </div>
                        </button>
                      ))}
                    </div>
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
                    className="size-14 rounded-full bg-foreground/10 mx-auto mb-5 flex items-center justify-center"
                  >
                    <Check className="size-7" />
                  </motion.div>
                  <h1 className="text-xl font-semibold tracking-tight mb-2">Todo listo</h1>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
                    Tu agente está configurado. Ya puedes empezar a pedirle tareas.
                  </p>

                  <div className="border border-border rounded-lg p-4 text-left mb-6">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">API Key</span>
                        <span className="font-mono">sk-••••••</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modelo inicial</span>
                        <span className="font-medium">{AI_MODELS.find((m) => m.id === selectedModel)?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado</span>
                        <span className="text-foreground">Conectado</span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleFinish} className="w-full" size="lg">
                    <Sparkles className="size-4" />
                    Empezar a usar
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 && step < 4 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-3.5" />
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
