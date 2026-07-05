import { describe, it, expect } from "vitest";
import { generateProject } from "./generator";
import type { BuildConfig } from "./types";

const baseConfig: BuildConfig = {
  project: { name: "TestApp", version: "1.0.0", description: "Test", author: "Agente", license: "MIT" },
  platforms: {
    linux: { enabled: true, outputFormat: "tar.gz", architecture: "x86_64" },
    android: { enabled: true, minSdk: 26, targetSdk: 34, outputFormat: "apk" },
  },
  features: { offline: true, camera: false, gps: false, realtime: false, ai: false, graphics: "basic" },
  optimization: { minify: true, stripSymbols: true, compression: "medium" },
};

describe("compilation generator", () => {
  it("generates files for enabled platforms", () => {
    const project = generateProject(baseConfig);
    expect(project.files.some((f) => f.path.startsWith("linux/"))).toBe(true);
    expect(project.files.some((f) => f.path.startsWith("android/"))).toBe(true);
  });

  it("includes shared config", () => {
    const project = generateProject(baseConfig);
    expect(project.files.some((f) => f.path === "build-config.json")).toBe(true);
    expect(project.files.some((f) => f.path === "README.md")).toBe(true);
  });

  it("includes linux main.py", () => {
    const project = generateProject(baseConfig);
    const mainPy = project.files.find((f) => f.path === "linux/main.py");
    expect(mainPy).toBeDefined();
    expect(mainPy?.content).toContain("TestApp");
  });
});
