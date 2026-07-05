// ==================== AUTH HELPER ====================
// Capa de abstracción para autenticación.
// Actualmente usa un usuario por defecto para demo/local.
// Cuando se integre next-auth, solo hay que cambiar esta función.

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

export function getUserId(): string {
  // TODO: integrar next-auth cuando se habilite autenticación real.
  // Por ahora, para la demo/prueba de fuego usamos un usuario por defecto.
  return "user";
}

export function getAuthUser(): AuthUser {
  return {
    id: getUserId(),
    email: "user@localhost",
    name: "Usuario Demo",
  };
}

export function getIdentifier(request: Request, namespace: string): string {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  return `${namespace}:${getUserId()}:${ip}`;
}
