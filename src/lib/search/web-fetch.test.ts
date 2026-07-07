import { describe, it, expect } from "vitest";
import { htmlToText, extractLinks } from "./web-fetch";

describe("web-fetch utilities", () => {
  it("htmlToText elimina scripts, styles y tags", () => {
    const html = `
      <html><head><script>var x = 1;</script><style>body{}</style></head>
      <body>
        <h1>Título</h1>
        <p>Párrafo <strong>con</strong> énfasis</p>
        <span>Inline &nbsp; text</span>
      </body></html>`;
    const text = htmlToText(html);
    expect(text).not.toContain("var x = 1");
    expect(text).not.toContain("body{}");
    expect(text).not.toContain("<");
    expect(text).toContain("Título");
    expect(text).toContain("Párrafo con énfasis");
    expect(text).toContain("Inline text");
  });

  it("extractLinks resuelve URLs relativas y absolutas", () => {
    const html = `
      <a href="/rel">Relativo</a>
      <a href="https://other.com/x">Otro</a>
      <a href="#anchor">Salto</a>
      <a href="javascript:void(0)">JS</a>
      <a href="mailto:a@b.c">Mail</a>
      <a href="https://ok.com/page">Texto del link</a>`;
    const links = extractLinks(html, "https://example.com/docs/page");
    expect(links.length).toBe(3);
    expect(links.find((l) => l.text === "Relativo")?.href).toBe("https://example.com/rel");
    expect(links.find((l) => l.text === "Otro")?.href).toBe("https://other.com/x");
    expect(links.find((l) => l.text === "Texto del link")?.href).toBe("https://ok.com/page");
  });

  it("no extrae enlaces mailto/javascript/anchor", () => {
    const html = `
      <a href="#top">arriba</a>
      <a href="javascript:alert(1)">js</a>
      <a href="mailto:test@test.com">correo</a>`;
    const links = extractLinks(html, "https://test.com");
    expect(links).toEqual([]);
  });
});