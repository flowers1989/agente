import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitiza el texto devuelto por un LLM, eliminando bloques de razonamiento
 * como <think>...</think> que no deben mostrarse al usuario.
 */
export function sanitizeLLMOutput(content: string): string {
  if (!content) return "";
  // Elimina bloques <think>...</think> (multilínea, posiblemente anidados)
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
