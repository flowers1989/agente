import { describe, it, expect } from "vitest";
import { parseDuckDuckGoResults, stripHtml } from "@/lib/search/search-web";

describe("parseDuckDuckGoResults", () => {
  it("extracts results from DuckDuckGo HTML", () => {
    const html = `
      <div class="result results_links results_links_deep web-result">
        <div class="links_main links_deep result__body">
          <a class="result__a" href="https://example.com/page1">Title One</a>
          <a class="result__snippet">This is the first snippet.</a>
        </div>
      </div>
      <div class="result results_links results_links_deep web-result">
        <div class="links_main links_deep result__body">
          <a class="result__a" href="https://example.com/page2">Title Two</a>
          <a class="result__snippet">This is the second snippet.</a>
        </div>
      </div>
    `;

    const results = parseDuckDuckGoResults(html, 5);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: "Title One",
      url: "https://example.com/page1",
      snippet: "This is the first snippet.",
    });
    expect(results[1]).toEqual({
      title: "Title Two",
      url: "https://example.com/page2",
      snippet: "This is the second snippet.",
    });
  });

  it("respects the limit", () => {
    const html = Array.from({ length: 10 }, (_, i) => `
      <div class="result">
        <div class="result__body">
          <a class="result__a" href="https://example.com/${i}">Title ${i}</a>
        </div>
      </div>
    `).join("");

    const results = parseDuckDuckGoResults(html, 3);
    expect(results).toHaveLength(3);
  });
});

describe("stripHtml", () => {
  it("removes html tags and decodes entities", () => {
    expect(stripHtml("<b>Hello</b> &amp; world")).toBe("Hello & world");
  });
});
