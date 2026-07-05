"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileExplorer } from "./FileExplorer";
import { FigmaConfigDialog } from "./FigmaConfigDialog";
import { Plus, Upload, Figma, HardDrive, Clock, Wrench } from "lucide-react";
import { toast } from "sonner";

export type IntegrationSource = "figma" | "onedrive" | "google-drive" | "local" | "skill" | "recent";

interface IntegrationMenuProps {
  onResourceImported?: () => void;
}

const INTEGRATIONS: {
  id: IntegrationSource;
  label: string;
  icon: typeof Figma;
  description: string;
}[] = [
  {
    id: "figma",
    label: "Agregar desde Figma",
    icon: Figma,
    description: "Importar diseños de Figma",
  },
  {
    id: "onedrive",
    label: "Añadir desde OneDrive",
    icon: HardDrive,
    description: "Importar archivos de OneDrive",
  },
  {
    id: "google-drive",
    label: "Añadir desde Google Drive",
    icon: HardDrive,
    description: "Importar archivos de Google Drive",
  },
  {
    id: "skill",
    label: "Usar habilidades",
    icon: Wrench,
    description: "Utilizar habilidades disponibles",
  },
  {
    id: "recent",
    label: "Archivos recientes",
    icon: Clock,
    description: "Ver archivos recientes",
  },
  {
    id: "local",
    label: "Agregar desde archivos locales",
    icon: Upload,
    description: "Subir archivos desde tu computadora",
  },
];

export function IntegrationMenu({ onResourceImported }: IntegrationMenuProps) {
  const [selectedSource, setSelectedSource] = useState<IntegrationSource | null>(null);
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleSelect = (source: IntegrationSource) => {
    if (source === "local") {
      document.getElementById("integration-file-input")?.click();
      return;
    }
    if (source === "figma") {
      setFigmaOpen(true);
      return;
    }
    if (source === "onedrive" || source === "google-drive" || source === "skill") {
      toast.info(`${source} aún no está implementado`);
      return;
    }
    setSelectedSource(source);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/integrations/local/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error subiendo archivo");
      toast.success(`Archivo "${file.name}" subido correctamente`);
      onResourceImported?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error subiendo archivo");
    } finally {
      setFileInputKey((k) => k + 1);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            <span>Agregar</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {INTEGRATIONS.map((integration) => (
            <DropdownMenuItem
              key={integration.id}
              onClick={() => handleSelect(integration.id)}
              className="flex items-start gap-3 py-2 cursor-pointer"
            >
              <integration.icon className="size-4 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{integration.label}</span>
                <span className="text-xs text-muted-foreground">{integration.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        id="integration-file-input"
        key={fileInputKey}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <FigmaConfigDialog open={figmaOpen} onOpenChange={setFigmaOpen} onConnected={onResourceImported} />

      {selectedSource && (
        <FileExplorer
          source={selectedSource}
          open={!!selectedSource}
          onOpenChange={(open) => !open && setSelectedSource(null)}
          onImported={() => {
            setSelectedSource(null);
            onResourceImported?.();
          }}
        />
      )}
    </>
  );
}
