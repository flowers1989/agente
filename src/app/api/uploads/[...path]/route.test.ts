import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import * as fs from "fs";
import * as path from "path";

vi.mock("fs");
vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");

  function fakeResolve(...args: string[]): string {
    const joined = args.join("/");
    const segments = joined.split("/").filter(Boolean);
    const resolved: string[] = [];
    for (const segment of segments) {
      if (segment === "..") {
        resolved.pop();
      } else if (segment !== ".") {
        resolved.push(segment);
      }
    }
    return "/" + resolved.join("/");
  }

  return {
    ...actual,
    resolve: vi.fn(fakeResolve),
    join: vi.fn((...args: string[]) => args.join("/")),
    extname: vi.fn((p: string) => actual.extname(p)),
    basename: vi.fn((p: string) => actual.basename(p)),
  };
});

describe("GET /api/uploads/[...path]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as fs.Stats);
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from("Hola"));
  });

  it("rechaza path traversal", async () => {
    process.env.UPLOAD_DIR = "/app/upload";

    const request = new Request("http://localhost/api/uploads/../../../../etc/passwd");
    const response = await GET(request, { params: Promise.resolve({ path: ["..", "..", "..", "..", "etc", "passwd"] }) });

    expect(response.status).toBe(403);
  });

  it("sirve archivos dentro del directorio de uploads", async () => {
    process.env.UPLOAD_DIR = "/app/upload";

    const request = new Request("http://localhost/api/uploads/readme.txt");
    const response = await GET(request, { params: Promise.resolve({ path: ["readme.txt"] }) });

    expect(response.status).toBe(200);
    expect(fs.readFileSync).toHaveBeenCalledWith("/app/upload/readme.txt");
  });
});
