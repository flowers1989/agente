// ==================== WEB PROJECT GENERATOR ====================
// Genera proyectos web completos con frameworks modernos:
//   - Next.js 16 (React 19, App Router, Tailwind, TypeScript)
//   - Vite + React 19
//   - Vite + Vue 3
//   - Astro
//   - SvelteKit
//
// Cada proyecto generado incluye:
//   - Estructura de directorios completa
//   - package.json con dependencias
//   - Configuración de TypeScript
//   - Tailwind CSS configurado
//   - Código fuente funcional
//   - README con instrucciones
//
// Los proyectos se pueden:
//   - Guardar en el sandbox para editar y ejecutar
//   - Servir como vista previa via el sandbox
//   - Descargar como ZIP

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export type WebFramework = "nextjs" | "vite-react" | "vite-vue" | "astro" | "sveltekit";

export interface WebProjectConfig {
  projectName: string;
  framework: WebFramework;
  description?: string;
  // Si el usuario pide algo específico (dashboard, landing, blog, etc.)
  projectType?: "landing" | "dashboard" | "blog" | "ecommerce" | "portfolio" | "admin" | "custom";
  // Estilo visual
  styling?: "tailwind" | "css-modules" | "styled-components" | "plain-css";
  // Características opcionales
  features?: string[]; // "auth", "api-routes", "dark-mode", "i18n", "pwa"
  // Si el usuario proporciona código específico
  customCode?: string;
  // TypeScript
  typescript?: boolean;
}

export interface GeneratedWebProject {
  projectId: string;
  projectPath: string;
  framework: WebFramework;
  files: { path: string; content: string }[];
  packageJson: Record<string, unknown>;
  // Cómo ejecutarlo
  installCommand: string;
  devCommand: string;
  buildCommand: string;
  // Puerto sugerido para dev
  devPort: number;
}

const FRAMEWORK_INFO: Record<
  WebFramework,
  {
    label: string;
    devPort: number;
    installCmd: string;
    devCmd: string;
    buildCmd: string;
  }
> = {
  nextjs: {
    label: "Next.js 16",
    devPort: 3000,
    installCmd: "npm install",
    devCmd: "npm run dev",
    buildCmd: "npm run build",
  },
  "vite-react": {
    label: "Vite + React 19",
    devPort: 5173,
    installCmd: "npm install",
    devCmd: "npm run dev",
    buildCmd: "npm run build",
  },
  "vite-vue": {
    label: "Vite + Vue 3",
    devPort: 5173,
    installCmd: "npm install",
    devCmd: "npm run dev",
    buildCmd: "npm run build",
  },
  astro: {
    label: "Astro",
    devPort: 4321,
    installCmd: "npm install",
    devCmd: "npm run dev",
    buildCmd: "npm run build",
  },
  sveltekit: {
    label: "SvelteKit",
    devPort: 5173,
    installCmd: "npm install",
    devCmd: "npm run dev",
    buildCmd: "npm run build",
  },
};

export function listWebFrameworks(): { id: WebFramework; label: string; description: string }[] {
  return [
    { id: "nextjs", label: "Next.js 16", description: "React 19, App Router, SSR, API routes, Tailwind. Ideal para apps completas." },
    { id: "vite-react", label: "Vite + React 19", description: "SPA rápida con Vite. Ideal para dashboards y apps interactivas." },
    { id: "vite-vue", label: "Vite + Vue 3", description: "SPA con Vue 3 Composition API. Ideal para devs Vue." },
    { id: "astro", label: "Astro", description: "Sitios estáticos ultra-rápidos. Ideal para blogs, portfolios, landings." },
    { id: "sveltekit", label: "SvelteKit", description: "Apps con Svelte 5. Máximo rendimiento, mínimo bundle." },
  ];
}

// Detectar el framework más adecuado según el pedido del usuario
export function detectFramework(userMessage: string): WebFramework {
  const msg = userMessage.toLowerCase();
  if (/\b(next\.?js|nextjs)\b/.test(msg)) return "nextjs";
  if (/\b(astro)\b/.test(msg)) return "astro";
  if (/\b(svelte|sveltekit)\b/.test(msg)) return "sveltekit";
  if (/\b(vue)\b/.test(msg)) return "vite-vue";
  // Por defecto: Vite + React para SPAs, Next.js para apps completas
  if (/\b(app|aplicación|dashboard|admin|sistema|plataforma)\b/.test(msg)) return "nextjs";
  if (/\b(sitio|landing|portfolio|blog|página)\b/.test(msg)) return "astro";
  return "vite-react"; // Default rápido y moderno
}

export async function generateWebProject(
  config: WebProjectConfig,
  outputDir: string = "/tmp/web-projects"
): Promise<GeneratedWebProject> {
  const projectId = `web-${uuidv4()}`;
  const projectPath = join(outputDir, projectId, config.projectName);

  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true });
  }

  const files = generateFiles(config);
  const packageJson = generatePackageJson(config);

  // Escribir todos los archivos
  for (const file of files) {
    const filePath = join(projectPath, file.path);
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, file.content);
  }

  const info = FRAMEWORK_INFO[config.framework];

  return {
    projectId,
    projectPath,
    framework: config.framework,
    files,
    packageJson,
    installCommand: info.installCmd,
    devCommand: info.devCmd,
    buildCommand: info.buildCmd,
    devPort: info.devPort,
  };
}

function generatePackageJson(config: WebProjectConfig): Record<string, unknown> {
  const name = config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const ts = config.typescript !== false;

  const base: Record<string, unknown> = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {},
  };

  switch (config.framework) {
    case "nextjs":
      return {
        ...base,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
        },
        dependencies: {
          next: "^16.1.1",
          react: "^19.0.0",
          "react-dom": "^19.0.0",
        },
        devDependencies: {
          typescript: ts ? "^5" : undefined,
          "@types/react": ts ? "^19" : undefined,
          "@types/react-dom": ts ? "^19" : undefined,
          "@types/node": ts ? "^22" : undefined,
          tailwindcss: "^4",
          "@tailwindcss/postcss": "^4",
          postcss: "^8",
        },
      };

    case "vite-react":
      return {
        ...base,
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.3.4",
          vite: "^6.0.0",
          typescript: ts ? "^5" : undefined,
          "@types/react": ts ? "^19" : undefined,
          "@types/react-dom": ts ? "^19" : undefined,
          tailwindcss: "^4",
          "@tailwindcss/postcss": "^4",
          postcss: "^8",
        },
      };

    case "vite-vue":
      return {
        ...base,
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          vue: "^3.5.13",
        },
        devDependencies: {
          "@vitejs/plugin-vue": "^5.2.1",
          vite: "^6.0.0",
          typescript: ts ? "^5" : undefined,
          "vue-tsc": ts ? "^2.2.0" : undefined,
          tailwindcss: "^4",
          "@tailwindcss/postcss": "^4",
          postcss: "^8",
        },
      };

    case "astro":
      return {
        ...base,
        scripts: {
          dev: "astro dev",
          build: "astro build",
          preview: "astro preview",
        },
        dependencies: {
          astro: "^5.1.1",
        },
        devDependencies: {
          "@astrojs/tailwind": "^5.1.4",
          tailwindcss: "^4",
        },
      };

    case "sveltekit":
      return {
        ...base,
        scripts: {
          dev: "vite dev",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          "@sveltejs/kit": "^2.15.1",
          svelte: "^5.16.0",
        },
        devDependencies: {
          "@sveltejs/vite-plugin-svelte": "^5.0.3",
          "@sveltejs/adapter-auto": "^3.3.1",
          vite: "^6.0.0",
          typescript: ts ? "^5" : undefined,
          svelte_check: "^4.1.1",
          tailwindcss: "^4",
          "@tailwindcss/postcss": "^4",
          postcss: "^8",
        },
      };
  }
}

function generateFiles(config: WebProjectConfig): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const ts = config.typescript !== false;

  // README
  files.push({
    path: "README.md",
    content: `# ${config.projectName}

${config.description || "Proyecto web generado por Agente IA"}

## Stack
- **Framework**: ${FRAMEWORK_INFO[config.framework].label}
- **Lenguaje**: ${ts ? "TypeScript" : "JavaScript"}
- **Styling**: Tailwind CSS 4

## Desarrollo

\`\`\`bash
${FRAMEWORK_INFO[config.framework].installCmd}
${FRAMEWORK_INFO[config.framework].devCmd}
\`\`\`

Abre http://localhost:${FRAMEWORK_INFO[config.framework].devPort}

## Build

\`\`\`bash
${FRAMEWORK_INFO[config.framework].buildCmd}
\`\`\`

## Características
${(config.features || ["Tailwind CSS", "TypeScript", "Hot Reload"]).map((f) => `- ${f}`).join("\n")}
`,
  });

  // Archivos según framework
  switch (config.framework) {
    case "nextjs":
      files.push(...generateNextJsFiles(config, ts));
      break;
    case "vite-react":
      files.push(...generateViteReactFiles(config, ts));
      break;
    case "vite-vue":
      files.push(...generateViteVueFiles(config, ts));
      break;
    case "astro":
      files.push(...generateAstroFiles(config));
      break;
    case "sveltekit":
      files.push(...generateSvelteKitFiles(config, ts));
      break;
  }

  return files;
}

// ===== NEXT.JS =====

function generateNextJsFiles(config: WebProjectConfig, ts: boolean): { path: string; content: string }[] {
  const ext = ts ? "tsx" : "jsx";
  const extJs = ts ? "ts" : "js";
  const files: { path: string; content: string }[] = [];

  // package.json
  files.push({ path: "package.json", content: JSON.stringify(generatePackageJson(config), null, 2) });

  // next.config.ts
  files.push({
    path: "next.config.ts",
    content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
  });

  // tsconfig.json
  if (ts) {
    files.push({
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./src/*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
    });
  }

  // postcss.config.mjs
  files.push({
    path: "postcss.config.mjs",
    content: `const config = {
  plugins: ["@tailwindcss/postcss"],
};
export default config;
`,
  });

  // app/globals.css
  files.push({
    path: "src/app/globals.css",
    content: `@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
  }
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`,
  });

  // app/layout.tsx
  files.push({
    path: `src/app/layout.${ext}`,
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(config.projectName)},
  description: ${JSON.stringify(config.description || "Generado por Agente IA")},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`,
  });

  // app/page.tsx
  files.push({
    path: `src/app/page.${ext}`,
    content: generatePageContent(config),
  });

  return files;
}

// ===== VITE + REACT =====

function generateViteReactFiles(config: WebProjectConfig, ts: boolean): { path: string; content: string }[] {
  const ext = ts ? "tsx" : "jsx";
  const files: { path: string; content: string }[] = [];

  files.push({ path: "package.json", content: JSON.stringify(generatePackageJson(config), null, 2) });

  files.push({
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
`,
  });

  if (ts) {
    files.push({
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            isolatedModules: true,
            moduleDetection: "force",
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
          },
          include: ["src"],
        },
        null,
        2
      ),
    });
  }

  files.push({
    path: "postcss.config.js",
    content: `export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
`,
  });

  files.push({
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>
`,
  });

  files.push({
    path: `src/main.${ext}`,
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  });

  files.push({
    path: "src/index.css",
    content: `@import "tailwindcss";

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`,
  });

  files.push({
    path: `src/App.${ext}`,
    content: generatePageContent(config),
  });

  return files;
}

// ===== VITE + VUE =====

function generateViteVueFiles(config: WebProjectConfig, ts: boolean): { path: string; content: string }[] {
  const ext = ts ? "ts" : "js";
  const files: { path: string; content: string }[] = [];

  files.push({ path: "package.json", content: JSON.stringify(generatePackageJson(config), null, 2) });

  files.push({
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, host: true },
});
`,
  });

  files.push({
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>
`,
  });

  files.push({
    path: `src/main.${ext}`,
    content: `import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).mount('#app');
`,
  });

  files.push({
    path: "src/style.css",
    content: `@import "tailwindcss";

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
`,
  });

  files.push({
    path: "src/App.vue",
    content: `<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
    <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-2xl w-full text-white shadow-2xl">
      <h1 class="text-4xl font-bold mb-4">${config.projectName}</h1>
      <p class="text-lg opacity-90 mb-6">${config.description || "Generado por Agente IA con Vue 3 + Vite"}</p>
      <div class="flex gap-4">
        <button class="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-opacity-90 transition">
          Comenzar
        </button>
        <button class="px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition">
          Documentación
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Componente principal
</script>
`,
  });

  return files;
}

// ===== ASTRO =====

function generateAstroFiles(config: WebProjectConfig): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];

  files.push({ path: "package.json", content: JSON.stringify(generatePackageJson(config), null, 2) });

  files.push({
    path: "astro.config.mjs",
    content: `import { defineConfig } from 'astro/config';

export default defineConfig({
  server: { port: 4321, host: true },
});
`,
  });

  files.push({
    path: "src/layouts/Layout.astro",
    content: `---
interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  @import "tailwindcss";

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
`,
  });

  files.push({
    path: "src/pages/index.astro",
    content: `---
import Layout from '../layouts/Layout.astro';

const title = ${JSON.stringify(config.projectName)};
const description = ${JSON.stringify(config.description || "Sitio generado por Agente IA con Astro")};
---

<Layout title={title} description={description}>
  <main class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
    <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-2xl w-full text-white shadow-2xl">
      <h1 class="text-4xl font-bold mb-4">{title}</h1>
      <p class="text-lg opacity-90 mb-6">{description}</p>
      <div class="flex gap-4">
        <a href="#" class="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-opacity-90 transition">
          Comenzar
        </a>
        <a href="#" class="px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition">
          Documentación
        </a>
      </div>
    </div>
  </main>
</Layout>
`,
  });

  return files;
}

// ===== SVELTEKIT =====

function generateSvelteKitFiles(config: WebProjectConfig, ts: boolean): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];

  files.push({ path: "package.json", content: JSON.stringify(generatePackageJson(config), null, 2) });

  files.push({
    path: "vite.config.ts",
    content: `import { sveltekit } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: { port: 5173, host: true },
});
`,
  });

  files.push({
    path: "svelte.config.js",
    content: `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
`,
  });

  files.push({
    path: "src/routes/+layout.svelte",
    content: `<script>
  import '../app.css';
</script>

<slot />
`,
  });

  files.push({
    path: "src/app.css",
    content: `@import "tailwindcss";

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
`,
  });

  files.push({
    path: "src/routes/+page.svelte",
    content: `<svelte:head>
  <title>${config.projectName}</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
  <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-2xl w-full text-white shadow-2xl">
    <h1 class="text-4xl font-bold mb-4">${config.projectName}</h1>
    <p class="text-lg opacity-90 mb-6">${config.description || "Generado por Agente IA con SvelteKit"}</p>
    <div class="flex gap-4">
      <button class="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-opacity-90 transition">
        Comenzar
      </button>
      <button class="px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition">
        Documentación
      </button>
    </div>
  </div>
</main>
`,
  });

  return files;
}

// ===== CONTENIDO DE PÁGINA SEGÚN TIPO =====

function generatePageContent(config: WebProjectConfig): string {
  // Si hay código custom, usarlo
  if (config.customCode) {
    return config.customCode;
  }

  // Generar según projectType
  switch (config.projectType) {
    case "dashboard":
      return generateDashboardContent(config.projectName);
    case "landing":
      return generateLandingContent(config.projectName, config.description);
    case "portfolio":
      return generatePortfolioContent(config.projectName);
    case "blog":
      return generateBlogContent(config.projectName);
    case "ecommerce":
      return generateEcommerceContent(config.projectName);
    case "admin":
      return generateAdminContent(config.projectName);
    default:
      return generateGenericContent(config.projectName, config.description);
  }
}

function generateLandingContent(name: string, desc?: string): string {
  return `"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Hero */}
      <section className="container mx-auto px-6 py-20 text-center text-white">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">${name}</h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
          ${desc || "La solución moderna para tu negocio. Rápida, elegante y potente."}
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-opacity-90 transition shadow-lg">
            Comenzar gratis
          </button>
          <button className="px-8 py-4 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition">
            Ver demo
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
          Características principales
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Rápido", desc: "Optimizado para máxima velocidad de carga." },
            { title: "Moderno", desc: "Construido con las últimas tecnologías." },
            { title: "Responsive", desc: "Se ve perfecto en cualquier dispositivo." },
          ].map((f) => (
            <div key={f.title} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
              <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
              <p className="opacity-90">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-3xl mx-auto text-white">
          <h2 className="text-3xl font-bold mb-4">¿Listo para empezar?</h2>
          <p className="text-lg opacity-90 mb-8">Únete hoy y transforma tu experiencia.</p>
          <button className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-opacity-90 transition shadow-lg">
            Crear cuenta
          </button>
        </div>
      </section>
    </div>
  );
}
`;
}

function generateDashboardContent(name: string): string {
  return `"use client";

export default function Dashboard() {
  const stats = [
    { label: "Usuarios", value: "12,345", change: "+12%" },
    { label: "Ingresos", value: "$45,678", change: "+8%" },
    { label: "Pedidos", value: "1,234", change: "+23%" },
    { label: "Conversión", value: "3.45%", change: "+0.5%" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">${name}</h1>
        <nav className="space-y-2">
          {["Dashboard", "Analíticas", "Usuarios", "Pedidos", "Configuración"].map((item, i) => (
            <a
              key={item}
              href="#"
              className={\`block px-4 py-2 rounded-lg transition \${
                i === 0 ? "bg-purple-600" : "hover:bg-gray-800"
              }\`}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="ml-64 p-8">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Bienvenido de nuevo</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-green-600 mt-2">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Ingresos mensuales</h3>
          <div className="h-64 flex items-end justify-around">
            {[40, 65, 50, 80, 70, 90, 60, 75, 85, 95, 70, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 mx-1 bg-gradient-to-t from-purple-600 to-pink-500 rounded-t-lg"
                style={{ height: \`\${h}%\` }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
`;
}

function generatePortfolioContent(name: string): string {
  return `"use client";

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="container mx-auto px-6 py-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">${name}</h1>
        <nav className="space-x-6">
          <a href="#about" className="hover:text-purple-400">Sobre mí</a>
          <a href="#projects" className="hover:text-purple-400">Proyectos</a>
          <a href="#contact" className="hover:text-purple-400">Contacto</a>
        </nav>
      </header>

      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Hola, soy ${name}
        </h2>
        <p className="text-xl text-gray-400 mb-8">Desarrollador Full-Stack & Diseñador</p>
        <button className="px-8 py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-700 transition">
          Ver proyectos
        </button>
      </section>

      <section id="projects" className="container mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold mb-12 text-center">Proyectos destacados</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              <div className={\`h-48 bg-gradient-to-br \` + ['from-purple-600 to-pink-600', 'from-blue-600 to-cyan-600', 'from-orange-600 to-red-600'][i-1]} />
              <div className="p-6">
                <h4 className="text-xl font-semibold mb-2">Proyecto {i}</h4>
                <p className="text-gray-400 text-sm">Descripción breve del proyecto destacado.</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
}

function generateBlogContent(name: string): string {
  return `"use client";

export default function Blog() {
  const posts = [
    { title: "Primer post", excerpt: "Bienvenido al blog...", date: "2026-01-15", tag: "General" },
    { title: "Segundo post", excerpt: "Más contenido...", date: "2026-01-20", tag: "Tech" },
    { title: "Tercer post", excerpt: "Otro artículo...", date: "2026-01-25", tag: "Diseño" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">${name}</h1>
          <p className="text-gray-600 mt-1">Blog sobre tecnología y desarrollo</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h2 className="text-2xl font-bold mb-8">Últimos artículos</h2>
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.title} className="border-b border-gray-100 pb-8">
              <span className="text-xs text-purple-600 font-semibold uppercase">{post.tag}</span>
              <h3 className="text-2xl font-bold mt-2 mb-2 hover:text-purple-600 cursor-pointer">{post.title}</h3>
              <p className="text-gray-600 mb-2">{post.excerpt}</p>
              <span className="text-sm text-gray-400">{post.date}</span>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
`;
}

function generateEcommerceContent(name: string): string {
  return `"use client";

export default function Ecommerce() {
  const products = [
    { name: "Producto 1", price: 29.99, image: "from-purple-400 to-pink-400" },
    { name: "Producto 2", price: 49.99, image: "from-blue-400 to-cyan-400" },
    { name: "Producto 3", price: 19.99, image: "from-orange-400 to-red-400" },
    { name: "Producto 4", price: 99.99, image: "from-green-400 to-teal-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">${name}</h1>
          <div className="flex items-center gap-4">
            <input type="text" placeholder="Buscar..." className="px-4 py-2 border rounded-lg" />
            <button className="relative">
              🛒
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold mb-8">Productos destacados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.name} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
              <div className={\`h-48 bg-gradient-to-br \${p.image}\`} />
              <div className="p-4">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-2xl font-bold text-purple-600 my-2">\${p.price}</p>
                <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                  Añadir al carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
`;
}

function generateAdminContent(name: string): string {
  return `"use client";

export default function Admin() {
  const users = [
    { name: "Ana García", email: "ana@ejemplo.com", role: "Admin", status: "Activo" },
    { name: "Carlos López", email: "carlos@ejemplo.com", role: "Editor", status: "Activo" },
    { name: "María Pérez", email: "maria@ejemplo.com", role: "Usuario", status: "Inactivo" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">${name} - Admin</h1>
          <button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">Cerrar sesión</button>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold">Usuarios</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Rol</th>
                <th className="text-left p-4">Estado</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">{u.role}</span>
                  </td>
                  <td className="p-4">
                    <span className={\`px-2 py-1 rounded text-sm \${
                      u.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }\`}>{u.status}</span>
                  </td>
                  <td className="p-4">
                    <button className="text-purple-600 hover:underline text-sm">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
`;
}

function generateGenericContent(name: string, desc?: string): string {
  return `"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-2xl w-full text-white shadow-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">${name}</h1>
        <p className="text-lg opacity-90 mb-6">${desc || "Generado por Agente IA con framework moderno"}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-opacity-90 transition">
            Comenzar
          </button>
          <button className="px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition">
            Documentación
          </button>
        </div>
      </div>
    </div>
  );
}
`;
}

// ===== SERVIR VISTA PREVIA =====

export async function serveWebPreview(projectPath: string, port: number): Promise<string> {
  // Intentar npm install + npm run dev (requiere Node en el servidor)
  // Para simplicidad, servimos archivos estáticos con un server HTTP simple
  const serverScript = join(projectPath, "_preview-server.js");
  writeFileSync(
    serverScript,
    `
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = '${projectPath}';
const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  // Para Astro/Next, buscar en dist/ o out/
  let filePath = path.join(root, urlPath);
  if (!fs.existsSync(filePath)) {
    // Buscar en src/
    filePath = path.join(root, 'src', urlPath);
  }
  if (!fs.existsSync(filePath)) {
    // Buscar en public/
    filePath = path.join(root, 'public', urlPath);
  }
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.tsx': 'text/plain',
    '.ts': 'text/plain',
    '.vue': 'text/plain',
    '.svelte': 'text/plain',
    '.astro': 'text/plain',
    '.md': 'text/markdown',
  };
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found: ' + urlPath);
  }
});
server.listen(${port}, () => console.log('Preview en http://localhost:' + ${port}));
`
  );

  try {
    await execAsync(`node ${serverScript} &`, { timeout: 2000 }).catch(() => {});
  } catch {}

  return `http://localhost:${port}`;
}
