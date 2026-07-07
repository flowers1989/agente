// ==================== INTENT DETECTOR ====================
// Detecta intenciones del usuario en lenguaje natural y las mapea a
// acciones de conectores. Permite que el agente ejecute acciones reales
// (listRepos, listIssues, listEmails, etc.) sin necesidad del orquestador.

export interface ConnectorIntent {
  source: string;
  action: string;
  params: Record<string, unknown>;
  /** Confianza 0-1. Solo se ejecuta si > 0.5 */
  confidence: number;
}

interface ConnectedConnector {
  source: string;
  name: string;
  actions: string[];
}

/**
 * Analiza el mensaje del usuario y, si detecta una intención clara de
 * ejecutar una acción de un conector, devuelve la intención.
 * `connected` es la lista de conectores conectados del usuario.
 */
export function detectConnectorIntent(
  message: string,
  connected: ConnectedConnector[],
  previousMessages?: Array<{ role: string; content: string }>
): ConnectorIntent | null {
  const q = message.toLowerCase().trim();
  const sources = new Set(connected.map((c) => c.source));

  // === CONTEXTO: buscar el tema anterior si el mensaje es un pronombre ===
  // "listalos", "muéstralos", "verlos", "dámelo" → buscar en historial qué se mencionó
  const PRONOUN_PATTERNS = [
    /^(lista|listar|muestra|mostrar|ver|dame|dámelo|damelos|verlos|muéstralos|listalos|muéstrame|enséñame|enséñalos)/i,
  ];
  const isPronounRequest = PRONOUN_PATTERNS.some((re) => re.test(q))
    && q.length < 30; // solo si es corto (sin objeto explícito)

  let contextualQuery = q;
  if (isPronounRequest && previousMessages && previousMessages.length > 0) {
    // Buscar en los últimos 6 mensajes algo que mencione repos, issues, archivos, etc.
    for (let i = previousMessages.length - 1; i >= 0 && i >= previousMessages.length - 6; i--) {
      const msg = previousMessages[i];
      if (msg.role === "user") {
        const lower = msg.content.toLowerCase();
        if (/\b(repos?|repositorios?|proyectos?)\b/.test(lower)) {
          contextualQuery = `listar repos ${lower}`;
          break;
        }
        if (/\b(issues?)\b/.test(lower)) {
          contextualQuery = `listar issues ${lower}`;
          break;
        }
        if (/\b(archivos?|contenido|carpetas?|files?)\b.*\b(repo|repositorio)\b/.test(lower)) {
          contextualQuery = `contenido repo ${lower}`;
          break;
        }
        if (/\b(emails?|correos?)\b/.test(lower)) {
          contextualQuery = `listar emails ${lower}`;
          break;
        }
        if (/\b(canales?)\b.*\b(slack)?\b/.test(lower)) {
          contextualQuery = `listar canales ${lower}`;
          break;
        }
        if (/\b(paginas?|pages?|notas?)\b.*\b(notion)?\b/.test(lower)) {
          contextualQuery = `listar paginas ${lower}`;
          break;
        }
        if (/\b(archivos?|files?|diseños?)\b.*\b(drive|figma)?\b/.test(lower)) {
          if (lower.includes("drive")) contextualQuery = `listar archivos drive ${lower}`;
          else if (lower.includes("figma")) contextualQuery = `listar archivos figma ${lower}`;
          else contextualQuery = `listar archivos ${lower}`;
          break;
        }
      }
      // También buscar en respuestas del asistente que mencionen "repositorios", "issues", etc.
      if (msg.role === "assistant") {
        const lower = msg.content.toLowerCase();
        if (/\b(repos?|repositorios?)\b/.test(lower) && sources.has("github")) {
          contextualQuery = `listar repos`;
          break;
        }
      }
    }
  }

  const effectiveQuery = contextualQuery === q ? q : `${q} ${contextualQuery}`;


  // === GITHUB ===
  if (sources.has("github")) {
    // listRepos
    if (/\b(listar?|lista|muestra|ver|cuales|cuántos|que)\b.*\b(repos?|repositorios|proyectos?)\b/i.test(effectiveQuery)
        || /\bmis repos\b/i.test(effectiveQuery)
        || /\bproyectos.*perfil\b/i.test(effectiveQuery)
        || /\bgithub\b.*\b(listar?|ver|mostrar)\b/i.test(effectiveQuery)
        || /^listalos$/i.test(effectiveQuery) || /^muéstralos$/i.test(effectiveQuery) || /^verlos$/i.test(effectiveQuery)) {
      return { source: "github", action: "listRepos", params: { limit: 20 }, confidence: 0.9 };
    }

    // readFile — leer un archivo específico del repo
    // "muestra el contenido de package.json del repo agente"
    // "dame el archivo README.md de flowers1989/agente"
    const readFileMatch = q.match(/(?:dame|muestr[ao]|ver|leer?|contenido|abrir?)\s+(?:el\s+)?(?:archivo\s+|contenido\s+(?:de\s+|del\s+)?)?(?:[\w\-./]+\.(?:ts|tsx|js|jsx|json|md|py|sh|yml|yaml|txt|css|html|xml|sql|prisma|env|toml|cfg|conf|gitignore)\b)(?:\s+(?:del?\s+|de\s+|en\s+)(?:repo\s+)?([\w\-]+)\/([\w\-]+))?/i);
    if (readFileMatch) {
      const filePathMatch = q.match(/([\w\-./]+\.(?:ts|tsx|js|jsx|json|md|py|sh|yml|yaml|txt|css|html|xml|sql|prisma|env|toml|cfg|conf|gitignore))\b/i);
      const owner = readFileMatch[1] || "";
      const repo = readFileMatch[2] || "";
      const path = filePathMatch ? filePathMatch[1] : "";
      if (path && owner && repo) {
        return { source: "github", action: "readFile", params: { owner, repo, path }, confidence: 0.85 };
      }
    }

    // listRepoContent — listar contenido de un repo
    // "dame el contenido del repo agente"
    // "muestra los archivos del repo flowers1989/agente"
    // "que hay en el repositorio agente"
    const contentRepoMatch = q.match(/(?:dame|muestr[ao]|ver|listar?|que\s+(?:hay|tiene|contiene))\s+(?:el\s+)?(?:contenido|archivos?|estructura|carpetas?)\s+(?:del?\s+|de\s+|en\s+)(?:repo|repositorio|proyecto)\s+([\w\-]+)\/([\w\-]+)/i);
    if (contentRepoMatch) {
      return { source: "github", action: "listRepoContent", params: { owner: contentRepoMatch[1], repo: contentRepoMatch[2] }, confidence: 0.9 };
    }
    // "dame el contenido del repo agente" (sin owner explícito)
    const contentRepoShort = q.match(/(?:dame|muestr[ao]|ver|listar?|que\s+(?:hay|tiene))\s+(?:el\s+)?(?:contenido|archivos?|estructura)\s+(?:del?\s+|de\s+)(?:repo|repositorio|proyecto)\s+([\w\-]+)$/i);
    if (contentRepoShort) {
      // Sin owner explícito: usar el primer repo del usuario (lo resolverá el backend)
      return { source: "github", action: "listRepoContent", params: { owner: "flowers1989", repo: contentRepoShort[1] }, confidence: 0.7 };
    }
    // "archivos del repo X" o "contenido del repositorio X"
    if (/\b(archivos?|contenido|estructura|carpetas?)\b.*\b(repo|repositorio)\b\s+([\w\-]+)/i.test(effectiveQuery)) {
      const m = q.match(/\b(repo|repositorio)\b\s+([\w\-]+)$/i);
      if (m) {
        return { source: "github", action: "listRepoContent", params: { owner: "flowers1989", repo: m[2] }, confidence: 0.65 };
      }
    }
    // listIssues
    const issuesMatch = q.match(/\b(listar?|ver|mostrar|cuales)\b.*\b(issues?|problemas?)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (issuesMatch) {
      return { source: "github", action: "listIssues", params: { owner: issuesMatch[3], repo: issuesMatch[4], state: "open", limit: 10 }, confidence: 0.85 };
    }
    if (/\b(listar?|ver|mostrar)\b.*\bissues?\b/i.test(effectiveQuery)) {
      return { source: "github", action: "listIssues", params: { state: "open", limit: 10 }, confidence: 0.6 };
    }
    // createIssue
    const createIssueMatch = q.match(/\b(crear?|abrir|nuevo|nueva)\b.*\bissue\b.*\b(?:en|de|para)\b\s+([\w\-]+)\/([\w\-]+)\s+(?:con titulo\s+)?[""']?(.+?)[""']?$/i);
    if (createIssueMatch) {
      return { source: "github", action: "createIssue", params: { owner: createIssueMatch[2], repo: createIssueMatch[3], title: createIssueMatch[4] }, confidence: 0.8 };
    }

    // listPRs
    const prsMatch = q.match(/\b(listar?|ver|mostrar|cuales)\b.*\b(pulls?|pr|pull requests?|pr\s*requests?)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (prsMatch) {
      return { source: "github", action: "listPRs", params: { owner: prsMatch[3], repo: prsMatch[4], state: "open", limit: 10 }, confidence: 0.85 };
    }
    if (/\b(listar?|ver|mostrar)\b.*\b(pulls?|pr|pull requests?)\b/i.test(effectiveQuery)) {
      return { source: "github", action: "listPRs", params: { state: "open", limit: 10 }, confidence: 0.6 };
    }

    // getRepo / getReadme — "info del repo flowers1989/agente", "readme de flowers1989/agente"
    const repoDetailMatch = q.match(/\b(info|detalle|informac[ií]on|dame|muestr[ao])\b.*\b(?:del?\s+|de\s+)?repo\s+([\w\-]+)\/([\w\-]+)/i);
    if (repoDetailMatch) {
      return { source: "github", action: "getRepo", params: { owner: repoDetailMatch[2], repo: repoDetailMatch[3] }, confidence: 0.8 };
    }
    const readmeMatch = q.match(/\b(readme|leer?\s*el\s*readme|dame\s+el\s+readme)\b.*\b(?:de|del?|en)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (readmeMatch) {
      return { source: "github", action: "getReadme", params: { owner: readmeMatch[2], repo: readmeMatch[3] }, confidence: 0.85 };
    }

    // listCommits
    const commitsMatch = q.match(/\b(listar?|ver|mostrar|ultimos|historial)\b.*\bcommits?\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (commitsMatch) {
      return { source: "github", action: "listCommits", params: { owner: commitsMatch[2], repo: commitsMatch[3], limit: 10 }, confidence: 0.85 };
    }

    // listBranches
    const branchesMatch = q.match(/\b(listar?|ver|mostrar|cuales)\b.*\b(ramas?|branches?)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (branchesMatch) {
      return { source: "github", action: "listBranches", params: { owner: branchesMatch[3], repo: branchesMatch[4], limit: 30 }, confidence: 0.85 };
    }

    // createBranch
    const createBranchMatch = q.match(/\b(crear?|nueva?)\b.*\b(rama|branch)\b\s+([\w\-./]+)\b.*\b(?:de|en|en\s+el\s+repo)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (createBranchMatch) {
      return { source: "github", action: "createBranch", params: { owner: createBranchMatch[4], repo: createBranchMatch[5], branch: createBranchMatch[3] }, confidence: 0.8 };
    }

    // closeIssue / updateIssue / addIssueComment con número
    // "cierra el issue #14 de flowers1989/agente"
    const closeIssueMatch = q.match(/\b(cerrar?|cierra|cerrada)\b.*\bissues?\s*#?(\d+)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (closeIssueMatch) {
      return { source: "github", action: "updateIssue", params: { owner: closeIssueMatch[3], repo: closeIssueMatch[4], issueNumber: Number(closeIssueMatch[2]), state: "closed" }, confidence: 0.85 };
    }
    // "comenta en el issue #14 de owner/repo: texto"
    const commentMatch = q.match(/\b(comentar?|comenta|comment)\b.*\bissues?\s*#?(\d+)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)[:\s]+(.+)$/i);
    if (commentMatch) {
      return { source: "github", action: "addIssueComment", params: { owner: commentMatch[3], repo: commentMatch[4], issueNumber: Number(commentMatch[2]), body: commentMatch[5].trim() }, confidence: 0.8 };
    }

    // mergePR — "merge PR #14 de owner/repo"
    const mergeMatch = q.match(/\b(merge|fusionar?|mergear)\b.*\bpr\s*#?(\d+)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (mergeMatch) {
      return { source: "github", action: "mergePR", params: { owner: mergeMatch[3], repo: mergeMatch[4], prNumber: Number(mergeMatch[2]) }, confidence: 0.85 };
    }
    // closePR "cierra el PR #14 de owner/repo"
    const closePRMatch = q.match(/\b(cerrar?|cierra)\b.*\bpr\s*#?(\d+)\b.*\b(?:de|en|del)\b\s+([\w\-]+)\/([\w\-]+)/i);
    if (closePRMatch) {
      return { source: "github", action: "closePR", params: { owner: closePRMatch[3], repo: closePRMatch[4], prNumber: Number(closePRMatch[2]) }, confidence: 0.85 };
    }
  }

  // === GOOGLE DRIVE ===
  if (sources.has("google-drive")) {
    if (/\b(listar?|ver|mostrar|cuales|mis)\b.*\b(archivos?|documentos?|files?|carpetas?)\b.*\b(drive|google)?\b/i.test(effectiveQuery)
        || /\bdrive\b.*\b(listar?|ver|mostrar)\b/i.test(effectiveQuery)) {
      return { source: "google-drive", action: "listFiles", params: { limit: 20 }, confidence: 0.85 };
    }
  }

  // === GMAIL ===
  if (sources.has("gmail")) {
    if (/\b(listar?|ver|mostrar|cuales|mis)\b.*\b(emails?|correos?|mensajes?)\b/i.test(effectiveQuery)) {
      return { source: "gmail", action: "listEmails", params: { limit: 10 }, confidence: 0.85 };
    }
  }

  // === NOTION ===
  if (sources.has("notion")) {
    if (/\b(listar?|ver|mostrar|cuales|mis)\b.*\b(paginas?|pages?|notas?)\b.*\b(notion)?\b/i.test(effectiveQuery)) {
      return { source: "notion", action: "listPages", params: { limit: 20 }, confidence: 0.85 };
    }
  }

  // === SLACK ===
  if (sources.has("slack")) {
    if (/\b(listar?|ver|mostrar|cuales)\b.*\b(canales?|channels?)\b.*\b(slack)?\b/i.test(effectiveQuery)) {
      return { source: "slack", action: "listChannels", params: { limit: 20 }, confidence: 0.85 };
    }
  }

  // === FIGMA ===
  if (sources.has("figma")) {
    if (/\b(listar?|ver|mostrar|cuales|mis)\b.*\b(archivos?|files?|diseños?|designs?)\b.*\b(figma)?\b/i.test(effectiveQuery)) {
      return { source: "figma", action: "listFiles", params: { limit: 20 }, confidence: 0.8 };
    }
  }

  // === GOOGLE SHEETS ===
  if (sources.has("google-sheets")) {
    if (/\b(listar?|ver|mostrar|cuales|mis)\b.*\b(hojas?|spreadsheets?|calculadoras?)\b/i.test(effectiveQuery)) {
      return { source: "google-sheets", action: "listSpreadsheets", params: { limit: 20 }, confidence: 0.8 };
    }
  }

  return null;
}

/**
 * Ejecuta una intención de conector llamando al endpoint API.
 * Devuelve el resultado o null si falla.
 */
export async function executeConnectorIntent(
  intent: ConnectorIntent
): Promise<{ success: boolean; data?: unknown; error?: string } | null> {
  try {
    const res = await fetch(`/api/connectors/${intent.source}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: intent.action, params: intent.params }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${res.status}` };
    }
    return (await res.json()) as { success: boolean; data?: unknown; error?: string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Formatea el resultado de una acción de conector como texto legible para
 * mostrar al usuario. Soporta las acciones más comunes.
 */
export function formatConnectorResult(
  source: string,
  action: string,
  result: { success: boolean; data?: unknown; error?: string }
): string {
  if (!result.success) {
    return `❌ No pude completar la acción **${source}/${action}**: ${result.error || "error desconocido"}`;
  }

  const data = result.data;

  // github/listRepos
  if (source === "github" && action === "listRepos") {
    const repos = (data as Array<{ name: string; full_name: string; private: boolean; html_url: string; description?: string | null; updated_at?: string }>) || [];
    if (repos.length === 0) return "No tienes repositorios visibles.";
    const lines = repos.map((r, i) =>
      `${i + 1}. **${r.full_name}** ${r.private ? "(privado)" : "(público)"}\n   ${r.html_url}${r.description ? `\n   ${r.description}` : ""}`
    );
    return `## Tus repositorios de GitHub (${repos.length})\n\n${lines.join("\n\n")}`;
  }

  // github/listIssues
  if (source === "github" && action === "listIssues") {
    const issues = (data as Array<{ number: number; title: string; state: string; html_url: string; user?: { login?: string } }>) || [];
    if (issues.length === 0) return "No hay issues para mostrar.";
    const lines = issues.map((i) =>
      `#${i.number} [${i.state}] **${i.title}**${i.user?.login ? ` by @${i.user.login}` : ""}\n${i.html_url}`
    );
    return `## Issues (${issues.length})\n\n${lines.join("\n\n")}`;
  }

  // github/listRepoContent
  if (source === "github" && action === "listRepoContent") {
    const items = (data as Array<{ name: string; path: string; type: string; size: number; content?: string }>) || [];
    if (items.length === 0) return "No hay contenido en esta ruta del repositorio.";
    const lines = items.map((item) => {
      const icon = item.type === "dir" ? "📁" : item.type === "file" ? "📄" : "🔗";
      const sizeStr = item.type === "file" ? ` (${formatBytes(item.size)})` : "";
      return `${icon} **${item.name}**${sizeStr} — \`${item.path}\``;
    });
    return `## Contenido del repositorio (${items.length} elementos)\n\n${lines.join("\n")}`;
  }

  // github/readFile
  if (source === "github" && action === "readFile") {
    const file = data as { name?: string; path?: string; content?: string; size?: number; url?: string };
    if (!file.content) return "No se pudo leer el contenido del archivo.";
    const ext = (file.name || file.path || "").split(".").pop() || "text";
    const langMap: Record<string, string> = {
      ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
      json: "json", md: "markdown", py: "python", sh: "bash",
      yml: "yaml", yaml: "yaml", css: "css", html: "html", sql: "sql",
    };
    const lang = langMap[ext] || "text";
    const content = file.content.slice(0, 8000);
    const truncated = file.content.length > 8000 ? `\n\n... *(truncado, ${file.content.length} chars total)*` : "";
    return `## 📄 ${file.name || file.path} (${formatBytes(file.size || 0)})${file.url ? `\n${file.url}` : ""}\n\n\`\`\`${lang}\n${content}\n\`\`\`${truncated}`;
  }

  // github/createIssue
  if (source === "github" && action === "createIssue") {
    const issue = data as { number: number; html_url: string; title: string };
    return `✅ Issue #${issue.number} creado: **${issue.title}**\n${issue.html_url}`;
  }

  // github/getIssue
  if (source === "github" && action === "getIssue") {
    const issue = data as { number: number; title: string; state: string; body?: string; html_url: string; user?: { login?: string } };
    return `## Issue #${issue.number} [${issue.state}] — ${issue.title}\n${issue.user?.login ? `by @${issue.user.login}\n` : ""}${issue.html_url}\n\n${(issue.body || "(sin descripción)").slice(0, 4000)}`;
  }

  // github/updateIssue
  if (source === "github" && action === "updateIssue") {
    const issue = data as { number: number; state: string; title: string; html_url: string };
    return `✅ Issue #${issue.number} actualizado: estado **${issue.state}**\n${issue.html_url}`;
  }

  // github/addIssueComment
  if (source === "github" && action === "addIssueComment") {
    const c = data as { id: number; html_url: string; body: string };
    return `✅ Comentario publicado\n${c.html_url}`;
  }

  // github/listPRs
  if (source === "github" && action === "listPRs") {
    const prs = (data as Array<{ number: number; title: string; state: string; html_url: string; head?: { ref: string }; base?: { ref: string } }>) || [];
    if (prs.length === 0) return "No hay Pull Requests para mostrar.";
    const lines = prs.map((p) => `#${p.number} [${p.state}] **${p.title}** ${p.head?.ref ? `→ \`${p.head.ref}\`→\`${p.base?.ref || ""}\`` : ""}\n${p.html_url}`);
    return `## Pull Requests (${prs.length})\n\n${lines.join("\n\n")}`;
  }

  // github/getPR
  if (source === "github" && action === "getPR") {
    const pr = data as { number: number; title: string; state: string; html_url: string; head?: { ref: string }; base?: { ref: string }; merged?: boolean };
    return `## PR #${pr.number} [${pr.state}${pr.merged ? " merged" : ""}] — ${pr.title}\n${pr.head?.ref || ""} → ${pr.base?.ref || ""}\n${pr.html_url}`;
  }

  // github/closePR
  if (source === "github" && action === "closePR") {
    const pr = data as { number: number; html_url: string; state: string };
    return `✅ PR #${pr.number} cerrado\n${pr.html_url}`;
  }

  // github/mergePR
  if (source === "github" && action === "mergePR") {
    const r = data as { sha: string; merged: boolean; message: string };
    return r.merged ? `✅ PR mergeado. Commit: \`${r.sha}\`` : `⚠️ Merge fallido: ${r.message || "desconocido"}`;
  }

  // github/listBranches
  if (source === "github" && action === "listBranches") {
    const branches = (data as Array<{ name: string; commit: { sha: string } }>) || [];
    if (branches.length === 0) return "No hay ramas en este repositorio.";
    return `## Ramas (${branches.length})\n\n${branches.map((b) => `- 🌿 **${b.name}** \`${b.commit.sha.slice(0, 7)}\``).join("\n")}`;
  }

  // github/createBranch
  if (source === "github" && action === "createBranch") {
    const r = data as { ref: string; sha: string; fromBranch?: string };
    return `✅ Rama creada: \`${r.ref.replace("refs/heads/", "")}\` desde \`${r.fromBranch || "main"}\` (\`${r.sha.slice(0, 7)}\`)`;
  }

  // github/listCommits
  if (source === "github" && action === "listCommits") {
    const commits = (data as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string }>) || [];
    if (commits.length === 0) return "No hay commits para mostrar.";
    return `## Commits recientes (${commits.length})\n\n${commits.map((c) => `- \`${c.sha.slice(0, 7)}\` ${c.commit.message.split("\n")[0]}\n  *${c.commit.author.name} · ${new Date(c.commit.author.date).toLocaleString()}*`).join("\n")}`;
  }

  // github/getRepo
  if (source === "github" && action === "getRepo") {
    const r = data as { full_name: string; html_url: string; description?: string | null; private: boolean; default_branch: string; stargazers_count: number; forks_count: number; open_issues_count: number; language: string | null };
    return `## 📦 ${r.full_name} ${r.private ? "(privado)" : "(público)"}\n${r.description ? `\n${r.description}\n` : ""}\n- Lenguaje: ${r.language || "—"}\n- Rama por defecto: \`${r.default_branch}\`\n- ⭐ ${r.stargazers_count} · 🍴 ${r.forks_count} · 📝 ${r.open_issues_count} issues\n${r.html_url}`;
  }

  // github/getReadme
  if (source === "github" && action === "getReadme") {
    const r = data as { name: string; content: string; notFound?: boolean };
    if (r.notFound || !r.content) return "Este repositorio no tiene README.";
    return `## 📄 ${r.name}\n\n${r.content.slice(0, 8000)}${r.content.length > 8000 ? "\n\n..." : ""}`;
  }

  // github/createFile / updateFile / deleteFile
  if (source === "github" && action === "createFile") {
    const r = data as { sha?: string; url?: string; path?: string };
    return `✅ Archivo creado/actualizado: \`${r.path}\`${r.url ? `\n${r.url}` : ""}`;
  }
  if (source === "github" && action === "updateFile") {
    const r = data as { sha?: string; url?: string; path?: string };
    return `✅ Archivo actualizado: \`${r.path}\`${r.url ? `\n${r.url}` : ""}`;
  }
  if (source === "github" && action === "deleteFile") {
    const r = data as { sha?: string; url?: string; path?: string };
    return `🗑️ Archivo eliminado: \`${r.path}\`${r.url ? `\n${r.url}` : ""}`;
  }

  // github/searchCode
  if (source === "github" && action === "searchCode") {
    const s = data as { total_count: number; items: Array<{ name: string; path: string; html_url: string; repository: { full_name: string } }> };
    if (s.total_count === 0) return "No se encontró código que coincida.";
    return `## Resultados de búsqueda de código (${s.total_count})\n\n${s.items.slice(0, 20).map((i) => `- \`${i.repository.full_name}\` / \`${i.path}\`\n  ${i.html_url}`).join("\n")}`;
  }

  // github/searchRepositories
  if (source === "github" && action === "searchRepositories") {
    const s = data as { total_count: number; items: Array<{ full_name: string; html_url: string; description?: string | null; stargazers_count: number }> };
    if (s.total_count === 0) return "No se encontraron repositorios.";
    return `## Repositorios encontrados (${s.total_count})\n\n${s.items.slice(0, 15).map((r) => `- **${r.full_name}** ⭐ ${r.stargazers_count}\n  ${r.html_url}${r.description ? `\n  ${r.description}` : ""}`).join("\n\n")}`;
  }

  // github/getAuthenticatedUser
  if (source === "github" && action === "getAuthenticatedUser") {
    const u = data as { login: string; name: string | null; html_url: string; avatar_url: string };
    return `## Usuario autenticado\n\n- Login: **${u.login}**\n- Nombre: ${u.name || "—"}\n- URL: ${u.html_url}`;
  }

  // google-drive/listFiles
  if (source === "google-drive" && action === "listFiles") {
    const files = (data as Array<{ id: string; name: string; mimeType?: string; url?: string; type?: string }>) || [];
    if (files.length === 0) return "No hay archivos en tu Google Drive.";
    const lines = files.map((f, i) => `${i + 1}. **${f.name}** (${f.type || f.mimeType || "archivo"})${f.url ? `\n   ${f.url}` : ""}`);
    return `## Tus archivos de Google Drive (${files.length})\n\n${lines.join("\n\n")}`;
  }

  // gmail/listEmails
  if (source === "gmail" && action === "listEmails") {
    const emails = (data as Array<{ id: string; snippet?: string; from?: string; subject?: string }>) || [];
    if (emails.length === 0) return "No hay emails recientes.";
    const lines = emails.map((e, i) => `${i + 1}. **${e.subject || "(sin asunto)"}**${e.from ? ` — ${e.from}` : ""}\n   ${e.snippet || ""}`);
    return `## Emails recientes (${emails.length})\n\n${lines.join("\n\n")}`;
  }

  // notion/listPages
  if (source === "notion" && action === "listPages") {
    const pages = (data as Array<{ id: string; title?: string; url?: string }>) || [];
    if (pages.length === 0) return "No hay páginas en Notion.";
    const lines = pages.map((p, i) => `${i + 1}. **${p.title || "(sin título)"}**${p.url ? `\n   ${p.url}` : ""}`);
    return `## Tus páginas de Notion (${pages.length})\n\n${lines.join("\n\n")}`;
  }

  // slack/listChannels
  if (source === "slack" && action === "listChannels") {
    const channels = (data as Array<{ id: string; name?: string; num_members?: number }>) || [];
    if (channels.length === 0) return "No hay canales de Slack.";
    const lines = channels.map((c, i) => `${i + 1}. **#${c.name || c.id}**${c.num_members ? ` (${c.num_members} miembros)` : ""}`);
    return `## Canales de Slack (${channels.length})\n\n${lines.join("\n")}`;
  }

  // figma/listFiles
  if (source === "figma" && action === "listFiles") {
    const files = (data as Array<{ id: string; name: string; url?: string }>) || [];
    if (files.length === 0) return "No hay archivos de Figma. Configura tu Team ID en Settings → Integraciones → Figma.";
    const lines = files.map((f, i) => `${i + 1}. **${f.name}**${f.url ? `\n   ${f.url}` : ""}`);
    return `## Tus archivos de Figma (${files.length})\n\n${lines.join("\n\n")}`;
  }

  // Fallback genérico
  return `✅ Acción **${source}/${action}** completada.\n\n\`\`\`json\n${JSON.stringify(data, null, 2).slice(0, 2000)}\n\`\`\``;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}