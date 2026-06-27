"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TOOLS } from "@/lib/mock-data";
import { TOOL_CATEGORIES, type Tool } from "@/lib/types";
import { Search, Wrench, ChevronRight, Code2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, string> = {
  "Navegación Web": "🌐",
  "Ejecución de Código": "⚡",
  "Operaciones de Archivos": "📁",
  "Generación de Contenido": "✨",
  "Procesamiento de Medios": "🎬",
  "Integración de APIs": "🔌",
  "Base de Datos": "🗄️",
  "Sistema": "💻",
  "Automatización": "🤖",
  "Análisis y Visualización": "📊",
  "Comunicación": "💬",
  "Autenticación": "🔐",
  "Búsqueda": "🔍",
  "Procesamiento de Documentos": "📄",
  "Versionamiento": "🌿",
  "Adicionales": "⚙️",
};

export function ToolsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const filtered = TOOLS.filter((t) => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const byCategory = TOOL_CATEGORIES.map((cat) => ({
    name: cat,
    tools: filtered.filter((t) => t.category === cat),
  })).filter((c) => c.tools.length > 0);

  return (
    <MainLayout title="Herramientas" subtitle={`${TOOLS.length} herramientas integradas en ${TOOL_CATEGORIES.length} categorías`}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar herramientas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/30 text-muted-foreground"
            )}
          >
            Todas ({TOOLS.length})
          </button>
          {TOOL_CATEGORIES.map((cat) => {
            const count = TOOLS.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                )}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Tools grouped by category */}
        <div className="space-y-6">
          {byCategory.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{CATEGORY_ICONS[cat.name]}</span>
                <h3 className="font-semibold">{cat.name}</h3>
                <Badge variant="outline" className="text-xs">{cat.tools.length}</Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.tools.map((tool, i) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card
                      className="p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => setSelectedTool(tool)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Wrench className="size-4 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono py-0">
                          #{String(tool.id).padStart(2, "0")}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{tool.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver detalles
                        <ChevronRight className="size-3" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="p-12 text-center">
            <Search className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-1">Sin resultados</h3>
            <p className="text-sm text-muted-foreground">Prueba con otra búsqueda o categoría</p>
          </Card>
        )}
      </div>

      {/* Tool detail modal */}
      <Dialog open={!!selectedTool} onOpenChange={(open) => !open && setSelectedTool(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wrench className="size-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedTool?.name}</DialogTitle>
                <Badge variant="outline" className="text-xs mt-1">
                  {CATEGORY_ICONS[selectedTool?.category || ""]} {selectedTool?.category}
                </Badge>
              </div>
            </div>
            <DialogDescription className="text-base">{selectedTool?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                Parámetros
              </h4>
              <div className="space-y-2">
                {selectedTool?.parameters.map((p) => (
                  <div key={p.name} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono font-semibold text-primary">{p.name}</code>
                      <Badge variant="outline" className="text-[10px] py-0 h-4 font-mono">{p.type}</Badge>
                      {p.required && (
                        <Badge variant="destructive" className="text-[10px] py-0 h-4">REQUERIDO</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Retorna</h4>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-300">
                {selectedTool?.returns}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Ejemplo de uso</h4>
              <pre className="p-4 rounded-lg bg-muted/70 border border-border text-xs font-mono overflow-x-auto">
{`{
  "tool": "${selectedTool?.name}",
  "parameters": ${JSON.stringify(
    selectedTool?.parameters.reduce((acc, p) => {
      acc[p.name] = p.type === "number" ? 1000 : p.type === "boolean" ? true : "valor_ejemplo";
      return acc;
    }, {} as Record<string, unknown>),
    null,
    2
  )}
}`}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
