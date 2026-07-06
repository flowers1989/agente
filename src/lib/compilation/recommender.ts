// ==================== MOTOR DE RECOMENDACIONES DE PLATAFORMAS ====================
// Calcula qué plataformas son más adecuadas según los requisitos.

import type { AppRequirements, Platform, PlatformRecommendation } from "./types";

const PLATFORMS: Platform[] = ["android", "android-tv", "windows", "linux", "macos"];

interface PlatformProfile {
  name: string;
  naturalFor: AppRequirements["type"][];
  frameworks: Record<AppRequirements["type"], string>;
  featureSupport: Partial<Record<keyof AppRequirements["features"], number>>;
  performance: number;
  cost: number;
  ease: number;
  pros: string[];
  cons: string[];
  estimatedTime: Record<AppRequirements["type"], string>;
  estimatedCost: Record<AppRequirements["constraints"]["budget"], string>;
}

const PROFILES: Record<Platform, PlatformProfile> = {
  android: {
    name: "Android",
    naturalFor: ["mobile", "game", "utility"],
    frameworks: {
      mobile: "Jetpack Compose + Kotlin",
      desktop: "Electron + Capacitor",
      web: "PWA / WebView",
      game: "Godot / Unity",
      utility: "Kotlin + Jetpack Compose",
      enterprise: "Kotlin + Jetpack Compose",
    },
    featureSupport: { camera: 1, gps: 1, offline: 0.8, realtime: 0.9, ai: 0.8, graphics: 1 },
    performance: 0.85,
    cost: 0.7,
    ease: 0.75,
    pros: ["Mayor base de usuarios móviles", "Google Play distribución", "Buen soporte para hardware"],
    cons: ["Fragmentación de dispositivos", "Requiere Android SDK", "Proceso de firma para Play Store"],
    estimatedTime: {
      mobile: "4-6 semanas",
      desktop: "6-8 semanas",
      web: "3-4 semanas",
      game: "6-10 semanas",
      utility: "3-5 semanas",
      enterprise: "6-10 semanas",
    },
    estimatedCost: {
      low: "$500 - $2,000",
      medium: "$2,000 - $10,000",
      high: "$10,000+",
    },
  },
  "android-tv": {
    name: "Android TV",
    naturalFor: ["game", "enterprise"],
    frameworks: {
      mobile: "Leanback + Kotlin",
      desktop: "Leanback + Kotlin",
      web: "PWA / WebView",
      game: "Godot / Unity",
      utility: "Leanback + Kotlin",
      enterprise: "Leanback + Kotlin",
    },
    featureSupport: { camera: 0, gps: 0, offline: 0.7, realtime: 0.8, ai: 0.6, graphics: 0.9 },
    performance: 0.75,
    cost: 0.75,
    ease: 0.6,
    pros: ["Optimizado para TV", "Interfaz Leanback", "Ideal para streaming y juegos"],
    cons: ["Mercado más pequeño", "Navegación con control remoto", "Menos usuarios que móvil"],
    estimatedTime: {
      mobile: "5-7 semanas",
      desktop: "5-7 semanas",
      web: "4-5 semanas",
      game: "6-10 semanas",
      utility: "4-6 semanas",
      enterprise: "6-10 semanas",
    },
    estimatedCost: {
      low: "$1,000 - $3,000",
      medium: "$3,000 - $12,000",
      high: "$12,000+",
    },
  },
  windows: {
    name: "Windows",
    naturalFor: ["desktop", "enterprise", "game", "utility"],
    frameworks: {
      mobile: "React Native / .NET MAUI",
      desktop: "WinUI 3 / .NET",
      web: "Electron / PWA",
      game: "Unity / Godot",
      utility: "WinUI 3 / .NET",
      enterprise: "WinUI 3 / .NET",
    },
    featureSupport: { camera: 0.8, gps: 0.5, offline: 0.9, realtime: 0.9, ai: 0.9, graphics: 0.9 },
    performance: 0.9,
    cost: 0.75,
    ease: 0.8,
    pros: ["Estándar empresarial", "Alto rendimiento", "Gran ecosistema de desarrollo"],
    cons: ["Licenciamiento en entornos empresariales", "Requiere Windows para compilar nativo", "Menos popular para consumo móvil"],
    estimatedTime: {
      mobile: "6-8 semanas",
      desktop: "4-6 semanas",
      web: "3-4 semanas",
      game: "5-8 semanas",
      utility: "3-5 semanas",
      enterprise: "6-10 semanas",
    },
    estimatedCost: {
      low: "$1,000 - $3,000",
      medium: "$3,000 - $15,000",
      high: "$15,000+",
    },
  },
  linux: {
    name: "Linux",
    naturalFor: ["desktop", "enterprise", "utility"],
    frameworks: {
      mobile: "React Native / Avalonia",
      desktop: "GTK / Qt / Electron",
      web: "Electron / PWA",
      game: "Godot / Unity",
      utility: "Python + GTK/Qt",
      enterprise: "Java / Electron",
    },
    featureSupport: { camera: 0.6, gps: 0.4, offline: 0.9, realtime: 0.85, ai: 0.9, graphics: 0.7 },
    performance: 0.85,
    cost: 0.9,
    ease: 0.7,
    pros: ["Código abierto", "Bajo costo", "Ideal para servidores y desarrolladores"],
    cons: ["Menor cuota de mercado desktop", "Fragmentación de distros", "Menos herramientas comerciales"],
    estimatedTime: {
      mobile: "6-8 semanas",
      desktop: "4-6 semanas",
      web: "3-4 semanas",
      game: "5-8 semanas",
      utility: "2-4 semanas",
      enterprise: "5-8 semanas",
    },
    estimatedCost: {
      low: "$500 - $1,500",
      medium: "$1,500 - $8,000",
      high: "$8,000+",
    },
  },
  macos: {
    name: "macOS",
    naturalFor: ["desktop", "enterprise", "utility"],
    frameworks: {
      mobile: "React Native / Catalyst",
      desktop: "SwiftUI / AppKit",
      web: "Electron / PWA",
      game: "Unity / Godot",
      utility: "SwiftUI",
      enterprise: "SwiftUI / AppKit",
    },
    featureSupport: { camera: 0.9, gps: 0.3, offline: 0.9, realtime: 0.9, ai: 0.9, graphics: 0.85 },
    performance: 0.9,
    cost: 0.65,
    ease: 0.75,
    pros: ["Alta calidad de usuario", "Popular en startups", "Buen rendimiento en Apple Silicon"],
    cons: ["Requiere macOS/Xcode para compilar", "Mercado más pequeño", "Costo de hardware Apple"],
    estimatedTime: {
      mobile: "6-8 semanas",
      desktop: "4-6 semanas",
      web: "3-4 semanas",
      game: "5-8 semanas",
      utility: "3-5 semanas",
      enterprise: "6-10 semanas",
    },
    estimatedCost: {
      low: "$1,000 - $3,000",
      medium: "$3,000 - $12,000",
      high: "$12,000+",
    },
  },
};

export function getRecommendations(requirements: AppRequirements): PlatformRecommendation[] {
  const recommendations = PLATFORMS.map((platform) => {
    const profile = PROFILES[platform];

    // Compatibilidad: ¿soporta las features requeridas? ¿es natural para este tipo?
    const featureKeys = Object.keys(requirements.features) as (keyof AppRequirements["features"])[];
    let featureScore = 0;
    let featureCount = 0;
    featureKeys.forEach((key) => {
      const required = requirements.features[key];
      if (required) {
        const support = profile.featureSupport[key] ?? 0.5;
        featureScore += support;
        featureCount++;
      }
    });
    const featureCompatibility = featureCount > 0 ? featureScore / featureCount : 0.8;
    const naturalMatch = profile.naturalFor.includes(requirements.type) ? 1 : 0.5;
    const compatibility = (featureCompatibility * 0.6 + naturalMatch * 0.4) * 100;

    // Rendimiento
    const performanceMap = { light: 0.7, medium: 0.85, heavy: 1 };
    const performance = profile.performance * performanceMap[requirements.performance.dataProcessing] * 100;

    // Costo
    const costMap = { low: 1, medium: 0.75, high: 0.5 };
    const cost = profile.cost * costMap[requirements.constraints.budget] * 100;

    // Facilidad
    const easeMap = { solo: 0.7, small: 0.85, large: 1 };
    const ease = profile.ease * easeMap[requirements.constraints.team] * 100;

    // Puntuación final
    const score = Math.round(
      compatibility * 0.4 + performance * 0.3 + cost * 0.2 + ease * 0.1
    );

    return {
      platform,
      score: Math.min(100, Math.max(0, score)),
      reasoning: buildReasoning(profile, requirements, compatibility, performance, cost),
      framework: profile.frameworks[requirements.type],
      estimatedTime: profile.estimatedTime[requirements.type],
      estimatedCost: profile.estimatedCost[requirements.constraints.budget],
      pros: profile.pros,
      cons: profile.cons,
    };
  });

  return recommendations.sort((a, b) => b.score - a.score);
}

function buildReasoning(
  profile: PlatformProfile,
  requirements: AppRequirements,
  compatibility: number,
  performance: number,
  cost: number
): string {
  const parts: string[] = [];
  if (profile.naturalFor.includes(requirements.type)) {
    parts.push(`Es una plataforma natural para aplicaciones tipo ${requirements.type}`);
  }
  if (compatibility > 75) parts.push("alta compatibilidad con las características requeridas");
  if (performance > 80) parts.push("buen rendimiento esperado");
  if (cost > 80) parts.push("relación costo/beneficio favorable");
  return parts.length > 0 ? parts.join("; ") + "." : "Opción viable según requisitos.";
}
