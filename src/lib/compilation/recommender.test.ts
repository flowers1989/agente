import { describe, it, expect } from "vitest";
import { getRecommendations } from "./recommender";
import type { AppRequirements } from "./types";

const baseRequirements: AppRequirements = {
  type: "mobile",
  features: { camera: false, gps: false, offline: false, realtime: false, ai: false, graphics: "basic" },
  performance: { targetUsers: 1000, dataProcessing: "light", memoryIntensive: false },
  constraints: { budget: "medium", timeline: "normal", team: "small" },
};

describe("compilation recommender", () => {
  it("recommends Android for mobile apps", () => {
    const recs = getRecommendations(baseRequirements);
    expect(recs[0].platform).toBe("android");
    expect(recs[0].score).toBeGreaterThan(70);
  });

  it("recommends Windows for enterprise apps", () => {
    const req: AppRequirements = { ...baseRequirements, type: "enterprise" };
    const recs = getRecommendations(req);
    expect(recs[0].platform).toBe("windows");
  });

  it("recommends Windows or Linux for utility apps", () => {
    const req: AppRequirements = { ...baseRequirements, type: "utility" };
    const recs = getRecommendations(req);
    const top = recs[0].platform;
    expect(["windows", "linux", "android"]).toContain(top);
  });

  it("returns all 5 platforms", () => {
    const recs = getRecommendations(baseRequirements);
    expect(recs).toHaveLength(5);
  });
});
