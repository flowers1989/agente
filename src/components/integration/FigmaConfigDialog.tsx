"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FigmaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function FigmaConfigDialog({ open, onOpenChange, onConnected }: FigmaConfigDialogProps) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) {
      toast.error("El token de Figma es requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "figma",
          accessToken: token,
          name: "Figma personal",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Token de Figma guardado");
      setToken("");
      onOpenChange(false);
      onConnected?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error guardando token");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Figma</DialogTitle>
          <DialogDescription>
            Ingresa tu token de acceso personal de Figma. Puedes generarlo en{" "}
            <a
              href="https://www.figma.com/developers/api#access-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Figma Developers
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="figma-token">Token de acceso personal</Label>
          <Input
            id="figma-token"
            type="password"
            placeholder="figd_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !token.trim()}>
            {saving && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
