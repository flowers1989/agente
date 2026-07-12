// ==================== SANDBOX BROWSER EXECUTOR ====================
// Controla el Chromium DENTRO del sandbox Docker (visible vía VNC).
// A diferencia del BrowserControlConnector que usa Playwright headless local,
// este ejecutor controla el Chromium con GUI que el usuario puede ver.
//
// Usa xdotool para clicks/typing y chromium CLI para navegar.
// Las screenshots se toman con `import` (ImageMagick) del display :0.

import { clientGetOrCreateSandbox, clientExec } from "../sandbox/sandbox-client";
import type { ToolExecutionResult } from "./tool-registry";

export interface SandboxBrowserContext {
  conversationId: string;
  userId: string;
}

// ==================== NAVEGAR A URL ====================

export async function browserNavigate(
  url: string,
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  if (!url) return { success: false, error: "Parámetro 'url' requerido" };

  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Cerrar pestañas existentes y abrir nueva con la URL
    // Usamos --app para abrir en modo ventana (no fullscreen)
    const cmd = `export DISPLAY=:0 && chromium --no-sandbox --disable-gpu --disable-software-rasterizer --start-maximized --app=${JSON.stringify(url)} > /dev/null 2>&1 &`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 10000 });

    // Esperar a que cargue la página
    await clientExec(sandbox.taskId, "sleep 3", { timeoutMs: 10000 });

    // Tomar screenshot para verificar
    const screenshot = await takeScreenshot(sandbox.taskId);

    return {
      success: true,
      result: `Navegado a ${url}`,
      output: screenshot
        ? {
            type: "image" as const,
            content: screenshot,
            title: `Navegado a ${url}`,
            url,
          }
        : {
            type: "text" as const,
            content: `Navegado a ${url}. Toma un screenshot con browser_screenshot para ver la página.`,
            title: "Navegación completada",
          },
    };
  } catch (error) {
    return {
      success: false,
      error: `Error navegando: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== CLICK EN COORDENADAS ====================

export async function browserClick(
  x: number,
  y: number,
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  if (typeof x !== "number" || typeof y !== "number") {
    return { success: false, error: "Parámetros 'x' e 'y' (números) requeridos" };
  }

  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Usar xdotool para hacer click en las coordenadas
    const cmd = `export DISPLAY=:0 && xdotool mousemove ${x} ${y} click 1`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 10000 });

    if (result.exitCode !== 0) {
      return { success: false, error: `xdoTool falló: ${result.stderr}` };
    }

    // Esperar a que la acción surta efecto
    await clientExec(sandbox.taskId, "sleep 1", { timeoutMs: 5000 });

    // Tomar screenshot para verificar
    const screenshot = await takeScreenshot(sandbox.taskId);

    return {
      success: true,
      result: `Click en (${x}, ${y})`,
      output: screenshot
        ? {
            type: "image" as const,
            content: screenshot,
            title: `Click en (${x}, ${y})`,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error en click: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== CLICK POR SELECTOR CSS ====================

export async function browserClickSelector(
  selector: string,
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  if (!selector) return { success: false, error: "Parámetro 'selector' requerido" };

  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Inyectar JavaScript en la página para encontrar el elemento y hacer click
    // Usamos xdotool para enfocar el navegador primero
    const jsCode = `(
      function() {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return 'NOT_FOUND';
        const rect = el.getBoundingClientRect();
        el.click();
        return JSON.stringify({x: rect.x + rect.width/2, y: rect.y + rect.height/2, clicked: true});
      }
    )()`;

    // Escribir el JS a un archivo y ejecutarlo con chromium --evaluate
    // Más simple: usar xdotool con coordenadas calculadas via JS inyectado
    const cmd = `export DISPLAY=:0 && xdotool key ctrl+l && sleep 0.5 && xdotool type "javascript:${jsCode}" && xdotool key Return`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 15000 });

    await clientExec(sandbox.taskId, "sleep 1", { timeoutMs: 5000 });

    const screenshot = await takeScreenshot(sandbox.taskId);

    return {
      success: true,
      result: `Click en selector: ${selector}`,
      output: screenshot
        ? {
            type: "image" as const,
            content: screenshot,
            title: `Click en ${selector}`,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error en click por selector: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== TYPE TEXT ====================

export async function browserType(
  text: string,
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  if (!text) return { success: false, error: "Parámetro 'text' requerido" };

  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Escribir el texto a un archivo para evitar problemas de escaping
    const fileName = `/tmp/type_${Date.now()}.txt`;
    const writeCmd = `cat > ${fileName} << 'ENDOFTEXT'\n${text}\nENDOFTEXT`;
    await clientExec(sandbox.taskId, writeCmd, { timeoutMs: 5000 });

    // Usar xdotool para tipear el contenido del archivo
    // xclip copia al portapapeles, xdotool pega con ctrl+v
    const cmd = `export DISPLAY=:0 && xclip -selection clipboard < ${fileName} && xdotool key ctrl+v`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 10000 });

    if (result.exitCode !== 0) {
      // Fallback: tipear directamente con xdotool type
      const escapedText = text.replace(/'/g, "'\\''");
      const fallbackCmd = `export DISPLAY=:0 && xdotool type '${escapedText}'`;
      const fallbackResult = await clientExec(sandbox.taskId, fallbackCmd, { timeoutMs: 10000 });
      if (fallbackResult.exitCode !== 0) {
        return { success: false, error: `xdoTool type falló: ${fallbackResult.stderr}` };
      }
    }

    await clientExec(sandbox.taskId, "sleep 0.5", { timeoutMs: 5000 });

    const screenshot = await takeScreenshot(sandbox.taskId);

    return {
      success: true,
      result: `Texto tipeado: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`,
      output: screenshot
        ? {
            type: "image" as const,
            content: screenshot,
            title: "Texto ingresado",
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error tipeando: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== PRESIONAR TECLA ====================

export async function browserKeyPress(
  key: string,
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  if (!key) return { success: false, error: "Parámetro 'key' requerido" };

  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Mapear teclas comunes a xdotool keysyms
    const keyMap: Record<string, string> = {
      Enter: "Return",
      Tab: "Tab",
      Escape: "Escape",
      Backspace: "BackSpace",
      Space: "space",
      ArrowUp: "Up",
      ArrowDown: "Down",
      ArrowLeft: "Left",
      ArrowRight: "Right",
      "ctrl+c": "ctrl+c",
      "ctrl+v": "ctrl+v",
      "ctrl+a": "ctrl+a",
      "ctrl+s": "ctrl+s",
      F5: "F5",
      F12: "F12",
    };

    const keysym = keyMap[key] || key;
    const cmd = `export DISPLAY=:0 && xdotool key ${keysym}`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 5000 });

    if (result.exitCode !== 0) {
      return { success: false, error: `xdoTool key falló: ${result.stderr}` };
    }

    await clientExec(sandbox.taskId, "sleep 0.5", { timeoutMs: 5000 });

    const screenshot = await takeScreenshot(sandbox.taskId);

    return {
      success: true,
      result: `Tecla presionada: ${key}`,
      output: screenshot
        ? {
            type: "image" as const,
            content: screenshot,
            title: `Tecla: ${key}`,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error presionando tecla: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== SCROLL ====================

export async function browserScroll(
  direction: "up" | "down",
  amount: number,
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // xdotool click 4 = scroll up, click 5 = scroll down
    const button = direction === "up" ? 4 : 5;
    const clicks = Math.max(1, Math.min(20, amount || 3));

    const cmd = `export DISPLAY=:0 && for i in $(seq 1 ${clicks}); do xdotool click ${button}; sleep 0.1; done`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 10000 });

    if (result.exitCode !== 0) {
      return { success: false, error: `Scroll falló: ${result.stderr}` };
    }

    const screenshot = await takeScreenshot(sandbox.taskId);

    return {
      success: true,
      result: `Scroll ${direction} ${clicks} clicks`,
      output: screenshot
        ? {
            type: "image" as const,
            content: screenshot,
            title: `Scroll ${direction}`,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error en scroll: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== SCREENSHOT ====================

export async function browserScreenshot(
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);
    const screenshot = await takeScreenshot(sandbox.taskId);

    if (!screenshot) {
      return { success: false, error: "No se pudo capturar screenshot" };
    }

    return {
      success: true,
      result: "Screenshot capturado",
      output: {
        type: "image" as const,
        content: screenshot,
        title: "Screenshot del sandbox",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Error tomando screenshot: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== HELPER: TOMAR SCREENSHOT ====================

async function takeScreenshot(taskId: string): Promise<string | null> {
  try {
    // Usar import (ImageMagick) para capturar el display :0
    // Guardar como PNG, convertir a base64
    const fileName = `/tmp/screenshot_${Date.now()}.png`;
    const cmd = `export DISPLAY=:0 && import -window root ${fileName} 2>/dev/null && base64 -w0 ${fileName} && rm -f ${fileName}`;
    const result = await clientExec(taskId, cmd, { timeoutMs: 15000 });

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      // Fallback: usar xdotool para enfocar y scrot
      const fallbackCmd = `export DISPLAY=:0 && scrot ${fileName} 2>/dev/null && base64 -w0 ${fileName} && rm -f ${fileName}`;
      const fallbackResult = await clientExec(taskId, fallbackCmd, { timeoutMs: 15000 });
      if (fallbackResult.exitCode !== 0 || !fallbackResult.stdout.trim()) {
        return null;
      }
      return `data:image/png;base64,${fallbackResult.stdout.trim()}`;
    }

    return `data:image/png;base64,${result.stdout.trim()}`;
  } catch {
    return null;
  }
}

// ==================== EXTRAER TEXTO DE LA PÁGINA ====================

export async function browserExtractText(
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Usar xdotool para seleccionar todo (ctrl+a), copiar (ctrl+c), y leer el portapapeles
    const cmd = `export DISPLAY=:0 && xdotool key ctrl+a && sleep 0.3 && xdotool key ctrl+c && sleep 0.3 && xclip -selection clipboard -o`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 10000 });

    if (result.exitCode !== 0) {
      return { success: false, error: "No se pudo extraer texto de la página" };
    }

    const text = result.stdout.trim();
    if (!text) {
      return { success: false, error: "No hay texto seleccionable en la página" };
    }

    return {
      success: true,
      result: text.slice(0, 5000),
      output: {
        type: "text" as const,
        content: text,
        title: "Texto extraído de la página",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Error extrayendo texto: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== OBTENER URL ACTUAL ====================

export async function browserGetUrl(
  context: SandboxBrowserContext
): Promise<ToolExecutionResult> {
  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Enfocar la barra de dirección (ctrl+l), copiar (ctrl+c), leer portapapeles
    const cmd = `export DISPLAY=:0 && xdotool key ctrl+l && sleep 0.3 && xdotool key ctrl+c && sleep 0.3 && xclip -selection clipboard -o`;
    const result = await clientExec(sandbox.taskId, cmd, { timeoutMs: 10000 });

    if (result.exitCode !== 0) {
      return { success: false, error: "No se pudo obtener la URL actual" };
    }

    const url = result.stdout.trim();
    return {
      success: true,
      result: url,
      output: {
        type: "text" as const,
        content: `URL actual: ${url}`,
        title: "URL actual",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Error obteniendo URL: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
