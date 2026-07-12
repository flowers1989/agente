// ==================== VALIDACIÓN DE REQUESTS API ====================
// Schemas Zod centralizados para endpoints sensibles.

import { z } from "zod";

// Content puede ser string (texto) o array multimodal (texto + imágenes)
const ContentSchema = z.union([
  z.string(),
  z.array(
    z.object({
      type: z.enum(["text", "image_url"]),
      text: z.string().optional(),
      image_url: z.object({ url: z.string() }).optional(),
    })
  ),
]);

export const ChatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: ContentSchema,
      // Soporte para function-calling nativo (tool_calls en assistant messages)
      tool_calls: z.array(
        z.object({
          id: z.string(),
          type: z.literal("function"),
          function: z.object({
            name: z.string(),
            arguments: z.string(),
          }),
        })
      ).optional(),
      // tool_role messages (respuestas de tools)
      tool_call_id: z.string().optional(),
    })
  ).min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().int().positive().optional().default(4096),
  top_p: z.number().min(0).max(1).optional().default(1),
  stream: z.boolean().optional().default(false),
  // Function-calling nativo
  tools: z.array(
    z.object({
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.string(), z.unknown()),
      }),
    })
  ).optional(),
  tool_choice: z.union([
    z.literal("auto"),
    z.literal("none"),
    z.object({
      type: z.literal("function"),
      function: z.object({ name: z.string() }),
    }),
  ]).optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionSchema>;

export const ConnectorActionSchema = z.object({
  action: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

export const SaveCredentialsSchema = z.object({
  source: z.string().min(1),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  apiKey: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  scopes: z.union([z.array(z.string()), z.string()]).optional(),
  tokenType: z.string().optional(),
  accountId: z.string().optional(),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const SaveAppCredentialsSchema = z.object({
  source: z.string().min(1),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  redirectUri: z.string().url().optional(),
  scopes: z.union([z.array(z.string()), z.string()]).optional(),
});

export const BrowserActionSchema = z.object({
  action: z.enum([
    "navigate",
    "click",
    "clickBySelector",
    "type",
    "scroll",
    "screenshot",
    "extractText",
    "executeScript",
    "getDOMRepresentation",
    "oauthFlow",
  ]),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

export const CompileRequestSchema = z.object({
  projectName: z.string().min(1).max(100),
  requirements: z.record(z.string(), z.unknown()),
  platforms: z.array(z.enum(["android", "android-tv", "windows", "linux", "macos"])).min(1).max(5),
  config: z
    .object({
      project: z
        .object({
          version: z.string().optional(),
          description: z.string().optional(),
          author: z.string().optional(),
          license: z.string().optional(),
        })
        .optional(),
      optimization: z
        .object({
          minify: z.boolean().optional(),
          stripSymbols: z.boolean().optional(),
          compression: z.enum(["low", "medium", "high"]).optional(),
        })
        .optional(),
    })
    .optional(),
});

export const RecommendationsSchema = z.object({
  objective: z.string().min(1).max(2000).optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = (result.error as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues;
    if (issues && Array.isArray(issues)) {
      return { success: false, error: issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") };
    }
    return { success: false, error: result.error.message || "Validación fallida" };
  }
  return { success: true, data: result.data };
}
