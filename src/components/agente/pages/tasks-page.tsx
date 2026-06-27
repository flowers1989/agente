"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { TaskCard } from "@/components/agente/task-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ListTodo, Loader2, Filter } from "lucide-react";
import { OPENCODE_MODELS, TOOLS } from "@/lib/mock-data";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "running", label: "En ejecución" },
  { value: "completed", label: "Completadas" },
  { value: "failed", label: "Fallidas" },
];

export function TasksPage() {
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const startExecution = useAppStore((s) => s.startExecution);
  const apiConfig = useAppStore((s) => s.apiConfig);

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [constraints, setConstraints] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(apiConfig?.selectedModel || "kimi-k2.7-code");
  const [creating, setCreating] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!name || !objective) {
      toast.error("Nombre y objetivo son obligatorios");
      return;
    }
    setCreating(true);
    await new Promise((r) => setTimeout(r, 600));
    const id = addTask({
      name,
      description: description || name,
      objective,
      constraints: constraints ? constraints.split("\n").filter(Boolean) : undefined,
      selectedTools: selectedTools.length > 0 ? selectedTools : undefined,
      modelUsed: selectedModel,
      tags: [],
    });
    setCreating(false);
    setShowCreate(false);
    setName("");
    setDescription("");
    setObjective("");
    setConstraints("");
    setSelectedTools([]);
    toast.success("Tarea creada. Iniciando ejecución...");
    setTimeout(() => startExecution(id), 500);
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  return (
    <MainLayout title="Tareas" subtitle={`${tasks.length} tareas · ${tasks.filter(t => t.status === "running").length} en ejecución`}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tareas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="size-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            Nueva Tarea
          </Button>
        </div>

        {/* Tasks grid */}
        {filteredTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="size-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <ListTodo className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {search || statusFilter !== "all" ? "No se encontraron tareas" : "Aún no tienes tareas"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== "all"
                ? "Prueba con otros filtros de búsqueda"
                : "Crea tu primera tarea y deja que el agente trabaje por ti"}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="size-4" />
                Crear tarea
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TaskCard task={task} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Nueva Tarea</DialogTitle>
            <DialogDescription>
              Define el objetivo. El agente planificará y ejecutará automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Análisis de competencia"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción breve</Label>
              <Input
                id="description"
                placeholder="Resumen de la tarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Objective */}
            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo *</Label>
              <Textarea
                id="objective"
                placeholder="Describe en detalle qué quieres lograr. Ej: Investiga los 5 principales competidores en el mercado de herramientas AI y genera un reporte comparativo en PDF con pricing, features y recomendaciones."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Sé específico. Mientras más contexto des, mejor será el plan del agente.
              </p>
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <Label htmlFor="constraints">Restricciones (una por línea)</Label>
              <Textarea
                id="constraints"
                placeholder={"Ej: Solo empresas con >$1M ARR\nMercado: Latam\nIncluir análisis de pricing"}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Model selection */}
            <div className="space-y-2">
              <Label>Modelo a utilizar</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {OPENCODE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">${m.costInput}/M · {m.context}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tools selection */}
            <div className="space-y-2">
              <Label>Herramientas sugeridas (opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Si no seleccionas ninguna, el agente elegirá automáticamente las apropiadas.
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.name)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
                      selectedTools.includes(tool.name)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "size-4 rounded border flex items-center justify-center shrink-0",
                      selectedTools.includes(tool.name) ? "bg-primary border-primary" : "border-border"
                    )}>
                      {selectedTools.includes(tool.name) && (
                        <svg className="size-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 truncate">{tool.name}</span>
                    <Badge variant="outline" className="text-[9px] py-0 h-4 shrink-0">
                      {tool.category}
                    </Badge>
                  </button>
                ))}
              </div>
              {selectedTools.length > 0 && (
                <p className="text-xs text-primary">{selectedTools.length} herramienta(s) seleccionada(s)</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Crear y ejecutar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
