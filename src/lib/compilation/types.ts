// ==================== TIPOS DEL SISTEMA DE COMPILACIÓN MULTIPLATAFORMA ====================
// Basado en Compilación.md

export type Platform =
  | "android"
  | "android-tv"
  | "windows"
  | "linux"
  | "macos";

export type AppType =
  | "mobile"
  | "desktop"
  | "web"
  | "game"
  | "utility"
  | "enterprise";

export type OutputFormat =
  | "apk"
  | "aab"
  | "exe"
  | "msi"
  | "appx"
  | "deb"
  | "rpm"
  | "appimage"
  | "snap"
  | "flatpak"
  | "dmg"
  | "pkg"
  | "app"
  | "zip"
  | "tar.gz";

export interface AppRequirements {
  type: AppType;
  features: {
    camera?: boolean;
    gps?: boolean;
    offline?: boolean;
    realtime?: boolean;
    ai?: boolean;
    graphics?: "basic" | "2d" | "3d";
  };
  performance: {
    targetUsers: number;
    dataProcessing: "light" | "medium" | "heavy";
    memoryIntensive: boolean;
  };
  constraints: {
    budget: "low" | "medium" | "high";
    timeline: "urgent" | "normal" | "flexible";
    team: "solo" | "small" | "large";
  };
}

export interface PlatformRecommendation {
  platform: Platform;
  score: number;
  reasoning: string;
  framework: string;
  estimatedTime: string;
  estimatedCost: string;
  pros: string[];
  cons: string[];
}

export interface BuildConfig {
  project: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
  };
  platforms: Partial<Record<Platform, {
    enabled: boolean;
    minSdk?: number;
    targetSdk?: number;
    abis?: string[];
    outputFormat?: OutputFormat;
    architecture?: string | string[];
    distributions?: string[];
    minimumVersion?: string;
  }>>;
  features: AppRequirements["features"];
  optimization: {
    minify: boolean;
    stripSymbols: boolean;
    compression: "none" | "low" | "medium" | "maximum";
  };
}

export interface BuildArtifact {
  id: string;
  buildId: string;
  projectName: string;
  version: string;
  platform: Platform;
  format: OutputFormat;
  fileSize: number;
  checksum: string;
  filePath: string;
  uploadedAt: Date;
  expiresAt?: Date;
  downloadUrl: string;
  installationInstructions: string;
}

export type BuildStatus = "queued" | "compiling" | "completed" | "failed";

export interface Build {
  id: string;
  projectName: string;
  requirements: AppRequirements;
  platforms: Platform[];
  config: BuildConfig;
  status: BuildStatus;
  progress: number;
  logs: BuildLogEntry[];
  artifacts: BuildArtifact[];
  estimatedTime: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface BuildLogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  platform?: Platform;
}

export interface CompileRequest {
  projectName: string;
  requirements: AppRequirements;
  platforms: Platform[];
  config?: Partial<BuildConfig>;
}

export interface CompileResponse {
  buildId: string;
  status: BuildStatus;
  artifacts: BuildArtifact[];
  estimatedTime: number;
}

export interface BuildStatusResponse {
  buildId: string;
  status: BuildStatus;
  progress: number;
  logs: BuildLogEntry[];
  artifacts: BuildArtifact[];
}

export interface RecommendationRequest {
  requirements: AppRequirements;
}

export interface RecommendationResponse {
  recommendations: PlatformRecommendation[];
}

export interface CompilerResult {
  success: boolean;
  artifact?: BuildArtifact;
  logs: BuildLogEntry[];
  error?: string;
}

export interface GeneratedProject {
  rootPath: string;
  config: BuildConfig;
  files: { path: string; content: string }[];
}
