import { describe, expect, it } from "vitest";
import { mergeDefinedUrlsIntoEvolved } from "./tab-group-mode.service";

describe("mergeDefinedUrlsIntoEvolved", () => {
  it("keeps defined URLs first when observed omits closed tab", () => {
    const defined = ["https://github.com/org/a"];
    const observed = ["https://youtube.com/"];
    const out = mergeDefinedUrlsIntoEvolved(defined, observed);
    expect(out[0]).toBe("https://github.com/org/a");
    expect(out).toContain("https://youtube.com/");
    expect(out.length).toBe(2);
  });

  it("dedupes defined and observed", () => {
    const u = "https://github.com/same";
    const out = mergeDefinedUrlsIntoEvolved([u], [u]);
    expect(out).toEqual([u]);
  });

  it("orders defined before extra observed", () => {
    const out = mergeDefinedUrlsIntoEvolved(
      ["https://a.example/"],
      ["https://b.example/", "https://c.example/"],
    );
    expect(out[0]).toBe("https://a.example/");
    expect(out.slice(1).sort()).toEqual([
      "https://b.example/",
      "https://c.example/",
    ]);
  });
});
