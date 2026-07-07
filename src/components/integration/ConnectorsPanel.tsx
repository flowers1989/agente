"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2, Plug, ExternalLink, KeyRound, Settings2, Globe } from "lucide-react";
import { toast } from "sonner";
import type { ConnectorDefinition, IntegrationSource, OAuth2AppCredentials } from "@/lib/integrations/types";

interface ConnectorStatus extends ConnectorDefinition {
  connected: boolean;
  expiresAt?: Date | null;
  appConfigured?: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Plug,
};

export function ConnectorsPanel() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConnectorStatus | null>(null);
  const [configuringOAuth, setConfiguringOAuth] = useState<ConnectorStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [oauthConfig, setOauthConfig] = useState<OAuth2AppCredentials>({});
  const [saving, setSaving] = useState(false);
  const [browserFlowSource, setBrowserFlowSource] = useState<IntegrationSource | null>(null);

  const fetchConnectors = async () => {
    try {
      const [statusRes, appsRes] = await Promise.all([
        fetch("/api/connectors"),
        fetch("/api/connectors/app-credentials"),
      ]);
      const statusData = await statusRes.json();
      const appsData = await appsRes.json();
      const configuredSet = new Set((appsData.credentials || []).map((c: { source: string }) => c.source));

      setConnectors(
        (statusData.connectors || []).map((c: ConnectorStatus) => ({
          ...c,
          appConfigured: configuredSet.has(c.source),
        }))
      );
    } catch (error) {
      toast.error("Error cargando conectores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const handleBrowserFlow = async (connector: ConnectorStatus) => {
    if (connector.supportsOAuth && !connector.appConfigured) {
      toast.error("Primero configura OAuth (Client ID, Client Secret y Redirect URI) antes de usar el flujo por navegador.");
      setConfiguringOAuth(connector);
      return;
    }
    if (!connector.supportsOAuth) {
      toast.error("Este conector no soporta OAuth; usa API key.");
      return;
    }
    setBrowserFlowSource(connector.source);
    try {
      const res = await fetch(`/api/connectors/${connector.source}/oauth/browser-flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headless: false, timeoutMs: 5 * 60 * 1000 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Flujo OAuth por navegador falló");
      }
      toast.success(`${connector.name} conectado vía navegador`);
      await fetchConnectors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error en flujo por navegador");
    } finally {
      setBrowserFlowSource(null);
    }
  };

  const handleConnect = async (connector: ConnectorStatus) => {
    if (connector.supportsOAuth && !connector.appConfigured) {
      setConfiguringOAuth(connector);
      return;
    }
    if (connector.supportsApiKey && !connector.supportsOAuth) {
      setSelected(connector);
      return;
    }
    if (connector.supportsOAuth) {
      try {
        const res = await fetch(`/api/connectors/${connector.source}/oauth/url`);
        const data = await res.json();
        if (data.url) {
          window.open(data.url, "oauth", "width=600,height=700");
        } else {
          toast.error(data.error || "No se pudo iniciar OAuth");
        }
      } catch (error) {
        toast.error("Error iniciando OAuth");
      }
    }
  };

  const handleSaveApiKey = async () => {
    if (!selected || !apiKey) return;
    setSaving(true);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: selected.source, apiKey, name: selected.name }),
      });
      if (!res.ok) throw new Error("Error guardando credenciales");
      toast.success(`${selected.name} conectado`);
      setSelected(null);
      setApiKey("");
      await fetchConnectors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOAuthConfig = async () => {
    if (!configuringOAuth) return;
    setSaving(true);
    try {
      const res = await fetch("/api/connectors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: configuringOAuth.source,
          ...oauthConfig,
          scopes: oauthConfig.scopes ?? [],
        }),
      });
      if (!res.ok) throw new Error("Error guardando configuración OAuth");
      toast.success(`OAuth configurado para ${configuringOAuth.name}`);
      setConfiguringOAuth(null);
      setOauthConfig({});
      await fetchConnectors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (source: IntegrationSource) => {
    try {
      const res = await fetch(`/api/connectors/${source}/credentials`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error desconectando");
      toast.success("Conector desconectado");
      await fetchConnectors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...connectors].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((connector) => {
          const Icon = ICONS[connector.icon || ""] || Plug;
          const needsOAuthConfig = connector.supportsOAuth && !connector.appConfigured && !connector.connected;
          return (
            <Card key={connector.source} className={connector.connected ? "border-emerald-500/30" : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{connector.name}</CardTitle>
                  </div>
                  {connector.connected ? (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">
                      <CheckCircle2 className="size-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      <XCircle className="size-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{connector.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-3">
                  {connector.scopes.slice(0, 3).map((scope) => (
                    <span key={scope} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {scope}
                    </span>
                  ))}
                  {connector.scopes.length > 3 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      +{connector.scopes.length - 3}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {connector.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleDisconnect(connector.source)}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleConnect(connector)}
                        disabled={!connector.supportsOAuth && !connector.supportsApiKey}
                      >
                        {needsOAuthConfig ? (
                          <>
                            <Settings2 className="size-3 mr-1" />
                            Configurar OAuth
                          </>
                        ) : connector.supportsOAuth ? (
                          <>
                            <ExternalLink className="size-3 mr-1" />
                            Conectar
                          </>
                        ) : (
                          <>
                            <KeyRound className="size-3 mr-1" />
                            Configurar
                          </>
                        )}
                      </Button>
                      {connector.supportsOAuth && !needsOAuthConfig && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => handleBrowserFlow(connector)}
                          disabled={browserFlowSource === connector.source}
                          title="Abrir el navegador controlado por el agente y completar OAuth automáticamente"
                        >
                          {browserFlowSource === connector.source ? (
                            <Loader2 className="size-3 mr-1 animate-spin" />
                          ) : (
                            <Globe className="size-3 mr-1" />
                          )}
                          Navegador
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* API Key Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Configurar {selected?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Introduce la API key o token de acceso. Nunca se compartirá con el cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">API Key / Token</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button size="sm" className="w-full" onClick={handleSaveApiKey} disabled={!apiKey || saving}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OAuth App Config Dialog */}
      <Dialog open={!!configuringOAuth} onOpenChange={(open) => !open && setConfiguringOAuth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Configurar OAuth de {configuringOAuth?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Introduce las credenciales de tu app OAuth. Se almacenan encriptadas en el servidor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Client ID</Label>
              <Input
                value={oauthConfig.clientId || ""}
                onChange={(e) => setOauthConfig((c) => ({ ...c, clientId: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Client Secret</Label>
              <Input
                type="password"
                value={oauthConfig.clientSecret || ""}
                onChange={(e) => setOauthConfig((c) => ({ ...c, clientSecret: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Redirect URI</Label>
              <Input
                value={oauthConfig.redirectUri || ""}
                onChange={(e) => setOauthConfig((c) => ({ ...c, redirectUri: e.target.value }))}
                placeholder="http://localhost:3000/api/connectors/oauth/callback"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scopes (separados por coma)</Label>
              <Input
                value={Array.isArray(oauthConfig.scopes) ? oauthConfig.scopes.join(",") : oauthConfig.scopes || ""}
                onChange={(e) => setOauthConfig((c) => ({ ...c, scopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                className="font-mono text-xs"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleSaveOAuthConfig}
              disabled={
                !oauthConfig.clientId ||
                !oauthConfig.clientSecret ||
                !oauthConfig.redirectUri ||
                saving
              }
            >
              {saving ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Guardar configuración OAuth
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
