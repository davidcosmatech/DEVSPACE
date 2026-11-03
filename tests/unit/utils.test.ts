import { describe, expect, it } from "vitest";

import {
  formatBytes,
  initials,
  normalizeUrl,
  relativeTime,
  safeExternalUrl,
  truncate,
} from "@/lib/utils";

describe("utils", () => {
  it("formats bytes with sensible units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("builds initials from a display name", () => {
    expect(initials("David Cosma")).toBe("DC");
    expect(initials("  ada  lovelace ")).toBe("AL");
  });

  it("normalizes URLs and rejects unsafe protocols", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeUrl("http://localhost:3000")).toBe("http://localhost:3000/");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });

  it("only exposes safe external URLs", () => {
    expect(safeExternalUrl("https://github.com")).toBe("https://github.com/");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it("formats compact relative times", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 20_000))).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000))).toBe("5m ago");
    expect(relativeTime(new Date(now - 2 * 3_600_000))).toBe("2h ago");
    expect(relativeTime(new Date(now - 3 * 86_400_000))).toBe("3d ago");
  });

  it("truncates long copy", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a much longer string", 8)).toBe("a much…");
  });
});
