"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Repeat2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Filter,
  Trash2,
} from "lucide-react";
import { OPENCODE_MODELS, timeAgo, formatDuration } from "@/lib/mock-data";
import { toast } from "sonner";
import { TaskDetailModal } from "@/components/agente/task-detail-modal";
import type { Task } from "@/lib/types";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendiente", color: "text-muted-foreground", icon: Clock },
  running: { label: "Ejecutando", color: "text-primary", icon: Loader2 },
  completed: { label: "Completada", color: "text-emerald-500", icon: CheckCircle2 },
  failed: { label: "Fallida", color: "text-destructive", icon: XCircle },
  paused: { label: "Pausada", color: "text-amber-500", icon: Clock },
  cancelled: { label: "Cancelada", color: "text-muted-foreground", icon: XCircle },
};

export function HistoryPage() {
  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const startExecution = useAppStore((s) => s.startExecution);
  const navigate = useAppStore((s) => s.navigate);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchModel = modelFilter === "all" || t.modelUsed === modelFilter;
    return matchSearch && matchStatus && matchModel;
  });

  const handleExport = () => {
    const csv = [
      ["Nombre", "Descripción", "Estado", "Modelo", "Creada", "Completada"].join(","),
      ...filteredTasks.map((t) => [
        `"${t.name}"`,
        `"${t.description}"`,
        t.status,
        t.modelUsed,
        t.createdAt,
        t.completedAt || "",
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Historial exportado");
  };

  return (
    <MainLayout title="Historial" subtitle={`${tasks.length} tareas registradas`}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
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
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="running">En ejecución</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="failed">Fallidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {OPENCODE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={filteredTasks.length === 0}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Tarea</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Modelo</TableHead>
                <TableHead className="hidden lg:table-cell">Creada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No se encontraron tareas con los filtros actuales
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  const status = STATUS_LABELS[task.status];
                  const model = OPENCODE_MODELS.find((m) => m.id === task.modelUsed);
                  return (
                    <TableRow key={task.id} className="hover:bg-muted/40">
                      <TableCell>
                        <button
                          className="text-left"
                          onClick={() => setDetailTask(task)}
                        >
                          <div className="font-medium text-sm">{task.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{task.description}</div>
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {task.tags.slice(0, 2).map((t) => (
                                <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${status.color}`}>
                          <status.icon className={`size-3 ${task.status === "running" ? "animate-spin" : ""}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs font-mono">{model?.name || task.modelUsed}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {timeAgo(task.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setDetailTask(task)}
                            title="Ver detalles"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              if (task.status === "completed") {
                                navigate("task-result", { id: task.id });
                              } else {
                                startExecution(task.id);
                              }
                            }}
                            title="Repetir"
                          >
                            <Repeat2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              deleteTask(task.id);
                              toast.success("Tarea eliminada");
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Stats footer */}
        {filteredTasks.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando {filteredTasks.length} de {tasks.length} tareas
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                {filteredTasks.filter(t => t.status === "completed").length} completadas
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="size-3 text-destructive" />
                {filteredTasks.filter(t => t.status === "failed").length} fallidas
              </span>
            </span>
          </div>
        )}
      </div>

      <TaskDetailModal
        task={detailTask || undefined}
        open={!!detailTask}
        onOpenChange={(open) => !open && setDetailTask(null)}
      />
    </MainLayout>
  );
}
