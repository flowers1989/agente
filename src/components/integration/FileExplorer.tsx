"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resource } from "@/lib/integrations/types";
import { toast } from "sonner";
import { Folder, File, Image, FileText, Figma, Loader2 } from "lucide-react";
import type { IntegrationSource } from "./IntegrationMenu";

interface FileExplorerProps {
  source: IntegrationSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const SOURCE_LABELS: Record<IntegrationSource, string> = {
  figma: "Figma",
  onedrive: "OneDrive",
  "google-drive": "Google Drive",
  local: "Archivos locales",
  skill: "Habilidades",
  recent: "Archivos recientes",
};

export function FileExplorer({ source, open, onOpenChange, onImported }: FileExplorerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSelected(new Set());

      try {
        if (source === "recent") {
          const res = await fetch("/api/resources/recent?limit=20");
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setResources(data.resources || []);
        } else {
          const res = await fetch(`/api/integrations/${source}/resources`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setResources(data.resources || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando recursos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, source]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);

    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        const res = await fetch(`/api/integrations/${source}/resources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceId: id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Error importando ${id}`);
        }
      }
      toast.success(`${selected.size} recurso(s) importado(s)`);
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error importando");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar de {SOURCE_LABELS[source]}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="space-y-2 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="h-full flex items-center justify-center text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && resources.length === 0 && (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No hay recursos disponibles
            </div>
          )}

          {!loading && !error && resources.length > 0 && (
            <ScrollArea className="h-full pr-3">
              <div className="space-y-1 p-1">
                {resources.map((resource) => (
                  <label
                    key={resource.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(resource.id)}
                      onCheckedChange={() => toggleSelect(resource.id)}
                    />
                    {resource.thumbnailUrl ? (
                      <img
                        src={resource.thumbnailUrl}
                        alt={resource.name}
                        className="size-10 rounded object-cover bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <ResourceIcon type={resource.type} source={resource.source} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resource.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resource.type} · {formatSize(resource.size)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
            {importing && <Loader2 className="size-4 animate-spin" />}
            Importar ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourceIcon({ type, source }: { type: string; source: string }) {
  const className = "size-10 p-2 rounded bg-muted text-muted-foreground";
  if (source === "figma") return <Figma className={className} />;
  if (type === "folder") return <Folder className={className} />;
  if (type === "image") return <Image className={className} />;
  if (["document", "pdf", "spreadsheet", "presentation"].includes(type)) {
    return <FileText className={className} />;
  }
  return <File className={className} />;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
