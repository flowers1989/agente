"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plug } from "lucide-react";
import { ConnectorsPanel } from "./ConnectorsPanel";

interface ConnectorsDialogProps {
  variant?: "button" | "icon";
  label?: string;
}

export function ConnectorsDialog({ variant = "button", label = "Conectores" }: ConnectorsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant === "icon" ? "outline" : "ghost"}
        size={variant === "icon" ? "icon" : "sm"}
        className={variant === "icon" ? "size-8" : "gap-1.5 text-xs"}
        onClick={() => setOpen(true)}
        title="Conectores"
      >
        <Plug className="size-3.5" />
        {variant === "button" && <span>{label}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="size-4" />
              Conectores
            </DialogTitle>
            <DialogDescription>
              Conecta aplicaciones externas (Google Drive, GitHub, Figma, Slack, Gmail, Notion y más)
              para que el agente pueda ejecutar acciones reales en tu nombre.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <ConnectorsPanel />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}